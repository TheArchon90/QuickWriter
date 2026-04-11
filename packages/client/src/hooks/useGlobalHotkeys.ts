import { useEffect } from "react";
import { useAppDispatch } from "../context/AppContext";

/**
 * Global hotkey handler that uses capture phase to intercept
 * keyboard events BEFORE CodeMirror/Vim mode consumes them.
 */
export function useGlobalHotkeys() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      switch (e.key) {
        case "k":
          e.preventDefault();
          e.stopPropagation();
          dispatch({ type: "TOGGLE_COMMAND_PALETTE" });
          break;
        case ",":
          e.preventDefault();
          e.stopPropagation();
          dispatch({ type: "TOGGLE_SETTINGS_PANEL" });
          break;
        case "b":
          e.preventDefault();
          e.stopPropagation();
          dispatch({ type: "TOGGLE_SIDEBAR" });
          break;
        // Alternate sidebar toggle chord. The editor reclaimed Ctrl+B for
        // markdown bold, so when focus is inside CodeMirror the DOM-event
        // handler dispatches Ctrl+\ to the window instead — this case
        // handles both that dispatched event and a real Ctrl+\ from outside
        // the editor.
        case "\\":
          e.preventDefault();
          e.stopPropagation();
          dispatch({ type: "TOGGLE_SIDEBAR" });
          break;
      }
    };

    // Capture phase = fires BEFORE CodeMirror's handlers
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [dispatch]);
}
