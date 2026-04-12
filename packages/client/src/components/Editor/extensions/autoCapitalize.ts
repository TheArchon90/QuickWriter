import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import { shouldCapitalizeAfter } from "../../../lib/textProcessing";

/**
 * Auto-capitalize the first letter of every sentence.
 *
 * Two complementary checks run on every user-initiated change:
 *
 * 1. **Type-time**: when the user types a lowercase letter that falls
 *    immediately after a sentence boundary (sentence-ending punctuation
 *    + whitespace, newline, or start of document), capitalize it in
 *    place. This is the "as-you-type" path and catches the vast majority
 *    of cases.
 *
 * 2. **Post-change**: after any user input (delete, paste, etc.), check
 *    whether the character now sitting at the cursor is a lowercase
 *    letter at a sentence start. This handles restructuring — deleting
 *    text that puts a previously-mid-sentence word at sentence start,
 *    pasting, and similar rearrangements.
 *
 * Both paths skip programmatic dispatches (the capitalize transaction
 * itself has no user-event annotation) to avoid infinite loops.
 */
export const autoCapitalize = ViewPlugin.fromClass(
  class {
    update(update: ViewUpdate) {
      if (!update.docChanged) return;

      // Only respond to user-initiated changes — typing, deleting, pasting.
      // Our own capitalize dispatch has no user-event annotation, so it
      // won't retrigger this check.
      const isUserChange = update.transactions.some(
        (tr) =>
          tr.isUserEvent("input") ||
          tr.isUserEvent("delete"),
      );
      if (!isUserChange) return;

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
            });
            return; // done — skip Case 2 on this update
          }
        }
      }

      // ── Case 2: after delete/paste/restructure, check the char at cursor ──
      // If a deletion or paste left a lowercase letter at a sentence start,
      // capitalize it. This catches the "word became first in sentence" case.
      if (cursor >= state.doc.length) return; // cursor at doc end, nothing to fix
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
        });
      }
    }
  },
);
