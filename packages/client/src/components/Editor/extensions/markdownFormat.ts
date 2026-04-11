import { EditorView, keymap } from "@codemirror/view";
import { Prec, EditorSelection } from "@codemirror/state";
import type { Command } from "@codemirror/view";

/**
 * Markdown formatting shortcuts: bold / italic / H1-H3.
 *
 * All commands are pure document transforms — they dispatch a change through
 * CodeMirror so undo/redo and dirty tracking behave normally. Wired at
 * Prec.highest so the vim keymap can't swallow them before we see them.
 */

/**
 * Toggle wrapping a range with `marker` on both sides.
 *
 * - Empty selection → insert `marker+marker` and place the cursor between them.
 * - Selection already wrapped (chars immediately before/after match `marker`)
 *   → extend the range to include the markers and replace with just the inner.
 * - Otherwise → wrap the selection.
 */
function toggleWrap(marker: string): Command {
  return (view: EditorView): boolean => {
    const { state } = view;
    const len = marker.length;

    view.dispatch(
      state.changeByRange((range) => {
        const { from, to } = range;

        // Empty selection: insert `marker+marker` and place cursor between.
        if (from === to) {
          const insert = marker + marker;
          return {
            changes: { from, to, insert },
            range: EditorSelection.cursor(from + len),
          };
        }

        // Check if selection is already wrapped by inspecting the chars
        // immediately outside `from`/`to`.
        const before = state.doc.sliceString(Math.max(0, from - len), from);
        const after = state.doc.sliceString(to, Math.min(state.doc.length, to + len));

        if (before === marker && after === marker) {
          // Unwrap: delete the outer markers, leave the inner text in place.
          return {
            changes: [
              { from: from - len, to: from, insert: "" },
              { from: to, to: to + len, insert: "" },
            ],
            // The selection shifts left by `len` because we deleted the
            // leading marker; the trailing marker delete doesn't affect
            // positions before `to`.
            range: EditorSelection.range(from - len, to - len),
          };
        }

        // Wrap: insert marker before and after, keep the inner selection.
        return {
          changes: [
            { from, to: from, insert: marker },
            { from: to, to, insert: marker },
          ],
          range: EditorSelection.range(from + len, to + len),
        };
      }),
    );

    return true;
  };
}

const toggleBold: Command = toggleWrap("**");
const toggleItalic: Command = toggleWrap("_");

/**
 * Set the current line's heading level to `level`.
 *
 * - Already at this level (`# ` for H1) → strip the prefix (toggle off).
 * - A different heading level (`## ` or `### `) → upgrade/downgrade to target.
 * - Not a heading → prepend `# ` / `## ` / `### `.
 *
 * Cursor tracking: if the cursor was inside the line, we keep it at the same
 * relative offset within the line's text content (past any heading prefix).
 */
function setHeading(level: 1 | 2 | 3): Command {
  const target = "#".repeat(level) + " ";
  const targetLen = target.length;

  return (view: EditorView): boolean => {
    const { state } = view;

    view.dispatch(
      state.changeByRange((range) => {
        const line = state.doc.lineAt(range.head);
        const lineText = line.text;

        // Detect existing heading prefix (# , ## , or ### ).
        const headingMatch = /^(#{1,3}) /.exec(lineText);
        const existingPrefixLen = headingMatch ? headingMatch[0].length : 0;

        // If already at target level, strip it (toggle off).
        if (headingMatch && headingMatch[1].length === level) {
          const newFrom = Math.max(line.from, range.from - targetLen);
          const newTo = Math.max(line.from, range.to - targetLen);
          return {
            changes: { from: line.from, to: line.from + targetLen, insert: "" },
            range: EditorSelection.range(newFrom, newTo),
          };
        }

        // Replace existing prefix (if any) with target; else prepend target.
        const delta = targetLen - existingPrefixLen;
        const newFrom = Math.max(line.from, range.from + delta);
        const newTo = Math.max(line.from, range.to + delta);

        return {
          changes: {
            from: line.from,
            to: line.from + existingPrefixLen,
            insert: target,
          },
          range: EditorSelection.range(newFrom, newTo),
        };
      }),
    );

    return true;
  };
}

const toggleH1: Command = setHeading(1);
const toggleH2: Command = setHeading(2);
const toggleH3: Command = setHeading(3);

/**
 * Keymap extension wiring bold / italic / H1-H3 to Mod-b / Mod-i / Mod-1..3.
 *
 * Wrapped in Prec.highest so vim-mode and defaultKeymap don't swallow the
 * bindings before they reach us.
 */
export const markdownFormatKeymap = Prec.highest(
  keymap.of([
    { key: "Mod-b", run: toggleBold, preventDefault: true },
    { key: "Mod-i", run: toggleItalic, preventDefault: true },
    { key: "Mod-1", run: toggleH1, preventDefault: true },
    { key: "Mod-2", run: toggleH2, preventDefault: true },
    { key: "Mod-3", run: toggleH3, preventDefault: true },
  ]),
);
