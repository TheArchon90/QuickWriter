import { EditorView, keymap } from "@codemirror/view";
import { Prec, type Extension } from "@codemirror/state";
import type { Command } from "@codemirror/view";

export type RewriteShortcutAction = "expand" | "concise";

/**
 * Keyboard shortcuts for triggering rewrite actions (Mod-e / Mod-Shift-e).
 *
 * `handleRewrite` lives on the React side as a useCallback bound to state —
 * we can't capture it at extension construction time without it going stale.
 * Instead the caller passes a `getHandler` factory that reads from a stable
 * ref, so each keystroke gets the current callback.
 *
 * The extension is built ONCE, inside the initial EditorState.create, and the
 * ref-based accessor keeps it live for the lifetime of the editor.
 *
 * Commands only fire when there's a non-empty selection; otherwise they return
 * false and let the binding fall through to other handlers.
 */
export function rewriteShortcuts(
  getHandler: () => (action: RewriteShortcutAction) => Promise<void>,
): Extension {
  const makeCommand = (action: RewriteShortcutAction): Command => {
    return (view: EditorView): boolean => {
      const sel = view.state.selection.main;
      if (sel.empty) return false;

      // Fire-and-forget: we return synchronously so CodeMirror treats the key
      // as handled, while the rewrite proceeds on the microtask queue.
      void getHandler()(action);
      return true;
    };
  };

  return Prec.highest(
    keymap.of([
      { key: "Mod-e", run: makeCommand("expand"), preventDefault: true },
      { key: "Mod-Shift-e", run: makeCommand("concise"), preventDefault: true },
    ]),
  );
}
