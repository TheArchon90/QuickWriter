import { EditorView } from "@codemirror/view";
import { exitInsertMode } from "../keymaps/vimMode";

const DOUBLE_TAP_MS = 300;

/**
 * Double-tap spacebar to exit Vim insert mode.
 *
 * In Vim insert mode, two quick taps of the spacebar (within DOUBLE_TAP_MS)
 * exit to normal/navigation mode and remove the space that the first tap
 * inserted. Hands-on-keyboard alternative to reaching for Escape.
 *
 * Inert outside Vim insert mode — Modern mode users and Normal-mode Vim users
 * get unmodified space behavior.
 */
export function doubleSpaceEscape() {
  let lastSpaceTime = 0;
  let lastSpacePos = -1;

  return EditorView.domEventHandlers({
    keydown(event, view) {
      // Bare space only — any modifier disqualifies.
      if (event.key !== " ") return false;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return false;

      // Only intercept in Vim insert mode. Modern mode has no insert concept;
      // Vim normal mode treats space as a motion we don't want to override.
      const cm = (view as any).cm;
      if (!cm || !cm.state?.vim?.insertMode) return false;

      const now = Date.now();
      const cursor = view.state.selection.main.head;

      // Is this the second tap of a valid double?
      // 1. within time window
      // 2. cursor sits exactly one past where the first space landed
      //    (user didn't move the cursor or have an extension rewrite text)
      // 3. the char immediately before the cursor is actually a space
      const isDoubleTap =
        now - lastSpaceTime < DOUBLE_TAP_MS &&
        lastSpacePos === cursor - 1 &&
        view.state.doc.sliceString(cursor - 1, cursor) === " ";

      if (isDoubleTap) {
        event.preventDefault();
        // Remove the first space (already in the doc from tap #1).
        view.dispatch({
          changes: { from: cursor - 1, to: cursor },
          selection: { anchor: cursor - 1 },
        });
        // Exit to normal mode.
        exitInsertMode(view);
        // Reset so a third tap doesn't chain.
        lastSpaceTime = 0;
        lastSpacePos = -1;
        return true;
      }

      // First tap: record when and where, then let it pass through. The
      // default insert path will put the space at `cursor`, which is what
      // we'll check against on tap #2.
      lastSpaceTime = now;
      lastSpacePos = cursor;
      return false;
    },
  });
}
