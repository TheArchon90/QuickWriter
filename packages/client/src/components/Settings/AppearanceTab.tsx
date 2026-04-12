import { useAppState } from "../../context/AppContext";
import { useSettings } from "../../hooks/useSettings";

export default function AppearanceTab() {
  const state = useAppState();
  const { updateSettings } = useSettings();
  const theme = state.settings?.theme;
  if (!theme) return null;

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-text-primary text-sm font-medium mb-3">Theme</h4>
        <div className="flex gap-2">
          {(["dark", "light"] as const).map((t) => (
            <button key={t} className={`flex-1 py-3 rounded-lg text-sm transition-colors border ${
              theme.theme === t ? "bg-accent/20 text-accent border-accent/30"
              : "bg-bg-tertiary/50 text-text-secondary border-transparent hover:border-bg-tertiary"
            }`} onClick={() => updateSettings({ theme: { theme: t } })}>
              {t === "dark" ? "🌙 Dark" : "☀️ Light"}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-text-primary text-sm font-medium mb-3">Accent Color</h4>
        <div className="flex items-center gap-3">
          <input type="color" value={theme.accentColor}
            onChange={(e) => updateSettings({ theme: { accentColor: e.target.value } })}
            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
          <span className="text-text-secondary text-sm font-mono">{theme.accentColor}</span>
        </div>
      </div>
      <div>
        <h4 className="text-text-primary text-sm font-medium mb-3">Font Family</h4>
        <select value={theme.fontFamily}
          onChange={(e) => updateSettings({ theme: { fontFamily: e.target.value } })}
          className="w-full bg-bg-tertiary text-text-primary text-sm px-3 py-2 rounded-lg border border-bg-tertiary outline-none">
          <option value="monospace">Monospace (System)</option>
          <option value="'SF Mono', 'Fira Code', monospace">SF Mono / Fira Code</option>
          <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
          <option value="'Roboto', sans-serif">Roboto</option>
          <option value="Georgia, serif">Georgia (Serif)</option>
          <option value="'Palatino Linotype', serif">Palatino (Serif)</option>
        </select>
      </div>
      <div>
        <h4 className="text-text-primary text-sm font-medium mb-3">Font Size: {theme.fontSize}px</h4>
        <input type="range" min={12} max={24} value={theme.fontSize}
          onChange={(e) => updateSettings({ theme: { fontSize: Number(e.target.value) } })}
          className="w-full accent-accent" />
        <div className="flex justify-between text-text-muted text-xs mt-1">
          <span>12px</span><span>24px</span>
        </div>
      </div>
    </div>
  );
}
