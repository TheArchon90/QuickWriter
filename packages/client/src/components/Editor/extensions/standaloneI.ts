import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import { isStandaloneI } from "../../../lib/textProcessing";

export const standaloneIExt = ViewPlugin.fromClass(
  class {
    update(update: ViewUpdate) {
      if (!update.docChanged) return;
      const isUserInput = update.transactions.some((tr) => tr.isUserEvent("input.type"));
      if (!isUserInput) return;
      const { state } = update;
      const cursor = state.selection.main.head;
      const typed = state.doc.sliceString(cursor - 1, cursor);
      if (typed !== " ") return;
      const iPos = cursor - 2;
      if (iPos < 0) return;
      const line = state.doc.lineAt(cursor);
      const lineText = state.doc.sliceString(line.from, cursor);
      const relPos = iPos - line.from;
      if (isStandaloneI(lineText, relPos)) {
        update.view.dispatch({
          changes: { from: iPos, to: iPos + 1, insert: "I" },
        });
      }
    }
  }
);
