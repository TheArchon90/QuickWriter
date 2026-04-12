import {
  EditorView,
  Decoration,
  WidgetType,
  keymap,
  ViewPlugin,
  type ViewUpdate,
  type DecorationSet,
} from "@codemirror/view";
import { Prec, type Extension, type Range } from "@codemirror/state";

/**
 * Marker checkpoints — bright green visual bookmarks that sit between
 * paragraphs. Stored as `<!-- checkpoint -->` lines in the document so
 * they persist across saves. Rendered as widget decorations so the user
 * sees a green bar, not raw text.
 *
 * Keybindings:
 * - Mod-m: toggle — insert a checkpoint below the current line, or
 *   remove it if the current line IS a checkpoint.
 * - Mod-Shift-m: jump to the next checkpoint (wraps around).
 */

const CHECKPOINT_TEXT = "<!-- checkpoint -->";
export const CHECKPOINT_RE = /^<!-- checkpoint -->$/;

// ── Widget ──────────────────────────────────────────────────────────

class CheckpointWidget extends WidgetType {
  toDOM() {
    const wrap = document.createElement("div");
    wrap.className = "cm-checkpoint";
    wrap.setAttribute("aria-label", "Checkpoint marker");

    const leftLine = document.createElement("span");
    leftLine.className = "cm-checkpoint-line";

    const label = document.createElement("span");
    label.className = "cm-checkpoint-label";
    label.textContent = "\u2726 CHECKPOINT";

    const rightLine = document.createElement("span");
    rightLine.className = "cm-checkpoint-line";

    wrap.append(leftLine, label, rightLine);
    return wrap;
  }

  eq() {
    return true; // all checkpoint widgets are visually identical
  }
}

const widget = new CheckpointWidget();

// ── Decoration plugin ───────────────────────────────────────────────

const checkpointDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

function buildDecorations(view: EditorView): DecorationSet {
  const widgets: Range<Decoration>[] = [];
  const doc = view.state.doc;

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    if (CHECKPOINT_RE.test(line.text.trim())) {
      widgets.push(
        Decoration.replace({ widget }).range(line.from, line.to),
      );
    }
  }

  return Decoration.set(widgets, true);
}

// ── Commands ────────────────────────────────────────────────────────

/**
 * Toggle a checkpoint on the current line.
 * - If the current line is a checkpoint → delete the entire line.
 * - Otherwise → insert a checkpoint on a new line below.
 */
function toggleCheckpoint(view: EditorView): boolean {
  const cursor = view.state.selection.main.head;
  const doc = view.state.doc;
  const line = doc.lineAt(cursor);

  if (CHECKPOINT_RE.test(line.text.trim())) {
    // Delete the checkpoint line + one adjacent newline.
    let from = line.from;
    let to = line.to;
    if (to < doc.length) {
      to++; // consume trailing newline
    } else if (from > 0) {
      from--; // consume leading newline (checkpoint is last line)
    }
    view.dispatch({
      changes: { from, to },
    });
    return true;
  }

  // Insert below the current line.
  const insertPos = line.to;
  const insertText = "\n" + CHECKPOINT_TEXT;
  view.dispatch({
    changes: { from: insertPos, insert: insertText },
    selection: { anchor: insertPos + insertText.length },
  });
  return true;
}

/**
 * Jump to the next checkpoint in the document (wraps around).
 * Scrolls the viewport to center the checkpoint.
 */
function jumpToNextCheckpoint(view: EditorView): boolean {
  const doc = view.state.doc;
  const currentLine = doc.lineAt(view.state.selection.main.head).number;

  // Search forward from the line after the cursor.
  for (let i = currentLine + 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    if (CHECKPOINT_RE.test(line.text.trim())) {
      view.dispatch({
        selection: { anchor: line.from },
        effects: EditorView.scrollIntoView(line.from, { y: "center" }),
      });
      return true;
    }
  }

  // Wrap: search from the start up to the current line.
  for (let i = 1; i <= currentLine; i++) {
    const line = doc.line(i);
    if (CHECKPOINT_RE.test(line.text.trim())) {
      view.dispatch({
        selection: { anchor: line.from },
        effects: EditorView.scrollIntoView(line.from, { y: "center" }),
      });
      return true;
    }
  }

  return false; // no checkpoints in the document
}

// ── Keymap ───────────────────────────────────────────────────────────

const checkpointKeymap = Prec.highest(
  keymap.of([
    { key: "Mod-m", run: toggleCheckpoint, preventDefault: true },
    { key: "Mod-Shift-m", run: jumpToNextCheckpoint, preventDefault: true },
  ]),
);

// ── Export ───────────────────────────────────────────────────────────

export const checkpointsExt: Extension = [checkpointDecorations, checkpointKeymap];
