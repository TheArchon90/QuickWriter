import { ViewPlugin, ViewUpdate, Decoration, type DecorationSet } from "@codemirror/view";

const highlightMark = Decoration.mark({
  class: "cm-word-highlight",
  attributes: {
    style: "border-bottom: 2px solid var(--color-accent, #58a6ff); background: rgba(88,166,255,0.08);",
  },
});

export const wordHighlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor() { this.decorations = Decoration.none; }
    update(update: ViewUpdate) {
      if (!update.selectionSet && !update.docChanged) return;
      const { state } = update;
      const cursor = state.selection.main.head;
      const line = state.doc.lineAt(cursor);
      const lineText = state.doc.sliceString(line.from, line.to);
      const relPos = cursor - line.from;
      let wordStart = relPos;
      let wordEnd = relPos;
      while (wordStart > 0 && /\w/.test(lineText[wordStart - 1])) wordStart--;
      while (wordEnd < lineText.length && /\w/.test(lineText[wordEnd])) wordEnd++;
      if (wordStart === wordEnd) { this.decorations = Decoration.none; return; }
      this.decorations = Decoration.set([
        highlightMark.range(line.from + wordStart, line.from + wordEnd),
      ]);
    }
  },
  { decorations: (v) => v.decorations }
);
