import fs from "fs/promises";
import path from "path";
import os from "os";

const CONFIG_DIR = path.join(os.homedir(), ".quickwriter");

const DEFAULT_SHORTCUTS = {
  general: {
    save_file: "Ctrl+S",
    save_file_as: "Ctrl+Shift+S",
  },
  navigation: {
    move_next_word: "n",
    move_prev_word: "p",
    delete_word: "d",
    change_word: "c",
    insert_before_word: "i",
    append_after_word: "a",
    open_line_below: "o",
    open_line_above: "O",
    highlight_sentence: "Ctrl+J",
    highlight_sentence_backward: "Shift+U",
    highlight_paragraph: "Alt+J",
    highlight_paragraph_backward: "Shift+Alt+U",
    enter_insert_mode: "Ctrl+I",
  },
  insert: {
    enter_navigation_mode: "Escape",
    enter_navigation_mode_alt: "Ctrl+N",
  },
};

const DEFAULT_THEME = {
  theme: "dark" as const,
  accentColor: "#58a6ff",
  fontFamily: "monospace",
  fontSize: 16,
};

const DEFAULT_PREFERENCES = {
  editorMode: "vim" as const,
  autoPunctuation: true,
  autoCapitalization: true,
  sidebarVisible: true,
  lastDocumentId: null as string | null,
};

export interface Settings {
  shortcuts: typeof DEFAULT_SHORTCUTS;
  theme: typeof DEFAULT_THEME;
  preferences: typeof DEFAULT_PREFERENCES;
}

async function ensureConfigDir(): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
}

/**
 * Merge persisted settings on top of defaults with a two-level deep merge.
 * The top-level keys of fallback are always present, and within each top-level
 * object the persisted values override the defaults but new default keys
 * (e.g. newly added shortcut actions) still appear. For non-object values the
 * persisted value wins outright.
 */
function mergeSettings<T>(fallback: T, persisted: unknown): T {
  if (typeof fallback !== "object" || fallback === null || Array.isArray(fallback)) {
    return (persisted ?? fallback) as T;
  }
  if (typeof persisted !== "object" || persisted === null || Array.isArray(persisted)) {
    return fallback;
  }
  const result: Record<string, unknown> = { ...(fallback as object) };
  const p = persisted as Record<string, unknown>;
  for (const key of Object.keys(fallback as object)) {
    const fval = (fallback as Record<string, unknown>)[key];
    if (key in p) {
      if (
        fval !== null &&
        typeof fval === "object" &&
        !Array.isArray(fval) &&
        p[key] !== null &&
        typeof p[key] === "object" &&
        !Array.isArray(p[key])
      ) {
        // One more level: persisted scalars override, new default scalars stay.
        result[key] = { ...(fval as object), ...(p[key] as object) };
      } else {
        result[key] = p[key];
      }
    }
  }
  return result as T;
}

async function readJsonFile<T>(filename: string, fallback: T): Promise<T> {
  try {
    const filePath = path.join(CONFIG_DIR, filename);
    const raw = await fs.readFile(filePath, "utf-8");
    return mergeSettings(fallback, JSON.parse(raw));
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filename: string, data: unknown): Promise<void> {
  await ensureConfigDir();
  const filePath = path.join(CONFIG_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function getSettings(): Promise<Settings> {
  const [shortcuts, theme, preferences] = await Promise.all([
    readJsonFile("shortcuts.json", DEFAULT_SHORTCUTS),
    readJsonFile("theme_config.json", DEFAULT_THEME),
    readJsonFile("preferences.json", DEFAULT_PREFERENCES),
  ]);
  return { shortcuts, theme, preferences };
}

export async function saveSettings(partial: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  if (partial.shortcuts) {
    current.shortcuts = { ...current.shortcuts, ...partial.shortcuts };
    await writeJsonFile("shortcuts.json", current.shortcuts);
  }
  if (partial.theme) {
    current.theme = { ...current.theme, ...partial.theme };
    await writeJsonFile("theme_config.json", current.theme);
  }
  if (partial.preferences) {
    current.preferences = { ...current.preferences, ...partial.preferences };
    await writeJsonFile("preferences.json", current.preferences);
  }
  return current;
}

export function getDefaults(): Settings {
  return {
    shortcuts: DEFAULT_SHORTCUTS,
    theme: DEFAULT_THEME,
    preferences: DEFAULT_PREFERENCES,
  };
}
