import { motion, AnimatePresence } from "framer-motion";
import { useAppState } from "../../context/AppContext";

type Shortcut = { keys: string; label: string };

const SHORTCUTS: Record<string, Shortcut[]> = {
  "vim-insert": [
    { keys: "Esc", label: "Nav" },
    { keys: "Ctrl+B", label: "Bold" },
    { keys: "Ctrl+I", label: "Italic" },
    { keys: "Ctrl+1", label: "H1" },
    { keys: "Ctrl+2", label: "H2" },
    { keys: "Ctrl+E", label: "Expand" },
    { keys: "Ctrl+Shift+E", label: "Concise" },
    { keys: "Ctrl+M", label: "Marker" },
    { keys: "Ctrl+S", label: "Save" },
  ],
  "vim-normal": [
    { keys: "i", label: "Insert" },
    { keys: "o", label: "New line" },
    { keys: "w", label: "Next word" },
    { keys: "b", label: "Prev word" },
    { keys: "gg", label: "Top" },
    { keys: "G", label: "Bottom" },
    { keys: "Ctrl+M", label: "Marker" },
    { keys: "Ctrl+E", label: "Expand" },
  ],
  "modern": [
    { keys: "Ctrl+B", label: "Bold" },
    { keys: "Ctrl+I", label: "Italic" },
    { keys: "Ctrl+1", label: "H1" },
    { keys: "Ctrl+2", label: "H2" },
    { keys: "Ctrl+E", label: "Expand" },
    { keys: "Ctrl+M", label: "Marker" },
    { keys: "Ctrl+K", label: "Palette" },
    { keys: "Ctrl+,", label: "Settings" },
  ],
};

export default function HotkeyBar() {
  const state = useAppState();
  const key =
    state.editorMode === "modern"
      ? "modern"
      : state.vimMode === "insert"
      ? "vim-insert"
      : "vim-normal";
  const shortcuts = SHORTCUTS[key];

  return (
    <div
      className="h-7 bg-bg-primary border-b border-bg-tertiary flex items-center gap-4 px-4 text-[10px] select-none overflow-x-auto [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: "none" }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-4"
        >
          {shortcuts.map((s) => (
            <span
              key={s.keys + s.label}
              className="flex items-center gap-1 shrink-0"
            >
              <kbd className="px-1 py-0.5 bg-bg-tertiary text-text-primary rounded border border-bg-tertiary/80 font-mono text-[9px] leading-none">
                {s.keys}
              </kbd>
              <span className="text-text-muted">{s.label}</span>
            </span>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
