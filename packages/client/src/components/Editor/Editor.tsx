import { useEffect, useRef, useCallback } from "react";
import { EditorState, Compartment, Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { useAppState, useAppDispatch } from "../../context/AppContext";
import { darkTheme } from "./themes/dark";
import { lightTheme } from "./themes/light";
import { autoCapitalize } from "./extensions/autoCapitalize";
import { autoPunctuate } from "./extensions/autoPunctuate";
import { standaloneIExt } from "./extensions/standaloneI";
import { wordHighlight } from "./extensions/wordHighlight";
import { createVimMode } from "./keymaps/vimMode";
import { createModernMode } from "./keymaps/modernMode";

export default function Editor() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const themeComp = useRef(new Compartment());
  const modeComp = useRef(new Compartment());
  const autoCapComp = useRef(new Compartment());
  const autoPunctComp = useRef(new Compartment());
  const standaloneIComp = useRef(new Compartment());

  const getThemeExt = useCallback(() => {
    return state.settings?.theme.theme === "light" ? lightTheme : darkTheme;
  }, [state.settings?.theme.theme]);

  const highlightSentence = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const cursor = view.state.selection.main.head;
    const text = view.state.doc.toString();
    let start = cursor;
    let end = cursor;
    while (start > 0 && !/[.!?\n]/.test(text[start - 1])) start--;
    while (end < text.length && !/[.!?\n]/.test(text[end])) end++;
    if (end < text.length) end++;
    view.dispatch({ selection: { anchor: start, head: end } });
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

  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const startState = EditorState.create({
      doc: state.currentDocument?.content || "",
      extensions: [
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

              // App hotkeys: prevent CM from processing, dispatch to window
              if (["k", "b", ","].includes(event.key)) {
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
        autoPunctComp.current.of(autoPunctuate),
        standaloneIComp.current.of(standaloneIExt),
        wordHighlight,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            dispatch({ type: "UPDATE_CONTENT", payload: update.state.doc.toString() });
            const text = update.state.doc.toString();
            const count = text.trim() ? text.trim().split(/\s+/).length : 0;
            dispatch({ type: "SET_WORD_COUNT", payload: count });
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
      effects: autoCapComp.current.reconfigure(
        state.settings?.preferences.autoCapitalization ? autoCapitalize : []
      ),
    });
  }, [state.settings?.preferences.autoCapitalization]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: autoPunctComp.current.reconfigure(
        state.settings?.preferences.autoPunctuation ? autoPunctuate : []
      ),
    });
  }, [state.settings?.preferences.autoPunctuation]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || !state.settings) return;
    el.style.setProperty("--editor-font-size", `${state.settings.theme.fontSize}px`);
    el.style.setProperty("--editor-font-family", state.settings.theme.fontFamily);
  }, [state.settings?.theme.fontSize, state.settings?.theme.fontFamily]);

  return (
    <div
      ref={editorRef}
      className="flex-1 overflow-auto"
      style={{
        backgroundColor: state.editorMode === "vim" && state.vimMode === "insert"
          ? "#0d1214" : "#0d1117",
        transition: "background-color 400ms ease",
      }}
    />
  );
}
