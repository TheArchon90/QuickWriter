import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppState, useAppDispatch } from "../../context/AppContext";
import { useDocuments } from "../../hooks/useDocuments";
import DocumentItem from "./DocumentItem";

export default function Sidebar() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { recentDocs, fetchRecent, openDocument, createDocument, deleteDocument } = useDocuments();

  useEffect(() => { fetchRecent(); }, [fetchRecent]);

  return (
    <AnimatePresence>
      {state.sidebarOpen && (
        <motion.aside
          className="w-[220px] bg-bg-primary border-r border-bg-tertiary flex flex-col select-none overflow-hidden"
          initial={{ width: 0, opacity: 0 }} animate={{ width: 220, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <span className="text-text-secondary text-[11px] uppercase tracking-widest">Files</span>
            <button onClick={() => createDocument("Untitled")} className="text-accent text-xs hover:underline">+ New</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {recentDocs.map((doc) => (
              <DocumentItem key={doc.id} id={doc.id} title={doc.title} updatedAt={doc.updated_at}
                isActive={state.currentDocument?.id === doc.id}
                onClick={() => openDocument(doc.id)} onDelete={() => deleteDocument(doc.id)}
              />
            ))}
            {recentDocs.length === 0 && (
              <div className="px-4 py-8 text-text-muted text-xs text-center">
                No documents yet.<br />Click "+ New" to start writing.
              </div>
            )}
          </div>
          <div className="border-t border-bg-tertiary p-3 space-y-2">
            <button className="flex items-center gap-2 text-text-secondary text-xs hover:text-text-primary transition-colors w-full"
              onClick={() => dispatch({ type: "TOGGLE_SETTINGS_PANEL" })}
            ><span>⚙️</span> Settings</button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
