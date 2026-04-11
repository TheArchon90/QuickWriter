import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppState } from "../../context/AppContext";

export default function StatusBar() {
  const state = useAppState();
  const [milestoneHit, setMilestoneHit] = useState(false);
  const [prevWordCount, setPrevWordCount] = useState(0);
  const [modePulse, setModePulse] = useState(false);
  const [prevVimMode, setPrevVimMode] = useState(state.vimMode);

  const isInsert = state.editorMode === "modern" || state.vimMode === "insert";
  const modeColor = isInsert ? "#3fb950" : "#58a6ff";
  const modeLabel = state.editorMode === "modern" ? "MODERN" : isInsert ? "INSERT" : "NAVIGATION";

  const milestones = [500, 1000, 2500, 5000, 10000];
  useEffect(() => {
    const crossed = milestones.some((m) => prevWordCount < m && state.wordCount >= m);
    if (crossed) { setMilestoneHit(true); setTimeout(() => setMilestoneHit(false), 500); }
    setPrevWordCount(state.wordCount);
  }, [state.wordCount]);

  useEffect(() => {
    if (state.vimMode !== prevVimMode) {
      setModePulse(true);
      setTimeout(() => setModePulse(false), 300);
      setPrevVimMode(state.vimMode);
    }
  }, [state.vimMode]);

  return (
    <div className="h-8 bg-bg-secondary border-t border-bg-tertiary flex items-center justify-between px-4 text-xs select-none">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <motion.div className="w-2 h-2 rounded-full"
            style={{ backgroundColor: modeColor, boxShadow: `0 0 6px ${modeColor}60` }}
            animate={modePulse ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3 }}
          />
          <motion.span className="font-semibold tracking-wider"
            style={{ color: modeColor }}
            animate={{ color: modeColor }}
            transition={{ duration: 0.4 }}
          >{modeLabel}</motion.span>
        </div>
        <span className="text-text-muted">|</span>
        <span className="text-text-secondary">
          {state.editorMode === "vim" ? "Vim Mode" : "Modern Mode"}
        </span>
      </div>
      <div className="flex items-center gap-4 text-text-secondary">
        <span>Ln {state.cursorLine}, Col {state.cursorCol}</span>
        <motion.span
          animate={milestoneHit ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >{state.wordCount} {state.wordCount === 1 ? "word" : "words"}</motion.span>
        <AnimatePresence mode="wait">
          {state.saveStatus === "saving" && (
            <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-text-muted">Saving...</motion.span>
          )}
          {state.saveStatus === "saved" && (
            <motion.span key="saved" initial={{ opacity: 0.5 }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.6 }} className="text-insert">● Saved</motion.span>
          )}
          {state.saveStatus === "error" && (
            <motion.span key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-danger">Save failed</motion.span>
          )}
          {state.saveStatus === "idle" && state.isDirty && (
            <motion.span key="editing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-text-muted">Editing...</motion.span>
          )}
          {state.saveStatus === "idle" && !state.isDirty && state.currentDocument && (
            <motion.span key="clean" initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} className="text-insert">● Saved</motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
