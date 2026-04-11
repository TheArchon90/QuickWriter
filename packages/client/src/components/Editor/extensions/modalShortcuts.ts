import { EditorView } from "@codemirror/view";
import { enterInsertMode, exitInsertMode } from "../keymaps/vimMode";

interface ModalShortcutsCallbacks {
  onHighlightSentence: () => void;
  onHighlightSentenceBackward: () => void;
  onHighlightParagraphForward: () => void;
  onHighlightParagraphBackward: () => void;
}

/**
 * Match a keyboard event against a shortcut string like "Ctrl+I", "Ctrl+Shift+J",
 * or "Escape". Case-insensitive on the final character key.
 *
 * NOTE: treats Meta (cmd) as equivalent to Ctrl, matching how the rest of the
 * codebase's hotkey handling works.
 */
function matchesKey(event: KeyboardEvent, binding: string | undefined): boolean {
  if (!binding) return false;
  const parts = binding.split("+");
  const key = parts[parts.length - 1];
  const wantCtrl = parts.includes("Ctrl");
  const wantShift = parts.includes("Shift");
  const wantAlt = parts.includes("Alt");

  const haveCtrl = event.ctrlKey || event.metaKey;
  if (haveCtrl !== wantCtrl) return false;
  if (event.shiftKey !== wantShift) return false;
  if (event.altKey !== wantAlt) return false;

  if (key.length === 1) {
    return event.key.toLowerCase() === key.toLowerCase();
  }
  return event.key === key;
}

/**
 * DOM-level hotkey handler for the mode-transition shortcuts that
 * the Vim keymap system doesn't read:
 *
 *   - navigation.enter_insert_mode          (default Ctrl+I): normal → insert
 *   - navigation.highlight_sentence         (default Ctrl+J): any mode
 *   - insert.enter_navigation_mode          (default Escape):  insert → normal
 *   - insert.enter_navigation_mode_alt      (default Ctrl+N):  insert → normal
 *
 * When the user keeps the default "Escape" binding for enter_navigation_mode
 * we intentionally skip it here — the Vim extension handles Escape natively
 * and we don't want to double-fire.
 */
export function modalShortcuts(
  shortcuts: Record<string, Record<string, string>>,
  callbacks: ModalShortcutsCallbacks,
) {
  const nav = shortcuts.navigation || {};
  const insert = shortcuts.insert || {};

  return EditorView.domEventHandlers({
    keydown(event, view) {
      // Highlight shortcuts — work regardless of editor mode.
      if (matchesKey(event, nav.highlight_sentence)) {
        event.preventDefault();
        callbacks.onHighlightSentence();
        return true;
      }
      if (matchesKey(event, nav.highlight_sentence_backward)) {
        event.preventDefault();
        callbacks.onHighlightSentenceBackward();
        return true;
      }
      if (matchesKey(event, nav.highlight_paragraph)) {
        event.preventDefault();
        callbacks.onHighlightParagraphForward();
        return true;
      }
      if (matchesKey(event, nav.highlight_paragraph_backward)) {
        event.preventDefault();
        callbacks.onHighlightParagraphBackward();
        return true;
      }

      // The remaining actions only apply when Vim is the active keymap.
      // In Modern mode, (view as any).cm is undefined.
      const cm = (view as any).cm;
      if (!cm) return false;
      const inInsertMode = !!cm.state?.vim?.insertMode;

      // Normal → Insert
      if (!inInsertMode && matchesKey(event, nav.enter_insert_mode)) {
        event.preventDefault();
        enterInsertMode(view);
        return true;
      }

      // Insert → Normal (two possible bindings)
      if (inInsertMode) {
        const primary = insert.enter_navigation_mode;
        const alt = insert.enter_navigation_mode_alt;

        // Skip "Escape" — Vim's built-in insert-mode exit handles it
        // and we'd double-fire if we intercepted here.
        if (primary && primary !== "Escape" && matchesKey(event, primary)) {
          event.preventDefault();
          exitInsertMode(view);
          return true;
        }
        if (alt && matchesKey(event, alt)) {
          event.preventDefault();
          exitInsertMode(view);
          return true;
        }
      }

      return false;
    },
  });
}
