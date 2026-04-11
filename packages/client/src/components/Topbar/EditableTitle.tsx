import { useState, useEffect, useRef } from "react";
import { useAppState, useAppDispatch } from "../../context/AppContext";
import { useDocuments } from "../../hooks/useDocuments";
import { api } from "../../lib/api";

export default function EditableTitle() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { fetchRecent } = useDocuments();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const currentTitle = state.currentDocument?.title ?? "QuickWriter";
  const canEdit = state.currentDocument != null;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const beginEdit = () => {
    if (!canEdit) return;
    setDraft(currentTitle);
    setEditing(true);
  };

  const save = async () => {
    if (!state.currentDocument) return setEditing(false);
    const trimmed = draft.trim();
    if (!trimmed || trimmed === state.currentDocument.title) {
      return setEditing(false);
    }
    try {
      await api.files.rename(state.currentDocument.id, trimmed);
      dispatch({ type: "SET_TITLE", payload: trimmed });
      await fetchRecent();
    } catch (err) {
      console.error("[rename] failed:", err);
    } finally {
      setEditing(false);
    }
  };

  const cancel = () => setEditing(false);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); save(); }
    if (e.key === "Escape") { e.preventDefault(); cancel(); }
  };

  return (
    <div className="h-9 bg-bg-secondary border-b border-bg-tertiary flex items-center justify-center text-xs text-text-secondary select-none">
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={save}
          className="bg-bg-primary text-text-primary text-xs px-2 py-0.5 rounded outline-none border border-accent/40 focus:border-accent/70 min-w-[200px] text-center"
          spellCheck={false}
        />
      ) : (
        <span
          onDoubleClick={beginEdit}
          className={canEdit ? "cursor-text hover:text-text-primary transition-colors" : ""}
          title={canEdit ? "Double-click to rename" : undefined}
        >
          {currentTitle}
        </span>
      )}
    </div>
  );
}
