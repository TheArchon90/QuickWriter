import { Annotation } from "@codemirror/state";
import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import { shouldCapitalizeAfter } from "../../../lib/textProcessing";
import { CHECKPOINT_RE } from "./checkpoints";

// Annotation marking our own dispatches so we can skip them on re-entry.
const isAutoCapFix = Annotation.define<boolean>();

/**
 * Auto-capitalize the first letter of every sentence.
 *
 * Two complementary checks run on every document change:
 *
 * 1. **Type-time**: when the user types a lowercase letter that falls
 *    immediately after a sentence boundary, capitalize it in place.
 *    Runs synchronously within the update cycle (works reliably for
 *    standard keyboard input).
 *
 * 2. **Post-change**: after ANY change (including Vim deletions, paste,
 *    undo, etc.), scans ±10 characters around the cursor for any
 *    lowercase letter at a sentence start and capitalizes it. Deferred
 *    to the next tick via setTimeout — CM6 can silently drop dispatches
 *    from within a ViewPlugin.update() when another extension (like Vim)
 *    is mid-transaction. The 0ms defer lets Vim's update cycle finish
 *    before we dispatch our capitalize change.
 *
 * Both paths skip our own capitalize dispatches (annotated with
 * `isAutoCapFix`) to avoid infinite loops.
 */
export const autoCapitalize = ViewPlugin.fromClass(
  class {
    update(update: ViewUpdate) {
      if (!update.docChanged) return;

      // Skip our own capitalize dispatches.
      if (update.transactions.some((tr) => tr.annotation(isAutoCapFix))) return;

      const { state } = update;
      const cursor = state.selection.main.head;

      // Never touch checkpoint lines — their content is hidden by a widget
      // decoration and modifying it would break the regex match.
      const cursorLine = state.doc.lineAt(cursor);
      if (CHECKPOINT_RE.test(cursorLine.text.trim())) return;

      // ── Case 1: capitalize a just-typed lowercase letter (synchronous) ──
      const isTyping = update.transactions.some((tr) =>
        tr.isUserEvent("input.type"),
      );
      if (isTyping) {
        const typed = state.doc.sliceString(cursor - 1, cursor);
        if (/[a-z]/.test(typed)) {
          const lineStart = state.doc.lineAt(cursor).from;
          const textBefore = state.doc.sliceString(
            Math.max(0, lineStart - 200),
            cursor - 1,
          );
          if (shouldCapitalizeAfter(textBefore)) {
            update.view.dispatch({
              changes: {
                from: cursor - 1,
                to: cursor,
                insert: typed.toUpperCase(),
              },
              annotations: isAutoCapFix.of(true),
            });
            return;
          }
        }
      }

      // ── Case 2: deferred scan for uncapitalized sentence starts ──
      // Capture the view reference — setTimeout runs after update() returns,
      // so we read the CURRENT state at fire time (not the stale closure).
      const view = update.view;
      setTimeout(() => {
        // Guard: the view might have been destroyed between scheduling and
        // firing (e.g., component unmount during fast navigation).
        try {
          const currentState = view.state;
          const cur = currentState.selection.main.head;
          const searchFrom = Math.max(0, cur - 10);
          const searchTo = Math.min(currentState.doc.length, cur + 10);
          const nearby = currentState.doc.sliceString(searchFrom, searchTo);

          for (let i = 0; i < nearby.length; i++) {
            const ch = nearby[i];
            if (!/[a-z]/.test(ch)) continue;

            const pos = searchFrom + i;
            const line = currentState.doc.lineAt(pos);
            // Skip checkpoint lines.
            if (CHECKPOINT_RE.test(line.text.trim())) continue;
            const textBefore = currentState.doc.sliceString(
              Math.max(0, line.from - 200),
              pos,
            );
            if (shouldCapitalizeAfter(textBefore)) {
              view.dispatch({
                changes: { from: pos, to: pos + 1, insert: ch.toUpperCase() },
                annotations: isAutoCapFix.of(true),
              });
              return; // one fix per cycle
            }
          }
        } catch {
          // View destroyed — silently ignore
        }
      }, 0);
    }
  },
);
