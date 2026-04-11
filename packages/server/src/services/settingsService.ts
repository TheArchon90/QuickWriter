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

async function readJsonFile<T>(filename: string, fallback: T): Promise<T> {
  try {
    const filePath = path.join(CONFIG_DIR, filename);
    const raw = await fs.readFile(filePath, "utf-8");
    return { ...fallback, ...JSON.parse(raw) };
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
