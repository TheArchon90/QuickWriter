import { Annotation } from "@codemirror/state";
import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import { shouldCapitalizeAfter } from "../../../lib/textProcessing";

// Annotation marking our own dispatches so we can skip them on re-entry.
const isAutoCapFix = Annotation.define<boolean>();

/**
 * Auto-capitalize the first letter of every sentence.
 *
 * Two complementary checks run on every document change:
 *
 * 1. **Type-time**: when the user types a lowercase letter that falls
 *    immediately after a sentence boundary, capitalize it in place.
 *
 * 2. **Post-change**: after ANY change (including Vim deletions, paste,
 *    undo, etc.), check whether the character now at the cursor is a
 *    lowercase letter at a sentence start. This handles deletions that
 *    promote a mid-sentence word to sentence-initial position.
 *
 * Both paths skip our own capitalize dispatches (annotated with
 * `isAutoCapFix`) to avoid infinite loops. We do NOT filter by user-event
 * type because Vim-mode operations may not carry standard event labels.
 */
export const autoCapitalize = ViewPlugin.fromClass(
  class {
    update(update: ViewUpdate) {
      if (!update.docChanged) return;

      // Skip our own capitalize dispatches.
      if (update.transactions.some((tr) => tr.annotation(isAutoCapFix))) return;

      const { state } = update;
      const cursor = state.selection.main.head;

      // ── Case 1: capitalize a just-typed lowercase letter ──
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

      // ── Case 2: after any change, check the char at cursor ──
      if (cursor >= state.doc.length) return;
      const charAtCursor = state.doc.sliceString(cursor, cursor + 1);
      if (!/[a-z]/.test(charAtCursor)) return;

      const line = state.doc.lineAt(cursor);
      const textBefore = state.doc.sliceString(
        Math.max(0, line.from - 200),
        cursor,
      );
      if (shouldCapitalizeAfter(textBefore)) {
        update.view.dispatch({
          changes: {
            from: cursor,
            to: cursor + 1,
            insert: charAtCursor.toUpperCase(),
          },
          annotations: isAutoCapFix.of(true),
        });
      }
    }
  },
);
