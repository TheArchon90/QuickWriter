import { useEffect, useRef, useCallback, useState } from "react";
import { EditorState, Compartment, Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { useAppState, useAppDispatch } from "../../context/AppContext";
import { api } from "../../lib/api";
import { darkTheme } from "./themes/dark";
import { lightTheme } from "./themes/light";
import { autoCapitalize } from "./extensions/autoCapitalize";
import { autoPunctuate } from "./extensions/autoPunctuate";
import { punctuationCleanup } from "./extensions/punctuationCleanup";
import { standaloneIExt } from "./extensions/standaloneI";
import { wordHighlight } from "./extensions/wordHighlight";
import { createVimMode, enterInsertMode } from "./keymaps/vimMode";
import { createModernMode } from "./keymaps/modernMode";
import { doubleSpaceEscape } from "./extensions/doubleSpaceEscape";
import { modalShortcuts } from "./extensions/modalShortcuts";
import { rewriteBloomExt, triggerRewriteBloom } from "./extensions/rewriteBloom";
import { markdownFormatKeymap } from "./extensions/markdownFormat";
import { rewriteShortcuts } from "./extensions/rewriteShortcuts";
import { checkpointsExt } from "./extensions/checkpoints";
import SelectionPopup, { type RewriteAction } from "./SelectionPopup";
import InsertPopup, { type InsertMode } from "./InsertPopup";
import {
  sentenceRangeAtCursor,
  previousSentenceRange,
  paragraphForwardRange,
  paragraphBackwardRange,
} from "./textRanges";

interface SelectionInfo {
  from: number;
  to: number;
  coords: { top: number; left: number };
}

interface InsertInfo {
  pos: number;
  coords: { top: number; left: number };
}

export default function Editor() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Tracks the active selection for the floating SelectionPopup. `null` hides it.
  // Updated by the CodeMirror updateListener on every selection change.
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo | null>(null);

  // Tracks the cursor position for the floating InsertPopup. Non-null means the
  // cursor is sitting on an empty line (no selection, no content on the line),
  // which is the trigger for Claude-generated paragraph insertion.
  const [insertInfo, setInsertInfo] = useState<InsertInfo | null>(null);

  // Stable-ref bridge from the rewrite keyboard shortcut extension (constructed
  // once inside EditorState.create) to the React `handleRewrite` callback
  // (re-created on every selection change). The extension reads `.current`
  // on every keystroke, so it always sees the latest callback.
  const handleRewriteRef = useRef<(action: RewriteAction) => Promise<void>>(
    async () => {},
  );

  const themeComp = useRef(new Compartment());
  const modeComp = useRef(new Compartment());
  const autoCapComp = useRef(new Compartment());
  const autoPunctComp = useRef(new Compartment());
  const standaloneIComp = useRef(new Compartment());
  const modalShortcutsComp = useRef(new Compartment());

  const getThemeExt = useCallback(() => {
    return state.settings?.theme.theme === "light" ? lightTheme : darkTheme;
  }, [state.settings?.theme.theme]);

  const highlightSentence = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const cursor = view.state.selection.main.head;
    const { start, end } = sentenceRangeAtCursor(view.state.doc.toString(), cursor);
    view.dispatch({ selection: { anchor: start, head: end } });
  }, []);

  const highlightSentenceBackward = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const cursor = view.state.selection.main.head;
    const range = previousSentenceRange(view.state.doc.toString(), cursor);
    if (!range) return;
    // Cursor lands at the START of the previous sentence (backward motion).
    view.dispatch({ selection: { anchor: range.end, head: range.start } });
  }, []);

  const highlightParagraphForward = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const cursor = view.state.selection.main.head;
    const { start, end } = paragraphForwardRange(view.state.doc.toString(), cursor);
    view.dispatch({ selection: { anchor: start, head: end } });
  }, []);

  const highlightParagraphBackward = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const cursor = view.state.selection.main.head;
    const { start, end } = paragraphBackwardRange(view.state.doc.toString(), cursor);
    // Cursor lands at the START of the paragraph (backward motion).
    view.dispatch({ selection: { anchor: end, head: start } });
  }, []);

  const getModeExt = useCallback(() => {
    const shortcuts = state.settings?.shortcuts || {};
    if (state.editorMode === "vim") {
      return createVimMode(shortcuts, {
        onModeChange: (mode) => dispatch({ type: "SET_VIM_MODE", payload: mode }),
        onHighlightSentence: highlightSentence,
      });
    }
    return createModernMode(shortcuts, { onHighlightSentence: highlightSentence });
  }, [state.editorMode, state.settings?.shortcuts, dispatch, highlightSentence]);

  const getModalShortcutsExt = useCallback(() => {
    const shortcuts = state.settings?.shortcuts || {};
    return Prec.highest(modalShortcuts(shortcuts, {
      onHighlightSentence: highlightSentence,
      onHighlightSentenceBackward: highlightSentenceBackward,
      onHighlightParagraphForward: highlightParagraphForward,
      onHighlightParagraphBackward: highlightParagraphBackward,
    }));
  }, [
    state.settings?.shortcuts,
    highlightSentence,
    highlightSentenceBackward,
    highlightParagraphForward,
    highlightParagraphBackward,
  ]);

  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const startState = EditorState.create({
      doc: state.currentDocument?.content || "",
      extensions: [
        // HIGHEST priority: mode-transition & highlight-sentence shortcuts
        // (reconfigured when the user edits shortcuts in Settings)
        modalShortcutsComp.current.of(getModalShortcutsExt()),
        // HIGHEST priority: intercept space double-tap before Vim's key handling
        Prec.highest(doubleSpaceEscape()),
        // HIGHEST priority: intercept keys and paste before Vim
        Prec.highest(
          EditorView.domEventHandlers({
            // Handle paste via native DOM event — always works
            paste(event, view) {
              const text = event.clipboardData?.getData("text/plain");
              if (text) {
                const cursor = view.state.selection.main.head;
                view.dispatch({
                  changes: { from: cursor, insert: text },
                  selection: { anchor: cursor + text.length },
                });
              }
              event.preventDefault();
              return true;
            },
            keydown(event, view) {
              const ctrl = event.ctrlKey || event.metaKey;
              if (!ctrl) return false;

              // App hotkeys: prevent CM from processing, dispatch to window.
              // Ctrl+B is intentionally NOT in this list — it's reclaimed by
              // markdownFormatKeymap for bold. Ctrl+\ is the alternate sidebar
              // toggle chord from inside the editor.
              if (["k", ",", "\\"].includes(event.key)) {
                window.dispatchEvent(new KeyboardEvent("keydown", {
                  key: event.key, ctrlKey: event.ctrlKey, metaKey: event.metaKey,
                  bubbles: true, cancelable: true,
                }));
                event.preventDefault();
                return true;
              }

              // Ctrl+V: don't let Vim eat it — let browser fire the paste event
              if (event.key === "v") {
                return false;
              }

              // Copy/cut/undo/redo/selectAll: let browser handle
              if (["c", "x", "a", "z", "y"].includes(event.key)) {
                return false;
              }

              // Save
              if (event.key === "s") {
                event.preventDefault();
                return true;
              }

              return false;
            },
          })
        ),
        EditorView.lineWrapping,
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        themeComp.current.of(getThemeExt()),
        modeComp.current.of(getModeExt()),
        autoCapComp.current.of(autoCapitalize),
        autoPunctComp.current.of([autoPunctuate, punctuationCleanup]),
        standaloneIComp.current.of(standaloneIExt),
        wordHighlight,
        rewriteBloomExt,
        checkpointsExt,
        // Mod-b / Mod-i / Mod-1..3 for markdown bold/italic/headers.
        markdownFormatKeymap,
        // Mod-e / Mod-Shift-e for expand/concise rewrite actions.
        // Reads from handleRewriteRef so it stays bound to the latest React
        // callback even though the extension is built once.
        rewriteShortcuts(() => handleRewriteRef.current),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            dispatch({ type: "UPDATE_CONTENT", payload: update.state.doc.toString() });
            const text = update.state.doc.toString();
            const count = text.trim() ? text.trim().split(/\s+/).length : 0;
            dispatch({ type: "SET_WORD_COUNT", payload: count });
          }
          if (update.selectionSet || update.docChanged || update.viewportChanged) {
            const sel = update.state.selection.main;
            if (sel.empty) {
              // No selection — kill the rewrite popup and check if we should
              // show the insert popup instead (cursor on an empty line).
              setSelectionInfo(null);
              const line = update.state.doc.lineAt(sel.head);
              if (line.text.trim() === "") {
                const coords = update.view.coordsAtPos(sel.head);
                if (coords) {
                  setInsertInfo({
                    pos: sel.head,
                    coords: { top: coords.top, left: coords.left },
                  });
                } else {
                  setInsertInfo(null);
                }
              } else {
                setInsertInfo(null);
              }
            } else {
              // Selection present — rewrite mode; hide insert popup.
              setInsertInfo(null);
              const coords = update.view.coordsAtPos(sel.from);
              if (coords) {
                setSelectionInfo({
                  from: sel.from,
                  to: sel.to,
                  coords: { top: coords.top, left: coords.left },
                });
              } else {
                setSelectionInfo(null);
              }
            }
          }
          if (update.selectionSet) {
            const cursor = update.state.selection.main.head;
            const line = update.state.doc.lineAt(cursor);
            dispatch({ type: "SET_CURSOR", payload: { line: line.number, col: cursor - line.from + 1 } });
          }
        }),
      ],
    });

    viewRef.current = new EditorView({ state: startState, parent: editorRef.current });
    return () => { viewRef.current?.destroy(); viewRef.current = null; };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !state.currentDocument) return;
    const currentContent = view.state.doc.toString();
    if (currentContent !== state.currentDocument.content && !state.isDirty) {
      view.dispatch({
        changes: { from: 0, to: currentContent.length, insert: state.currentDocument.content },
      });
    }
  }, [state.currentDocument?.id]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: themeComp.current.reconfigure(getThemeExt()) });
  }, [getThemeExt]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: modeComp.current.reconfigure(getModeExt()) });
  }, [getModeExt]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: modalShortcutsComp.current.reconfigure(getModalShortcutsExt()),
    });
  }, [getModalShortcutsExt]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: autoCapComp.current.reconfigure(
        state.settings?.preferences.autoCapitalization ? autoCapitalize : []
      ),
    });
  }, [state.settings?.preferences.autoCapitalization]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: autoPunctComp.current.reconfigure(
        state.settings?.preferences.autoPunctuation
          ? [autoPunctuate, punctuationCleanup]
          : []
      ),
    });
  }, [state.settings?.preferences.autoPunctuation]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || !state.settings) return;
    el.style.setProperty("--editor-font-size", `${state.settings.theme.fontSize}px`);
    el.style.setProperty("--editor-font-family", state.settings.theme.fontFamily);
  }, [state.settings?.theme.fontSize, state.settings?.theme.fontFamily]);

  // New documents start in Insert mode: focus the editor and (if Vim) drop
  // straight into insert. Fires after the document-content effect so the view
  // is already populated before we switch modes.
  useEffect(() => {
    if (!state.pendingInsertMode) return;
    const view = viewRef.current;
    if (!view) return;
    view.focus();
    if (state.editorMode === "vim") {
      enterInsertMode(view);
    }
    dispatch({ type: "SET_PENDING_INSERT_MODE", payload: false });
  }, [state.pendingInsertMode, state.editorMode, dispatch]);

  // Rewrite handler — called by SelectionPopup when the user clicks Expand/Concise.
  // Snapshots the selection range, calls the server, replaces the range with
  // Claude's response, then clears the popup.
  const handleRewrite = useCallback(
    async (action: RewriteAction) => {
      const view = viewRef.current;
      const snapshot = selectionInfo;
      if (!view || !snapshot) return;

      const doc = view.state.doc.toString();
      const selection = doc.slice(snapshot.from, snapshot.to);
      if (!selection.trim()) return;

      const result = await api.rewrite(doc, selection, action);

      // Replace the snapshot range with the rewritten text.
      view.dispatch({
        changes: { from: snapshot.from, to: snapshot.to, insert: result.text },
        selection: { anchor: snapshot.from + result.text.length },
      });

      // Dopamine pass: bloom the newly-inserted range so the user feels the
      // result land. The extension self-clears after the animation runs.
      triggerRewriteBloom(view, snapshot.from, snapshot.from + result.text.length);

      // Hide the popup — the selection has been collapsed to a cursor.
      setSelectionInfo(null);
      // Return focus to the editor so the user can keep typing.
      view.focus();
    },
    [selectionInfo]
  );

  // Keep handleRewriteRef pointed at the latest handleRewrite closure so the
  // Mod-e / Mod-Shift-e extension (constructed once) can always call through
  // to the current React callback.
  useEffect(() => {
    handleRewriteRef.current = handleRewrite;
  }, [handleRewrite]);

  // Insert handler — called by InsertPopup when the user picks Dice or Custom
  // on an empty line. Snapshots the cursor position, asks Claude to write a
  // paragraph that fits between the before/after context, inserts it, blooms
  // the result, and dismisses the popup.
  const handleInsert = useCallback(
    async (mode: InsertMode, prompt?: string) => {
      const view = viewRef.current;
      const snapshot = insertInfo;
      if (!view || !snapshot) return;

      const doc = view.state.doc.toString();
      const result = await api.insert(doc, snapshot.pos, mode, prompt);

      // Insert the generated paragraph at the snapshot position. Using
      // `changes: { from, insert }` without a `to` performs a pure insert
      // (no deletion) — the empty line stays intact around the new text.
      view.dispatch({
        changes: { from: snapshot.pos, insert: result.text },
        selection: { anchor: snapshot.pos + result.text.length },
      });

      // Bloom the newly inserted range so the user feels the result land.
      triggerRewriteBloom(view, snapshot.pos, snapshot.pos + result.text.length);

      // Hide the popup; cursor moved, and the line is no longer empty, so
      // the updateListener would clear insertInfo on next tick anyway —
      // but clearing here avoids a brief flicker.
      setInsertInfo(null);
      view.focus();
    },
    [insertInfo]
  );

  return (
    <>
      <div
        ref={editorRef}
        className="h-full overflow-hidden"
        style={{
          backgroundColor: state.editorMode === "vim" && state.vimMode === "insert"
            ? "#0d1214" : "#0d1117",
          transition: "background-color 400ms ease",
        }}
      />
      <SelectionPopup
        coords={selectionInfo ? selectionInfo.coords : null}
        onAction={handleRewrite}
      />
      <InsertPopup
        coords={insertInfo ? insertInfo.coords : null}
        onAction={handleInsert}
      />
    </>
  );
}
