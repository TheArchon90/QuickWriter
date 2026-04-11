import { useCallback } from "react";
import { useAppState, useAppDispatch, type Settings } from "../context/AppContext";
import { api } from "../lib/api";

export function useSettings() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const updateSettings = useCallback(
    async (partial: Record<string, unknown>) => {
      const updated = await api.settings.save(partial) as Settings;
      dispatch({ type: "SET_SETTINGS", payload: updated });
    },
    [dispatch]
  );

  return { settings: state.settings, editorMode: state.editorMode, updateSettings };
}
