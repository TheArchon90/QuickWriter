import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Fuse from "fuse.js";
import { useAppState, useAppDispatch } from "../../context/AppContext";
import { useDocuments } from "../../hooks/useDocuments";
import { useSettings } from "../../hooks/useSettings";

interface Command { id: string; label: string; shortcut?: string; action: () => void; }

export default function CommandPalette() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { updateSettings } = useSettings();
  const { createDocument } = useDocuments();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = useMemo(() => [
    { id: "new-doc", label: "New Document", action: () => createDocument("Untitled") },
    { id: "toggle-sidebar", label: "Toggle Sidebar", action: () => dispatch({ type: "TOGGLE_SIDEBAR" }) },
    { id: "open-settings", label: "Open Settings", shortcut: "Ctrl+,",
      action: () => dispatch({ type: "TOGGLE_SETTINGS_PANEL" }) },
    { id: "toggle-theme",
      label: `Switch to ${state.settings?.theme.theme === "dark" ? "Light" : "Dark"} Theme`,
      action: () => updateSettings({ theme: { theme: state.settings?.theme.theme === "dark" ? "light" : "dark" } }),
    },
    { id: "toggle-vim",
      label: `Switch to ${state.editorMode === "vim" ? "Modern" : "Vim"} Mode`,
      action: () => {
        const newMode = state.editorMode === "vim" ? "modern" : "vim";
        dispatch({ type: "SET_EDITOR_MODE", payload: newMode });
        updateSettings({ preferences: { editorMode: newMode } });
      },
    },
    { id: "toggle-autopunct",
      label: `${state.settings?.preferences.autoPunctuation ? "Disable" : "Enable"} Auto-Punctuation`,
      action: () => updateSettings({ preferences: { autoPunctuation: !state.settings?.preferences.autoPunctuation } }),
    },
    { id: "toggle-autocap",
      label: `${state.settings?.preferences.autoCapitalization ? "Disable" : "Enable"} Auto-Capitalization`,
      action: () => updateSettings({ preferences: { autoCapitalization: !state.settings?.preferences.autoCapitalization } }),
    },
  ], [state, dispatch, updateSettings, createDocument]);

  const fuse = useMemo(() => new Fuse(commands, { keys: ["label"], threshold: 0.4 }), [commands]);
  const results = query ? fuse.search(query).map((r) => r.item) : commands;

  useEffect(() => { setSelectedIndex(0); }, [query]);
  useEffect(() => {
    if (state.commandPaletteOpen) { setQuery(""); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [state.commandPaletteOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && results[selectedIndex]) {
      results[selectedIndex].action(); dispatch({ type: "TOGGLE_COMMAND_PALETTE" });
    }
    else if (e.key === "Escape") { dispatch({ type: "TOGGLE_COMMAND_PALETTE" }); }
  };

  return (
    <AnimatePresence>
      {state.commandPaletteOpen && (
        <>
          <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => dispatch({ type: "TOGGLE_COMMAND_PALETTE" })}
          />
          <motion.div
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[520px] bg-bg-secondary border border-bg-tertiary rounded-xl shadow-2xl z-50 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <input ref={inputRef} type="text" value={query}
              onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Type a command..."
              className="w-full px-4 py-3 bg-transparent text-text-primary text-sm outline-none border-b border-bg-tertiary placeholder:text-text-muted"
            />
            <div className="max-h-[300px] overflow-y-auto py-1">
              {results.map((cmd, i) => (
                <div key={cmd.id}
                  className={`flex items-center justify-between px-4 py-2 cursor-pointer text-sm ${
                    i === selectedIndex ? "bg-accent/10 text-text-primary" : "text-text-secondary hover:bg-bg-tertiary/50"
                  }`}
                  onClick={() => { cmd.action(); dispatch({ type: "TOGGLE_COMMAND_PALETTE" }); }}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <span>{cmd.label}</span>
                  {cmd.shortcut && <span className="text-text-muted text-xs">{cmd.shortcut}</span>}
                </div>
              ))}
              {results.length === 0 && (
                <div className="px-4 py-6 text-text-muted text-xs text-center">No matching commands</div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
