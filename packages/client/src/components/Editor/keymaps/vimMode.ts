import { vim, Vim } from "@replit/codemirror-vim";
import { type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

interface VimModeCallbacks {
  onModeChange: (mode: "insert" | "normal") => void;
  onHighlightSentence: () => void;
}

let actionsRegistered = false;

// Key alias used internally to trigger Vim's built-in insert mode.
// Mapped via noremap BEFORE we remap 'i', so it always points
// to the original enterInsertMode action.
const INSERT_MODE_KEY = "<C-q>";

function nextWordPos(text: string, from: number): number {
  let pos = from;
  const len = text.length;
  if (pos >= len) return pos;
  if (/\w/.test(text[pos])) {
    while (pos < len && /\w/.test(text[pos])) pos++;
  } else {
    pos++;
  }
  while (pos < len && !/\w/.test(text[pos])) pos++;
  return pos;
}

function prevWordPos(text: string, from: number): number {
  let pos = from;
  if (pos <= 0) return 0;
  while (pos > 0 && !/\w/.test(text[pos - 1])) pos--;
  while (pos > 0 && /\w/.test(text[pos - 1])) pos--;
  return pos;
}

function wordBounds(text: string, pos: number): [number, number] | null {
  if (pos >= text.length || !/\w/.test(text[pos])) {
    let start = pos;
    while (start > 0 && !/\w/.test(text[start - 1])) start--;
    if (start > 0) {
      let end = start;
      while (start > 0 && /\w/.test(text[start - 1])) start--;
      return [start, end];
    }
    return null;
  }
  let start = pos;
  let end = pos;
  while (start > 0 && /\w/.test(text[start - 1])) start--;
  while (end < text.length && /\w/.test(text[end])) end++;
  return [start, end];
}

/**
 * Enter insert mode by triggering our preserved alias key.
 */
function enterInsert(cm: any) {
  Vim.handleKey(cm, INSERT_MODE_KEY, "mapping");
}

function registerVimActions() {
  if (actionsRegistered) return;
  actionsRegistered = true;

  // CRITICAL: preserve original 'i' behavior before we remap it.
  // noremap means this mapping won't follow our later 'i' remap.
  Vim.noremap(INSERT_MODE_KEY, "i", "normal");

  Vim.defineAction("quickwriter-next-word", (cm: any) => {
    const view = cm.cm6 as EditorView;
    const text = view.state.doc.toString();
    const cursor = view.state.selection.main.head;
    view.dispatch({ selection: { anchor: nextWordPos(text, cursor) } });
  });

  Vim.defineAction("quickwriter-prev-word", (cm: any) => {
    const view = cm.cm6 as EditorView;
    const text = view.state.doc.toString();
    const cursor = view.state.selection.main.head;
    view.dispatch({ selection: { anchor: prevWordPos(text, cursor) } });
  });

  Vim.defineAction("quickwriter-delete-word", (cm: any) => {
    const view = cm.cm6 as EditorView;
    const text = view.state.doc.toString();
    const cursor = view.state.selection.main.head;
    const bounds = wordBounds(text, cursor);
    if (!bounds) return;
    let [start, end] = bounds;
    while (end < text.length && /\s/.test(text[end])) end++;
    view.dispatch({
      changes: { from: start, to: end },
      selection: { anchor: start },
    });
  });

  Vim.defineAction("quickwriter-change-word", (cm: any) => {
    const view = cm.cm6 as EditorView;
    const text = view.state.doc.toString();
    const cursor = view.state.selection.main.head;
    const bounds = wordBounds(text, cursor);
    if (!bounds) return;
    const [start, end] = bounds;
    view.dispatch({
      changes: { from: start, to: end },
      selection: { anchor: start },
    });
    enterInsert(cm);
  });

  Vim.defineAction("quickwriter-insert-before", (cm: any) => {
    const view = cm.cm6 as EditorView;
    const text = view.state.doc.toString();
    const cursor = view.state.selection.main.head;
    const bounds = wordBounds(text, cursor);
    if (bounds) {
      view.dispatch({ selection: { anchor: bounds[0] } });
    }
    enterInsert(cm);
  });

  Vim.defineAction("quickwriter-append-after", (cm: any) => {
    const view = cm.cm6 as EditorView;
    const text = view.state.doc.toString();
    const cursor = view.state.selection.main.head;
    const bounds = wordBounds(text, cursor);
    if (bounds) {
      view.dispatch({ selection: { anchor: bounds[1] } });
    }
    enterInsert(cm);
  });

  Vim.defineAction("quickwriter-open-below", (cm: any) => {
    const view = cm.cm6 as EditorView;
    const line = view.state.doc.lineAt(view.state.selection.main.head);
    view.dispatch({
      changes: { from: line.to, insert: "\n" },
      selection: { anchor: line.to + 1 },
    });
    enterInsert(cm);
  });

  Vim.defineAction("quickwriter-open-above", (cm: any) => {
    const view = cm.cm6 as EditorView;
    const line = view.state.doc.lineAt(view.state.selection.main.head);
    view.dispatch({
      changes: { from: line.from, insert: "\n" },
      selection: { anchor: line.from },
    });
    enterInsert(cm);
  });
}

export function createVimMode(
  shortcuts: Record<string, Record<string, string>>,
  callbacks: VimModeCallbacks
): Extension[] {
  registerVimActions();

  const nav = shortcuts.navigation || {};

  const mappings: [string, string, boolean][] = [
    [nav.move_next_word || "n", "quickwriter-next-word", false],
    [nav.move_prev_word || "p", "quickwriter-prev-word", false],
    [nav.delete_word || "d", "quickwriter-delete-word", false],
    [nav.change_word || "c", "quickwriter-change-word", true],
    [nav.insert_before_word || "i", "quickwriter-insert-before", true],
    [nav.append_after_word || "a", "quickwriter-append-after", true],
    [nav.open_line_below || "o", "quickwriter-open-below", true],
    [nav.open_line_above || "O", "quickwriter-open-above", true],
  ];

  for (const [key, action, isEdit] of mappings) {
    Vim.mapCommand(key, "action", action, {}, { context: "normal", isEdit });
  }

  return [
    vim(),
    EditorView.updateListener.of((update) => {
      const cmVim = (update.view as any).cm;
      if (cmVim) {
        const mode = cmVim.state?.vim?.insertMode ? "insert" : "normal";
        callbacks.onModeChange(mode);
      }
    }),
  ];
}
