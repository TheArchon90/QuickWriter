import { ViewPlugin, ViewUpdate, Decoration, type DecorationSet } from "@codemirror/view";

const shimmerMark = Decoration.mark({ class: "cm-correction-shimmer" });

class MicroFeedbackPlugin {
  decorations: DecorationSet;
  pendingClear: ReturnType<typeof setTimeout> | null = null;
  constructor() { this.decorations = Decoration.none; }
  shimmer(view: { state: { doc: { length: number } } }, from: number, to: number) {
    if (from >= to || to > view.state.doc.length) return;
    this.decorations = Decoration.set([shimmerMark.range(from, to)]);
    if (this.pendingClear) clearTimeout(this.pendingClear);
    this.pendingClear = setTimeout(() => {
      this.decorations = Decoration.none;
      this.pendingClear = null;
    }, 400);
  }
  update(_update: ViewUpdate) {}
}

export const microFeedback = ViewPlugin.fromClass(
  MicroFeedbackPlugin,
  { decorations: (v) => v.decorations }
);
