import { useState } from "react";
import { useAppState } from "../../context/AppContext";
import { useSettings } from "../../hooks/useSettings";
import { formatKeybind, checkConflicts } from "../../lib/keybindParser";

export default function ShortcutsTab() {
  const state = useAppState();
  const { updateSettings } = useSettings();
  const [capturing, setCapturing] = useState<{ context: string; action: string } | null>(null);

  const shortcuts = state.settings?.shortcuts;
  if (!shortcuts) return null;

  const conflicts = checkConflicts(shortcuts);

  const handleKeyCapture = (e: React.KeyboardEvent) => {
    if (!capturing) return;
    e.preventDefault();
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
    if (e.shiftKey) parts.push("Shift");
    if (e.altKey) parts.push("Alt");
    const key = e.key;
    if (["Control", "Shift", "Alt", "Meta"].includes(key)) return;
    parts.push(key.length === 1 ? key.toUpperCase() : key);
    const newBind = parts.join("+");
    const updated = { ...shortcuts, [capturing.context]: { ...shortcuts[capturing.context], [capturing.action]: newBind } };
    updateSettings({ shortcuts: updated });
    setCapturing(null);
  };

  const actionLabels: Record<string, string> = {
    save_file: "Save", save_file_as: "Save As", move_next_word: "Next Word",
    move_prev_word: "Previous Word", delete_word: "Delete Word", change_word: "Change Word",
    insert_before_word: "Insert Before", append_after_word: "Append After",
    open_line_below: "Open Line Below", open_line_above: "Open Line Above",
    highlight_sentence: "Highlight Sentence", enter_insert_mode: "Enter Insert Mode",
    enter_navigation_mode: "Enter Navigation Mode", enter_navigation_mode_alt: "Enter Nav Mode (Alt)",
  };

  const categories = [
    { key: "general", label: "General" },
    { key: "navigation", label: "Navigation" },
    { key: "insert", label: "Insert" },
  ];

  return (
    <div className="space-y-6" onKeyDown={handleKeyCapture} tabIndex={0}>
      {categories.map((cat) => (
        <div key={cat.key}>
          <h4 className="text-text-primary text-sm font-medium mb-2">{cat.label}</h4>
          <div className="space-y-1">
            {Object.entries(shortcuts[cat.key] || {}).map(([action, key]) => {
              const isCapturing = capturing?.context === cat.key && capturing?.action === action;
              const hasConflict = conflicts.some((c) =>
                c.key.toLowerCase() === key.toLowerCase() && (c.action1 === action || c.action2 === action)
              );
              return (
                <div key={action} className="flex items-center justify-between py-1.5">
                  <span className="text-text-secondary text-sm">{actionLabels[action] || action}</span>
                  <button className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                    isCapturing ? "bg-accent/20 text-accent border border-accent animate-pulse"
                    : hasConflict ? "bg-danger/10 text-danger border border-danger/30"
                    : "bg-bg-tertiary text-text-secondary border border-transparent hover:border-bg-tertiary"
                  }`}
                    onClick={() => setCapturing(isCapturing ? null : { context: cat.key, action })}
                  >{isCapturing ? "Press a key..." : formatKeybind(key)}</button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {conflicts.length > 0 && (
        <div className="text-danger text-xs bg-danger/5 p-3 rounded-lg border border-danger/20">
          {conflicts.map((c, i) => (
            <div key={i}>Conflict: "{c.key}" used by both {c.action1} and {c.action2} ({c.context})</div>
          ))}
        </div>
      )}
    </div>
  );
}
