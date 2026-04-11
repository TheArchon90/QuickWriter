import { StateEffect, StateField, type Extension } from "@codemirror/state";
import { EditorView, Decoration, type DecorationSet } from "@codemirror/view";

/**
 * Rewrite bloom extension.
 *
 * Paints an accent-colored, animated "landed" highlight over a range — used
 * by the Editor right after Claude replaces a selection with a rewrite. The
 * visual is driven by `.cm-rewrite-bloom` in index.css (a 900ms bg/shadow
 * animation with `forwards` fill), and the decoration self-clears after the
 * animation completes so it doesn't accumulate over multiple rewrites.
 *
 * Usage:
 *   1. Add `rewriteBloomExt` to your editor's extensions.
 *   2. After landing a rewrite, call `triggerRewriteBloom(view, from, to)`.
 */

const bloomMark = Decoration.mark({ class: "cm-rewrite-bloom" });

const showBloomEffect = StateEffect.define<{ from: number; to: number }>();
const clearBloomEffect = StateEffect.define<null>();

const bloomField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decos, tr) {
    // Map existing decorations through doc changes so the range follows
    // edits (e.g. if the user keeps typing while the bloom is fading out).
    decos = decos.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(showBloomEffect)) {
        const { from, to } = effect.value;
        if (from < to && to <= tr.state.doc.length) {
          decos = Decoration.set([bloomMark.range(from, to)]);
        }
      } else if (effect.is(clearBloomEffect)) {
        decos = Decoration.none;
      }
    }
    return decos;
  },
  provide: (field) => EditorView.decorations.from(field),
});

export const rewriteBloomExt: Extension = bloomField;

// Module-level timeout tracker. A second rewrite that arrives before the
// first bloom finishes cancels the stale clear so the new bloom gets its
// full duration.
let pendingClear: ReturnType<typeof setTimeout> | null = null;

/**
 * Trigger the bloom animation over the given range. Auto-clears after
 * `duration` ms so the decoration doesn't sit in the state forever.
 */
export function triggerRewriteBloom(
  view: EditorView,
  from: number,
  to: number,
  duration = 900,
): void {
  if (from >= to) return;
  view.dispatch({ effects: showBloomEffect.of({ from, to }) });
  if (pendingClear) clearTimeout(pendingClear);
  pendingClear = setTimeout(() => {
    view.dispatch({ effects: clearBloomEffect.of(null) });
    pendingClear = null;
  }, duration);
}
