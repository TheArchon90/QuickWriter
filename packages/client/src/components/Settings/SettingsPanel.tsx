import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppState, useAppDispatch } from "../../context/AppContext";
import GeneralTab from "./GeneralTab";
import ShortcutsTab from "./ShortcutsTab";
import AppearanceTab from "./AppearanceTab";

const tabs = [
  { id: "general", label: "General" },
  { id: "shortcuts", label: "Shortcuts" },
  { id: "appearance", label: "Appearance" },
] as const;
type TabId = (typeof tabs)[number]["id"];

export default function SettingsPanel() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<TabId>("general");

  useEffect(() => {
    if (!state.settingsPanelOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") dispatch({ type: "TOGGLE_SETTINGS_PANEL" }); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.settingsPanelOpen, dispatch]);

  return (
    <AnimatePresence>
      {state.settingsPanelOpen && (
        <>
          <motion.div className="fixed inset-0 z-30"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => dispatch({ type: "TOGGLE_SETTINGS_PANEL" })}
          />
          <motion.div
            className="fixed right-0 top-0 h-full w-[400px] bg-bg-secondary border-l border-bg-tertiary z-40 flex flex-col shadow-2xl"
            initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-bg-tertiary">
              <h3 className="text-text-primary text-base font-medium">Settings</h3>
              <button className="text-text-muted hover:text-text-primary transition-colors"
                onClick={() => dispatch({ type: "TOGGLE_SETTINGS_PANEL" })}>✕</button>
            </div>
            <div className="flex border-b border-bg-tertiary px-5">
              {tabs.map((tab) => (
                <button key={tab.id}
                  className={`px-3 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
                    activeTab === tab.id ? "text-accent border-accent"
                    : "text-text-secondary border-transparent hover:text-text-primary"
                  }`}
                  onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === "general" && <GeneralTab />}
              {activeTab === "shortcuts" && <ShortcutsTab />}
              {activeTab === "appearance" && <AppearanceTab />}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
