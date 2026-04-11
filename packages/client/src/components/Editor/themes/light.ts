import { EditorView } from "@codemirror/view";

export const lightTheme = EditorView.theme({
  "&": { backgroundColor: "#ffffff", color: "#1f2328" },
  ".cm-content": { caretColor: "#0969da" },
  ".cm-gutters": { backgroundColor: "#ffffff", color: "#8c959f", border: "none" },
  ".cm-activeLineGutter": { backgroundColor: "#f6f8fa" },
  ".cm-activeLine": { backgroundColor: "rgba(234, 238, 242, 0.5)" },
  ".cm-selectionBackground": { backgroundColor: "rgba(9, 105, 218, 0.1) !important" },
  "&.cm-focused .cm-selectionBackground": { backgroundColor: "rgba(9, 105, 218, 0.15) !important" },
  ".cm-cursor": { borderLeftColor: "#0969da" },
}, { dark: false });
