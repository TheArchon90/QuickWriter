import { useState, useCallback } from "react";
import { useAppDispatch } from "../context/AppContext";
import { api } from "../lib/api";

interface DocumentSummary { id: string; title: string; updated_at: string; }

export function useDocuments() {
  const dispatch = useAppDispatch();
  const [recentDocs, setRecentDocs] = useState<DocumentSummary[]>([]);

  const fetchRecent = useCallback(async () => {
    const docs = await api.files.recent();
    setRecentDocs(docs);
  }, []);

  const openDocument = useCallback(async (id: string) => {
    const doc = await api.files.open(id);
    dispatch({ type: "SET_DOCUMENT", payload: doc });
    await api.settings.save({ preferences: { lastDocumentId: id } });
  }, [dispatch]);

  const createDocument = useCallback(async (title: string) => {
    const doc = await api.files.create(title);
    dispatch({ type: "SET_DOCUMENT", payload: doc });
    await fetchRecent();
    await api.settings.save({ preferences: { lastDocumentId: doc.id } });
    return doc;
  }, [dispatch, fetchRecent]);

  const deleteDocument = useCallback(async (id: string) => {
    await api.files.remove(id);
    await fetchRecent();
  }, [fetchRecent]);

  return { recentDocs, fetchRecent, openDocument, createDocument, deleteDocument };
}
