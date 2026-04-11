import { useEffect, useRef } from "react";
import { useAppState, useAppDispatch } from "../context/AppContext";
import { api } from "../lib/api";

export function useAutoSave() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!state.isDirty || !state.currentDocument?.id) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      const doc = state.currentDocument;
      if (!doc) return;
      dispatch({ type: "SET_SAVE_STATUS", payload: "saving" });
      try {
        await api.files.save(doc.id, doc.title, doc.content);
        dispatch({ type: "SET_DIRTY", payload: false });
        dispatch({ type: "SET_SAVE_STATUS", payload: "saved" });
        setTimeout(() => dispatch({ type: "SET_SAVE_STATUS", payload: "idle" }), 1500);
      } catch {
        dispatch({ type: "SET_SAVE_STATUS", payload: "error" });
      }
    }, 2000);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [state.isDirty, state.currentDocument, dispatch]);
}
