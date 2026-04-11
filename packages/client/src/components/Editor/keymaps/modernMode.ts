import { type Extension } from "@codemirror/state";
import { keymap, EditorView } from "@codemirror/view";
import { deleteGroupForward } from "@codemirror/commands";
import { parseKeybind } from "../../../lib/keybindParser";

interface ModernModeCallbacks {
  onHighlightSentence: () => void;
}

export function createModernMode(
  shortcuts: Record<string, Record<string, string>>,
  callbacks: ModernModeCallbacks
): Extension[] {
  const bindings: { key: string; run: (view: EditorView) => boolean }[] = [];
  const nav = shortcuts.navigation || {};

  if (nav.delete_word) {
    bindings.push({ key: parseKeybind(nav.delete_word), run: (view) => deleteGroupForward(view) });
  }
  if (nav.highlight_sentence) {
    bindings.push({ key: parseKeybind(nav.highlight_sentence), run: () => { callbacks.onHighlightSentence(); return true; } });
  }
  if (nav.open_line_below) {
    bindings.push({
      key: parseKeybind(nav.open_line_below),
      run: (view) => {
        const cursor = view.state.selection.main.head;
        const line = view.state.doc.lineAt(cursor);
        view.dispatch({ changes: { from: line.to, insert: "\n" }, selection: { anchor: line.to + 1 } });
        return true;
      },
    });
  }
  if (nav.open_line_above) {
    bindings.push({
      key: parseKeybind(nav.open_line_above),
      run: (view) => {
        const cursor = view.state.selection.main.head;
        const line = view.state.doc.lineAt(cursor);
        view.dispatch({ changes: { from: line.from, insert: "\n" }, selection: { anchor: line.from } });
        return true;
      },
    });
  }

  return [keymap.of(bindings)];
}
