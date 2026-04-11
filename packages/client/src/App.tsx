import { useEffect, useRef } from "react";
import { AppProvider, useAppState, useAppDispatch } from "./context/AppContext";
import { useAutoSave } from "./hooks/useAutoSave";
import { useGlobalHotkeys } from "./hooks/useGlobalHotkeys";
import Editor from "./components/Editor/Editor";
import Sidebar from "./components/Sidebar/Sidebar";
import StatusBar from "./components/StatusBar/StatusBar";
import CommandPalette from "./components/CommandPalette/CommandPalette";
import SettingsPanel from "./components/Settings/SettingsPanel";
import ThemeApplier from "./components/ThemeApplier";
import EditableTitle from "./components/Topbar/EditableTitle";

function AppShell() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const scrollRef = useRef<HTMLDivElement>(null);

  useAutoSave();
  useGlobalHotkeys();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const scrollPct = Math.min(el.scrollTop / (el.scrollHeight - el.clientHeight || 1), 1);
      el.style.setProperty("--scroll-shadow-depth", String(scrollPct));
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  if (!state.settings) {
    return <div className="flex h-screen items-center justify-center bg-bg-primary text-text-muted">Loading...</div>;
  }

  const docTitle = state.currentDocument
    ? `${state.isDirty ? "* " : ""}${state.currentDocument.title} — QuickWriter`
    : "QuickWriter";

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary overflow-hidden">
      <title>{docTitle}</title>
      <ThemeApplier />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <EditableTitle />
        <div ref={scrollRef} className="flex-1 min-h-0">
          <Editor />
        </div>
        <StatusBar />
      </div>
      <CommandPalette />
      <SettingsPanel />
    </div>
  );
}

export default function App() {
  return <AppProvider><AppShell /></AppProvider>;
}
