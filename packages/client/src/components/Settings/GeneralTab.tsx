import { useAppState, useAppDispatch } from "../../context/AppContext";
import { useSettings } from "../../hooks/useSettings";

export default function GeneralTab() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { updateSettings } = useSettings();

  const toggle = (key: string, current: boolean) => {
    updateSettings({ preferences: { [key]: !current } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-text-primary text-sm font-medium mb-3">Editor Mode</h4>
        <div className="flex gap-2">
          {(["vim", "modern"] as const).map((mode) => (
            <button key={mode}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                state.editorMode === mode
                  ? "bg-accent/20 text-accent border border-accent/30"
                  : "bg-bg-tertiary/50 text-text-secondary border border-transparent hover:border-bg-tertiary"
              }`}
              onClick={() => {
                dispatch({ type: "SET_EDITOR_MODE", payload: mode });
                updateSettings({ preferences: { editorMode: mode } });
              }}
            >{mode === "vim" ? "Vim-Style Modal" : "Modern Shortcuts"}</button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <h4 className="text-text-primary text-sm font-medium">Features</h4>
        {[
          { key: "autoPunctuation", label: "Auto-Punctuation", desc: "Expand contractions (dont → don't)",
            value: state.settings?.preferences.autoPunctuation ?? true },
          { key: "autoCapitalization", label: "Auto-Capitalization", desc: "Capitalize first letter of sentences",
            value: state.settings?.preferences.autoCapitalization ?? true },
        ].map((item) => (
          <label key={item.key} className="flex items-center justify-between py-2 cursor-pointer">
            <div>
              <div className="text-text-primary text-sm">{item.label}</div>
              <div className="text-text-muted text-xs">{item.desc}</div>
            </div>
            <button className={`w-10 h-5 rounded-full transition-colors relative ${item.value ? "bg-accent" : "bg-bg-tertiary"}`}
              onClick={() => toggle(item.key, item.value)}>
              <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${item.value ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </label>
        ))}
      </div>
    </div>
  );
}
