import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import { shouldCapitalizeAfter } from "../../../lib/textProcessing";

export const autoCapitalize = ViewPlugin.fromClass(
  class {
    update(update: ViewUpdate) {
      if (!update.docChanged) return;
      const isUserInput = update.transactions.some((tr) => tr.isUserEvent("input.type"));
      if (!isUserInput) return;
      const { state } = update;
      const cursor = state.selection.main.head;
      const typed = state.doc.sliceString(cursor - 1, cursor);
      if (!/[a-z]/.test(typed)) return;
      const lineStart = state.doc.lineAt(cursor).from;
      const textBefore = state.doc.sliceString(Math.max(0, lineStart - 200), cursor - 1);
      if (shouldCapitalizeAfter(textBefore)) {
        update.view.dispatch({
          changes: { from: cursor - 1, to: cursor, insert: typed.toUpperCase() },
        });
      }
    }
  }
);
