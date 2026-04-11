import { EditorView } from "@codemirror/view";

export const darkTheme = EditorView.theme({
  "&": { backgroundColor: "#0d1117", color: "#c9d1d9" },
  ".cm-content": { caretColor: "#58a6ff" },
  ".cm-gutters": { backgroundColor: "#0d1117", color: "#484f58", border: "none" },
  ".cm-activeLineGutter": { backgroundColor: "#161b22" },
  ".cm-activeLine": { backgroundColor: "rgba(22, 27, 34, 0.5)" },
  ".cm-selectionBackground": { backgroundColor: "rgba(88, 166, 255, 0.15) !important" },
  "&.cm-focused .cm-selectionBackground": { backgroundColor: "rgba(88, 166, 255, 0.2) !important" },
  ".cm-cursor": { borderLeftColor: "#58a6ff" },
}, { dark: true });
