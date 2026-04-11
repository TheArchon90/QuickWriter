import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import { expandContraction } from "../../../lib/textProcessing";

export const autoPunctuate = ViewPlugin.fromClass(
  class {
    update(update: ViewUpdate) {
      if (!update.docChanged) return;
      const isUserInput = update.transactions.some((tr) => tr.isUserEvent("input.type"));
      if (!isUserInput) return;
      const { state } = update;
      const cursor = state.selection.main.head;
      const typed = state.doc.sliceString(cursor - 1, cursor);
      if (!/[\s.,;:!?]/.test(typed)) return;
      const line = state.doc.lineAt(cursor);
      const textBefore = state.doc.sliceString(line.from, cursor - 1);
      const wordMatch = textBefore.match(/([a-zA-Z]+)$/);
      if (!wordMatch) return;
      const word = wordMatch[1];
      const replacement = expandContraction(word);
      if (!replacement) return;
      const wordStart = cursor - 1 - word.length;
      update.view.dispatch({
        changes: { from: wordStart, to: cursor - 1, insert: replacement },
      });
    }
  }
);
