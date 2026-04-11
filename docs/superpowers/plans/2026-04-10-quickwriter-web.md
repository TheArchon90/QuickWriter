# QuickWriter Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite QuickWriter from a Python/Tkinter desktop app to a browser-based local-first writing app with React, CodeMirror 6, Express, and Supabase.

**Architecture:** Monorepo with two packages — an Express backend (thin filesystem + Supabase layer) and a React frontend (Vite, CodeMirror 6, Tailwind, Framer Motion). All text processing runs client-side. Documents persist to Supabase. Settings persist to `~/.quickwriter/` JSON files.

**Tech Stack:** TypeScript, React 18, Vite, Tailwind CSS, Framer Motion, CodeMirror 6, @replit/codemirror-vim, Express, @supabase/supabase-js, Vitest

**Spec:** `docs/superpowers/specs/2026-04-10-quickwriter-web-design.md`

---

## File Structure

```
quickwriter-web/
├── package.json                         (monorepo root, npm workspaces)
├── .env                                 (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
├── .gitignore
├── tsconfig.base.json                   (shared TS config)
├── packages/
│   ├── server/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                 (Express entry — static serving + API routes)
│   │       ├── routes/
│   │       │   ├── files.ts             (document CRUD: recent, open, save, new, delete, import, search)
│   │       │   └── settings.ts          (GET/PUT settings, GET defaults)
│   │       └── services/
│   │           ├── supabaseClient.ts     (singleton Supabase client from env vars)
│   │           ├── fileService.ts        (Supabase document queries)
│   │           └── settingsService.ts    (read/write ~/.quickwriter/ JSON files)
│   └── client/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── postcss.config.js
│       ├── index.html
│       └── src/
│           ├── main.tsx                  (React entry)
│           ├── App.tsx                   (layout shell: sidebar + editor + status bar)
│           ├── index.css                 (Tailwind directives + global styles + animations)
│           ├── components/
│           │   ├── Editor/
│           │   │   ├── Editor.tsx        (CodeMirror wrapper, compartment management)
│           │   │   ├── extensions/
│           │   │   │   ├── autoCapitalize.ts
│           │   │   │   ├── autoPunctuate.ts
│           │   │   │   ├── standaloneI.ts
│           │   │   │   ├── wordHighlight.ts
│           │   │   │   └── microFeedback.ts
│           │   │   ├── keymaps/
│           │   │   │   ├── vimMode.ts
│           │   │   │   └── modernMode.ts
│           │   │   └── themes/
│           │   │       ├── dark.ts
│           │   │       └── light.ts
│           │   ├── Sidebar/
│           │   │   ├── Sidebar.tsx
│           │   │   └── DocumentItem.tsx
│           │   ├── StatusBar/
│           │   │   └── StatusBar.tsx
│           │   ├── CommandPalette/
│           │   │   └── CommandPalette.tsx
│           │   └── Settings/
│           │       ├── SettingsPanel.tsx
│           │       ├── GeneralTab.tsx
│           │       ├── ShortcutsTab.tsx
│           │       └── AppearanceTab.tsx
│           ├── hooks/
│           │   ├── useSettings.ts
│           │   ├── useDocuments.ts
│           │   └── useAutoSave.ts
│           ├── lib/
│           │   ├── textProcessing.ts     (contraction map, abbreviations, capitalization logic)
│           │   ├── api.ts                (typed fetch wrapper for backend endpoints)
│           │   └── keybindParser.ts      (shortcuts.json → CodeMirror keymap)
│           └── context/
│               └── AppContext.tsx         (current doc, settings, sidebar state, mode)
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `quickwriter-web/package.json`
- Create: `quickwriter-web/.gitignore`
- Create: `quickwriter-web/.env`
- Create: `quickwriter-web/tsconfig.base.json`
- Create: `quickwriter-web/packages/server/package.json`
- Create: `quickwriter-web/packages/server/tsconfig.json`
- Create: `quickwriter-web/packages/client/package.json`
- Create: `quickwriter-web/packages/client/tsconfig.json`
- Create: `quickwriter-web/packages/client/vite.config.ts`
- Create: `quickwriter-web/packages/client/tailwind.config.ts`
- Create: `quickwriter-web/packages/client/postcss.config.js`
- Create: `quickwriter-web/packages/client/index.html`

- [ ] **Step 1: Create monorepo root**

Create `quickwriter-web/package.json`:
```json
{
  "name": "quickwriter-web",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "npm run dev -w packages/server",
    "dev:client": "npm run dev -w packages/client",
    "build": "npm run build -w packages/client && npm run build -w packages/server",
    "start": "npm run start -w packages/server",
    "test": "npm run test -w packages/client"
  },
  "devDependencies": {
    "concurrently": "^9.1.2",
    "typescript": "^5.7.0"
  }
}
```

Create `quickwriter-web/.gitignore`:
```
node_modules/
dist/
.env
*.tsbuildinfo
.superpowers/
```

Create `quickwriter-web/.env`:
```
SUPABASE_URL=https://ehgrspbugkgefbtqxewq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZ3JzcGJ1Z2tnZWZidHF4ZXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzUwOTI0OCwiZXhwIjoyMDgzMDg1MjQ4fQ.-zroNszuzHQUTvivaylq99S_Ha-HV9BjYz1rSOrsNdE
PORT=3000
```

Create `quickwriter-web/tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 2: Create server package**

Create `quickwriter-web/packages/server/package.json`:
```json
{
  "name": "@quickwriter/server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.49.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0"
  }
}
```

Create `quickwriter-web/packages/server/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create client package**

Create `quickwriter-web/packages/client/package.json`:
```json
{
  "name": "@quickwriter/client",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@codemirror/autocomplete": "^6.18.0",
    "@codemirror/commands": "^6.7.0",
    "@codemirror/language": "^6.10.0",
    "@codemirror/search": "^6.5.0",
    "@codemirror/state": "^6.5.0",
    "@codemirror/view": "^6.36.0",
    "@replit/codemirror-vim": "^6.2.0",
    "codemirror": "^6.0.0",
    "framer-motion": "^12.0.0",
    "fuse.js": "^7.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^4.1.0",
    "vitest": "^3.1.0"
  }
}
```

Create `quickwriter-web/packages/client/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "dist",
    "noEmit": true
  },
  "include": ["src"]
}
```

Create `quickwriter-web/packages/client/vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  build: {
    outDir: "dist",
  },
});
```

Create `quickwriter-web/packages/client/postcss.config.js`:
```js
export default {};
```

Create `quickwriter-web/packages/client/tailwind.config.ts`:
```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
} satisfies Config;
```

Create `quickwriter-web/packages/client/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>QuickWriter</title>
  </head>
  <body class="bg-[#0d1117] text-[#c9d1d9]">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Install dependencies and verify**

Run from `quickwriter-web/`:
```bash
npm install
```
Expected: Clean install, no errors, `node_modules/` created at root and symlinked in packages.

- [ ] **Step 5: Commit**

```bash
git add quickwriter-web/
git commit -m "feat: scaffold quickwriter-web monorepo with server and client packages"
```

---

## Task 2: Express Backend — Supabase Client & File Service

**Files:**
- Create: `quickwriter-web/packages/server/src/services/supabaseClient.ts`
- Create: `quickwriter-web/packages/server/src/services/fileService.ts`

- [ ] **Step 1: Create Supabase client singleton**

Create `quickwriter-web/packages/server/src/services/supabaseClient.ts`:
```ts
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment"
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
```

- [ ] **Step 2: Create the documents table in Supabase**

Go to the Supabase dashboard SQL editor and run:
```sql
CREATE TABLE IF NOT EXISTS documents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_archived BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_archived ON documents (is_archived) WHERE is_archived = false;
```

- [ ] **Step 3: Create file service**

Create `quickwriter-web/packages/server/src/services/fileService.ts`:
```ts
import { supabase } from "./supabaseClient.js";

export interface Document {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

export interface DocumentSummary {
  id: string;
  title: string;
  updated_at: string;
}

export async function getRecentDocuments(
  limit = 20
): Promise<DocumentSummary[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, updated_at")
    .eq("is_archived", false)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getDocument(id: string): Promise<Document | null> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function saveDocument(
  id: string,
  title: string,
  content: string
): Promise<Document> {
  const { data, error } = await supabase
    .from("documents")
    .upsert(
      { id, title, content, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createDocument(title: string): Promise<Document> {
  const { data, error } = await supabase
    .from("documents")
    .insert({ title, content: "" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function archiveDocument(id: string): Promise<void> {
  const { error } = await supabase
    .from("documents")
    .update({ is_archived: true })
    .eq("id", id);

  if (error) throw error;
}

export async function searchDocuments(
  query: string
): Promise<DocumentSummary[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, updated_at")
    .eq("is_archived", false)
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data;
}
```

- [ ] **Step 4: Commit**

```bash
git add quickwriter-web/packages/server/src/services/
git commit -m "feat: add Supabase client and document file service"
```

---

## Task 3: Express Backend — Settings Service

**Files:**
- Create: `quickwriter-web/packages/server/src/services/settingsService.ts`

- [ ] **Step 1: Create settings service**

Create `quickwriter-web/packages/server/src/services/settingsService.ts`:
```ts
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

export async function saveSettings(
  partial: Partial<Settings>
): Promise<Settings> {
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
```

- [ ] **Step 2: Commit**

```bash
git add quickwriter-web/packages/server/src/services/settingsService.ts
git commit -m "feat: add settings service for ~/.quickwriter/ JSON persistence"
```

---

## Task 4: Express Backend — Routes & Server Entry

**Files:**
- Create: `quickwriter-web/packages/server/src/routes/files.ts`
- Create: `quickwriter-web/packages/server/src/routes/settings.ts`
- Create: `quickwriter-web/packages/server/src/index.ts`

- [ ] **Step 1: Create file routes**

Create `quickwriter-web/packages/server/src/routes/files.ts`:
```ts
import { Router } from "express";
import fs from "fs/promises";
import {
  getRecentDocuments,
  getDocument,
  saveDocument,
  createDocument,
  archiveDocument,
  searchDocuments,
} from "../services/fileService.js";

const router = Router();

router.get("/recent", async (_req, res) => {
  try {
    const docs = await getRecentDocuments();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch recent documents" });
  }
});

router.get("/open/:id", async (req, res) => {
  try {
    const doc = await getDocument(req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: "Failed to open document" });
  }
});

router.post("/save", async (req, res) => {
  try {
    const { id, title, content } = req.body;
    if (!id || !title) {
      return res.status(400).json({ error: "id and title are required" });
    }
    const doc = await saveDocument(id, title, content ?? "");
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: "Failed to save document" });
  }
});

router.post("/new", async (req, res) => {
  try {
    const { title } = req.body;
    const doc = await createDocument(title || "Untitled");
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: "Failed to create document" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await archiveDocument(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to archive document" });
  }
});

router.post("/import", async (req, res) => {
  try {
    const { path: filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: "path is required" });
    const content = await fs.readFile(filePath, "utf-8");
    const title = filePath.split(/[\\/]/).pop() || "Imported";
    const doc = await saveDocument(crypto.randomUUID(), title, content);
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: "Failed to import file" });
  }
});

router.get("/search", async (req, res) => {
  try {
    const q = (req.query.q as string) || "";
    if (!q) return res.json([]);
    const docs = await searchDocuments(q);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
```

- [ ] **Step 2: Create settings routes**

Create `quickwriter-web/packages/server/src/routes/settings.ts`:
```ts
import { Router } from "express";
import {
  getSettings,
  saveSettings,
  getDefaults,
} from "../services/settingsService.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "Failed to read settings" });
  }
});

router.put("/", async (req, res) => {
  try {
    const updated = await saveSettings(req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to save settings" });
  }
});

router.get("/defaults", (_req, res) => {
  res.json(getDefaults());
});

export default router;
```

- [ ] **Step 3: Create Express entry point**

Create `quickwriter-web/packages/server/src/index.ts`:
```ts
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

import filesRouter from "./routes/files.js";
import settingsRouter from "./routes/settings.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(cors());
app.use(express.json());

// API routes
app.use("/api/files", filesRouter);
app.use("/api/settings", settingsRouter);

// Serve client build in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`QuickWriter server running at http://localhost:${PORT}`);
});
```

- [ ] **Step 4: Verify server starts**

Run from `quickwriter-web/`:
```bash
npm run dev:server
```
Expected: `QuickWriter server running at http://localhost:3000`

- [ ] **Step 5: Commit**

```bash
git add quickwriter-web/packages/server/src/
git commit -m "feat: add Express routes for files and settings, server entry point"
```

---

## Task 5: Client Foundation — React Shell, Tailwind, Global Styles

**Files:**
- Create: `quickwriter-web/packages/client/src/main.tsx`
- Create: `quickwriter-web/packages/client/src/index.css`
- Create: `quickwriter-web/packages/client/src/App.tsx`
- Create: `quickwriter-web/packages/client/src/lib/api.ts`

- [ ] **Step 1: Create API client**

Create `quickwriter-web/packages/client/src/lib/api.ts`:
```ts
const BASE = "/api";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  files: {
    recent: () => request<{ id: string; title: string; updated_at: string }[]>("/files/recent"),
    open: (id: string) => request<{
      id: string; title: string; content: string;
      created_at: string; updated_at: string;
    }>(`/files/open/${id}`),
    save: (id: string, title: string, content: string) =>
      request("/files/save", {
        method: "POST",
        body: JSON.stringify({ id, title, content }),
      }),
    create: (title: string) =>
      request<{ id: string; title: string; content: string }>(
        "/files/new",
        { method: "POST", body: JSON.stringify({ title }) }
      ),
    remove: (id: string) =>
      request(`/files/${id}`, { method: "DELETE" }),
    search: (q: string) =>
      request<{ id: string; title: string; updated_at: string }[]>(
        `/files/search?q=${encodeURIComponent(q)}`
      ),
  },
  settings: {
    get: () => request<{
      shortcuts: Record<string, Record<string, string>>;
      theme: { theme: string; accentColor: string; fontFamily: string; fontSize: number };
      preferences: {
        editorMode: string; autoPunctuation: boolean;
        autoCapitalization: boolean; sidebarVisible: boolean;
        lastDocumentId: string | null;
      };
    }>("/settings"),
    save: (data: Record<string, unknown>) =>
      request("/settings", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    defaults: () => request("/settings/defaults"),
  },
};
```

- [ ] **Step 2: Create global CSS with Tailwind and custom animations**

Create `quickwriter-web/packages/client/src/index.css`:
```css
@import "tailwindcss";

@theme {
  --color-bg-primary: #0d1117;
  --color-bg-secondary: #161b22;
  --color-bg-tertiary: #21262d;
  --color-text-primary: #c9d1d9;
  --color-text-secondary: #8b949e;
  --color-text-muted: #484f58;
  --color-accent: #58a6ff;
  --color-insert: #3fb950;
  --color-navigation: #58a6ff;
  --color-danger: #f85149;
  --color-warning: #d29922;
}

/* Living cursor - breathing sine wave */
@keyframes cursor-breathe {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

/* Mode indicator pulse */
@keyframes mode-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

/* Save confirmation pulse */
@keyframes save-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* Word milestone scale */
@keyframes milestone-pop {
  0%, 100% { transform: scale(1); }
  40% { transform: scale(1.15); }
}

/* Auto-correct shimmer */
@keyframes correction-shimmer {
  0% { background-color: rgba(88, 166, 255, 0.2); }
  100% { background-color: transparent; }
}

/* Ink bloom for sentence completion */
@keyframes ink-bloom {
  0% { text-shadow: 0 0 4px rgba(88, 166, 255, 0.4); }
  100% { text-shadow: none; }
}

/* CodeMirror cursor override */
.cm-editor .cm-cursor {
  border-left-color: var(--color-accent);
  border-left-width: 2px;
  animation: cursor-breathe 2s ease-in-out infinite;
  filter: drop-shadow(0 0 8px rgba(88, 166, 255, 0.3));
}

/* CodeMirror base styling */
.cm-editor {
  height: 100%;
  font-size: var(--editor-font-size, 16px);
  font-family: var(--editor-font-family, monospace);
}

.cm-editor .cm-content {
  padding: 32px 64px;
  line-height: 2.0;
  letter-spacing: 0.01em;
}

.cm-editor .cm-scroller {
  overflow: auto;
}

/* Correction shimmer decoration */
.cm-correction-shimmer {
  animation: correction-shimmer 400ms ease-out forwards;
}

/* Ink bloom decoration */
.cm-ink-bloom {
  animation: ink-bloom 300ms ease-out forwards;
}
```

- [ ] **Step 3: Create React entry and App shell**

Create `quickwriter-web/packages/client/src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

Create `quickwriter-web/packages/client/src/App.tsx`:
```tsx
export default function App() {
  return (
    <div className="flex h-screen bg-bg-primary text-text-primary">
      {/* Sidebar placeholder */}
      <aside className="w-[220px] bg-bg-primary border-r border-bg-tertiary flex flex-col">
        <div className="p-4 text-text-secondary text-xs uppercase tracking-widest">
          Files
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        {/* Editor placeholder */}
        <div className="flex-1 flex items-center justify-center text-text-muted">
          QuickWriter Web — Editor goes here
        </div>

        {/* Status bar placeholder */}
        <div className="h-8 bg-bg-secondary border-t border-bg-tertiary flex items-center px-4 text-xs text-text-secondary">
          <span className="inline-block w-2 h-2 rounded-full bg-insert mr-2" />
          INSERT
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify client dev server starts**

Run from `quickwriter-web/`:
```bash
npm run dev:client
```
Expected: Vite dev server at `http://localhost:5173` showing the placeholder layout with dark background, sidebar, and status bar.

- [ ] **Step 5: Commit**

```bash
git add quickwriter-web/packages/client/
git commit -m "feat: add React shell with Tailwind, global animations, and API client"
```

---

## Task 6: Text Processing Library (Port from Python)

**Files:**
- Create: `quickwriter-web/packages/client/src/lib/textProcessing.ts`
- Create: `quickwriter-web/packages/client/src/lib/__tests__/textProcessing.test.ts`

- [ ] **Step 1: Write tests for text processing**

Create `quickwriter-web/packages/client/src/lib/__tests__/textProcessing.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  CONTRACTION_MAP,
  ABBREVIATIONS,
  expandContraction,
  shouldCapitalizeAfter,
  isStandaloneI,
} from "../textProcessing";

describe("expandContraction", () => {
  it("expands lowercase contractions", () => {
    expect(expandContraction("dont")).toBe("don't");
    expect(expandContraction("im")).toBe("I'm");
    expect(expandContraction("cant")).toBe("can't");
    expect(expandContraction("youre")).toBe("you're");
  });

  it("preserves capitalization of first letter", () => {
    expect(expandContraction("Dont")).toBe("Don't");
    expect(expandContraction("Im")).toBe("I'm");
    expect(expandContraction("Cant")).toBe("Can't");
  });

  it("returns null for non-contractions", () => {
    expect(expandContraction("hello")).toBeNull();
    expect(expandContraction("the")).toBeNull();
  });
});

describe("shouldCapitalizeAfter", () => {
  it("returns true after sentence-ending punctuation + space", () => {
    expect(shouldCapitalizeAfter("Hello. ")).toBe(true);
    expect(shouldCapitalizeAfter("Done! ")).toBe(true);
    expect(shouldCapitalizeAfter("Really? ")).toBe(true);
  });

  it("returns false after abbreviations", () => {
    expect(shouldCapitalizeAfter("Dr. ")).toBe(false);
    expect(shouldCapitalizeAfter("Mr. ")).toBe(false);
    expect(shouldCapitalizeAfter("e.g. ")).toBe(false);
  });

  it("returns true at start of text", () => {
    expect(shouldCapitalizeAfter("")).toBe(true);
  });

  it("returns true after newline", () => {
    expect(shouldCapitalizeAfter("First line.\n")).toBe(true);
  });
});

describe("isStandaloneI", () => {
  it("detects standalone i between spaces", () => {
    expect(isStandaloneI("and i ", 4)).toBe(true);
  });

  it("rejects i inside words", () => {
    expect(isStandaloneI("writing ", 4)).toBe(false);
    expect(isStandaloneI("in ", 0)).toBe(false);
  });

  it("detects i at start of text", () => {
    expect(isStandaloneI("i ", 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `quickwriter-web/`:
```bash
npm run test -w packages/client
```
Expected: All tests FAIL — module not found.

- [ ] **Step 3: Implement text processing library**

Create `quickwriter-web/packages/client/src/lib/textProcessing.ts`:
```ts
export const CONTRACTION_MAP: Record<string, string> = {
  im: "I'm",
  id: "I'd",
  ill: "I'll",
  ive: "I've",
  dont: "don't",
  cant: "can't",
  wont: "won't",
  wouldnt: "wouldn't",
  couldnt: "couldn't",
  shouldnt: "shouldn't",
  isnt: "isn't",
  arent: "aren't",
  wasnt: "wasn't",
  werent: "weren't",
  hasnt: "hasn't",
  havent: "haven't",
  hadnt: "hadn't",
  doesnt: "doesn't",
  didnt: "didn't",
  youre: "you're",
  youll: "you'll",
  youve: "you've",
  theyre: "they're",
  theyll: "they'll",
  theyve: "they've",
  thats: "that's",
  heres: "here's",
  theres: "there's",
  wheres: "where's",
  whats: "what's",
  whos: "who's",
  whens: "when's",
  whys: "why's",
  hows: "how's",
  lets: "let's",
  its: "it's",
  were: "we're",
  shes: "she's",
  hes: "he's",
  itll: "it'll",
  shell: "she'll",
  hell: "he'll",
  aint: "ain't",
  mustnt: "mustn't",
  mightnt: "mightn't",
  neednt: "needn't",
  oclock: "o'clock",
};

export const ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "dr", "prof", "rev", "hon", "st", "jr", "sr",
  "e.g", "i.e", "etc", "vs", "fig", "approx", "no", "vol", "pp", "pg", "p",
  "a.m", "p.m", "inc", "ltd", "co", "corp", "dept", "est", "min", "max", "avg",
]);

/**
 * Expand a contraction if the word matches the map.
 * Preserves first-letter capitalization of the original word.
 * Returns null if no match.
 */
export function expandContraction(word: string): string | null {
  const lower = word.toLowerCase();
  const replacement = CONTRACTION_MAP[lower];
  if (!replacement) return null;

  // Preserve first-letter case
  if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/**
 * Check if text before cursor position ends at a sentence boundary,
 * meaning the next character should be capitalized.
 */
export function shouldCapitalizeAfter(textBefore: string): boolean {
  // Start of document
  if (textBefore.length === 0) return true;

  // After newline
  if (textBefore.endsWith("\n")) return true;

  // After sentence-ending punctuation + whitespace
  const trimmed = textBefore.trimEnd();
  if (trimmed.length === 0) return true;

  const lastChar = trimmed[trimmed.length - 1];
  if (![".","!","?"].includes(lastChar)) return false;

  // Only capitalize if there's whitespace after the punctuation
  if (textBefore.length === trimmed.length) return false;

  // Check if the word before the period is an abbreviation
  const wordMatch = trimmed.match(/(\S+)\.$/);
  if (lastChar === "." && wordMatch) {
    const precedingWord = wordMatch[1].toLowerCase();
    // Remove trailing dot for abbreviation check
    const withoutDot = precedingWord.endsWith(".")
      ? precedingWord.slice(0, -1)
      : precedingWord;
    if (ABBREVIATIONS.has(withoutDot) || ABBREVIATIONS.has(precedingWord)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if the character at `pos` in `text` is a standalone lowercase "i".
 */
export function isStandaloneI(text: string, pos: number): boolean {
  if (text[pos] !== "i") return false;

  const before = pos > 0 ? text[pos - 1] : "";
  const after = pos < text.length - 1 ? text[pos + 1] : "";

  const isWordChar = (ch: string) => /[a-zA-Z0-9_]/.test(ch);

  if (before && isWordChar(before)) return false;
  if (after && isWordChar(after)) return false;

  return true;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run from `quickwriter-web/`:
```bash
npm run test -w packages/client
```
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add quickwriter-web/packages/client/src/lib/
git commit -m "feat: port text processing logic from Python with tests"
```

---

## Task 7: Keybind Parser

**Files:**
- Create: `quickwriter-web/packages/client/src/lib/keybindParser.ts`
- Create: `quickwriter-web/packages/client/src/lib/__tests__/keybindParser.test.ts`

- [ ] **Step 1: Write tests**

Create `quickwriter-web/packages/client/src/lib/__tests__/keybindParser.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  parseKeybind,
  formatKeybind,
  checkConflicts,
} from "../keybindParser";

describe("parseKeybind", () => {
  it("parses simple keys", () => {
    expect(parseKeybind("n")).toBe("n");
    expect(parseKeybind("Escape")).toBe("Escape");
  });

  it("parses modifier combos to CodeMirror format", () => {
    expect(parseKeybind("Ctrl+S")).toBe("Mod-s");
    expect(parseKeybind("Ctrl+Shift+S")).toBe("Mod-Shift-s");
    expect(parseKeybind("Ctrl+J")).toBe("Mod-j");
  });
});

describe("formatKeybind", () => {
  it("formats CodeMirror keys to display format", () => {
    expect(formatKeybind("Mod-s")).toBe("Ctrl+S");
    expect(formatKeybind("Mod-Shift-s")).toBe("Ctrl+Shift+S");
    expect(formatKeybind("n")).toBe("N");
    expect(formatKeybind("Escape")).toBe("Esc");
  });
});

describe("checkConflicts", () => {
  it("detects duplicate keybinds within a context", () => {
    const shortcuts = {
      general: { save: "Ctrl+S", other: "Ctrl+S" },
      navigation: {},
      insert: {},
    };
    const conflicts = checkConflicts(shortcuts);
    expect(conflicts.length).toBeGreaterThan(0);
  });

  it("returns empty for no conflicts", () => {
    const shortcuts = {
      general: { save: "Ctrl+S" },
      navigation: { next: "n" },
      insert: { exit: "Escape" },
    };
    const conflicts = checkConflicts(shortcuts);
    expect(conflicts).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -w packages/client
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement keybind parser**

Create `quickwriter-web/packages/client/src/lib/keybindParser.ts`:
```ts
/**
 * Convert a user-facing keybind string ("Ctrl+S") to CodeMirror format ("Mod-s").
 */
export function parseKeybind(keybind: string): string {
  if (!keybind.includes("+")) {
    // Single key — return as-is (CodeMirror uses the key name directly)
    return keybind;
  }

  const parts = keybind.split("+");
  const modifiers: string[] = [];
  let key = parts[parts.length - 1].toLowerCase();

  for (let i = 0; i < parts.length - 1; i++) {
    const mod = parts[i].trim();
    if (mod === "Ctrl" || mod === "Cmd") modifiers.push("Mod");
    else if (mod === "Shift") modifiers.push("Shift");
    else if (mod === "Alt") modifiers.push("Alt");
  }

  return [...modifiers, key].join("-");
}

/**
 * Convert a CodeMirror keybind ("Mod-s") to display format ("Ctrl+S").
 */
export function formatKeybind(cmKey: string): string {
  if (!cmKey.includes("-")) {
    if (cmKey === "Escape") return "Esc";
    return cmKey.length === 1 ? cmKey.toUpperCase() : cmKey;
  }

  const parts = cmKey.split("-");
  const formatted = parts.map((p, i) => {
    if (i === parts.length - 1) return p.toUpperCase();
    if (p === "Mod") return "Ctrl";
    return p;
  });

  return formatted.join("+");
}

export interface Conflict {
  key: string;
  action1: string;
  action2: string;
  context: string;
}

/**
 * Check for duplicate keybinds within each context and between general + others.
 */
export function checkConflicts(
  shortcuts: Record<string, Record<string, string>>
): Conflict[] {
  const conflicts: Conflict[] = [];

  // Check within each context
  for (const [context, bindings] of Object.entries(shortcuts)) {
    const seen = new Map<string, string>();
    for (const [action, key] of Object.entries(bindings)) {
      const normalized = key.toLowerCase();
      if (seen.has(normalized)) {
        conflicts.push({
          key,
          action1: seen.get(normalized)!,
          action2: action,
          context,
        });
      }
      seen.set(normalized, action);
    }
  }

  // Check general bindings against navigation and insert
  if (shortcuts.general) {
    for (const [gAction, gKey] of Object.entries(shortcuts.general)) {
      const gNorm = gKey.toLowerCase();
      for (const ctx of ["navigation", "insert"]) {
        if (!shortcuts[ctx]) continue;
        for (const [cAction, cKey] of Object.entries(shortcuts[ctx])) {
          if (cKey.toLowerCase() === gNorm) {
            conflicts.push({
              key: gKey,
              action1: gAction,
              action2: cAction,
              context: `general ↔ ${ctx}`,
            });
          }
        }
      }
    }
  }

  return conflicts;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -w packages/client
```
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add quickwriter-web/packages/client/src/lib/keybindParser.ts quickwriter-web/packages/client/src/lib/__tests__/keybindParser.test.ts
git commit -m "feat: add keybind parser with conflict detection and tests"
```

---

## Task 8: App Context & Hooks

**Files:**
- Create: `quickwriter-web/packages/client/src/context/AppContext.tsx`
- Create: `quickwriter-web/packages/client/src/hooks/useSettings.ts`
- Create: `quickwriter-web/packages/client/src/hooks/useDocuments.ts`
- Create: `quickwriter-web/packages/client/src/hooks/useAutoSave.ts`

- [ ] **Step 1: Create AppContext**

Create `quickwriter-web/packages/client/src/context/AppContext.tsx`:
```tsx
import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
  type Dispatch,
} from "react";
import { api } from "../lib/api";

interface Document {
  id: string;
  title: string;
  content: string;
}

interface Settings {
  shortcuts: Record<string, Record<string, string>>;
  theme: { theme: string; accentColor: string; fontFamily: string; fontSize: number };
  preferences: {
    editorMode: string;
    autoPunctuation: boolean;
    autoCapitalization: boolean;
    sidebarVisible: boolean;
    lastDocumentId: string | null;
  };
}

interface AppState {
  currentDocument: Document | null;
  settings: Settings | null;
  sidebarOpen: boolean;
  settingsPanelOpen: boolean;
  commandPaletteOpen: boolean;
  editorMode: "vim" | "modern";
  vimMode: "insert" | "normal";
  isDirty: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  wordCount: number;
  cursorLine: number;
  cursorCol: number;
}

type Action =
  | { type: "SET_DOCUMENT"; payload: Document | null }
  | { type: "SET_SETTINGS"; payload: Settings }
  | { type: "UPDATE_CONTENT"; payload: string }
  | { type: "SET_TITLE"; payload: string }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "TOGGLE_SETTINGS_PANEL" }
  | { type: "TOGGLE_COMMAND_PALETTE" }
  | { type: "SET_EDITOR_MODE"; payload: "vim" | "modern" }
  | { type: "SET_VIM_MODE"; payload: "insert" | "normal" }
  | { type: "SET_DIRTY"; payload: boolean }
  | { type: "SET_SAVE_STATUS"; payload: "idle" | "saving" | "saved" | "error" }
  | { type: "SET_WORD_COUNT"; payload: number }
  | { type: "SET_CURSOR"; payload: { line: number; col: number } };

const initialState: AppState = {
  currentDocument: null,
  settings: null,
  sidebarOpen: true,
  settingsPanelOpen: false,
  commandPaletteOpen: false,
  editorMode: "vim",
  vimMode: "normal",
  isDirty: false,
  saveStatus: "idle",
  wordCount: 0,
  cursorLine: 1,
  cursorCol: 1,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_DOCUMENT":
      return { ...state, currentDocument: action.payload, isDirty: false, saveStatus: "idle" };
    case "SET_SETTINGS": {
      const s = action.payload;
      return {
        ...state,
        settings: s,
        editorMode: (s.preferences.editorMode as "vim" | "modern") || "vim",
        sidebarOpen: s.preferences.sidebarVisible,
      };
    }
    case "UPDATE_CONTENT":
      return state.currentDocument
        ? {
            ...state,
            currentDocument: { ...state.currentDocument, content: action.payload },
            isDirty: true,
            saveStatus: "idle",
          }
        : state;
    case "SET_TITLE":
      return state.currentDocument
        ? { ...state, currentDocument: { ...state.currentDocument, title: action.payload } }
        : state;
    case "TOGGLE_SIDEBAR":
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case "TOGGLE_SETTINGS_PANEL":
      return { ...state, settingsPanelOpen: !state.settingsPanelOpen };
    case "TOGGLE_COMMAND_PALETTE":
      return { ...state, commandPaletteOpen: !state.commandPaletteOpen };
    case "SET_EDITOR_MODE":
      return { ...state, editorMode: action.payload };
    case "SET_VIM_MODE":
      return { ...state, vimMode: action.payload };
    case "SET_DIRTY":
      return { ...state, isDirty: action.payload };
    case "SET_SAVE_STATUS":
      return { ...state, saveStatus: action.payload };
    case "SET_WORD_COUNT":
      return { ...state, wordCount: action.payload };
    case "SET_CURSOR":
      return { ...state, cursorLine: action.payload.line, cursorCol: action.payload.col };
    default:
      return state;
  }
}

const AppContext = createContext<AppState>(initialState);
const DispatchContext = createContext<Dispatch<Action>>(() => {});

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load settings on mount
  useEffect(() => {
    api.settings.get().then((settings) => {
      dispatch({ type: "SET_SETTINGS", payload: settings });
    });
  }, []);

  // Load last document after settings load
  useEffect(() => {
    const lastId = state.settings?.preferences.lastDocumentId;
    if (lastId) {
      api.files.open(lastId).then((doc) => {
        dispatch({ type: "SET_DOCUMENT", payload: doc });
      }).catch(() => {
        // Last doc deleted/missing — that's fine
      });
    }
  }, [state.settings?.preferences.lastDocumentId]);

  return (
    <AppContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </AppContext.Provider>
  );
}

export function useAppState() {
  return useContext(AppContext);
}

export function useAppDispatch() {
  return useContext(DispatchContext);
}
```

- [ ] **Step 2: Create useSettings hook**

Create `quickwriter-web/packages/client/src/hooks/useSettings.ts`:
```ts
import { useCallback } from "react";
import { useAppState, useAppDispatch } from "../context/AppContext";
import { api } from "../lib/api";

export function useSettings() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const updateSettings = useCallback(
    async (partial: Record<string, unknown>) => {
      const updated = await api.settings.save(partial);
      dispatch({ type: "SET_SETTINGS", payload: updated });
    },
    [dispatch]
  );

  return {
    settings: state.settings,
    editorMode: state.editorMode,
    updateSettings,
  };
}
```

- [ ] **Step 3: Create useDocuments hook**

Create `quickwriter-web/packages/client/src/hooks/useDocuments.ts`:
```ts
import { useState, useCallback } from "react";
import { useAppDispatch } from "../context/AppContext";
import { api } from "../lib/api";

interface DocumentSummary {
  id: string;
  title: string;
  updated_at: string;
}

export function useDocuments() {
  const dispatch = useAppDispatch();
  const [recentDocs, setRecentDocs] = useState<DocumentSummary[]>([]);

  const fetchRecent = useCallback(async () => {
    const docs = await api.files.recent();
    setRecentDocs(docs);
  }, []);

  const openDocument = useCallback(
    async (id: string) => {
      const doc = await api.files.open(id);
      dispatch({ type: "SET_DOCUMENT", payload: doc });
      await api.settings.save({ preferences: { lastDocumentId: id } });
    },
    [dispatch]
  );

  const createDocument = useCallback(
    async (title: string) => {
      const doc = await api.files.create(title);
      dispatch({ type: "SET_DOCUMENT", payload: doc });
      await fetchRecent();
      await api.settings.save({ preferences: { lastDocumentId: doc.id } });
      return doc;
    },
    [dispatch, fetchRecent]
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      await api.files.remove(id);
      await fetchRecent();
    },
    [fetchRecent]
  );

  return { recentDocs, fetchRecent, openDocument, createDocument, deleteDocument };
}
```

- [ ] **Step 4: Create useAutoSave hook**

Create `quickwriter-web/packages/client/src/hooks/useAutoSave.ts`:
```ts
import { useEffect, useRef } from "react";
import { useAppState, useAppDispatch } from "../context/AppContext";
import { api } from "../lib/api";

export function useAutoSave() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!state.isDirty || !state.currentDocument?.id) return;

    // Clear existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // Set 2s idle timer
    timerRef.current = setTimeout(async () => {
      const doc = state.currentDocument;
      if (!doc) return;

      dispatch({ type: "SET_SAVE_STATUS", payload: "saving" });
      try {
        await api.files.save(doc.id, doc.title, doc.content);
        dispatch({ type: "SET_DIRTY", payload: false });
        dispatch({ type: "SET_SAVE_STATUS", payload: "saved" });

        // Reset to idle after pulse animation
        setTimeout(() => {
          dispatch({ type: "SET_SAVE_STATUS", payload: "idle" });
        }, 1500);
      } catch {
        dispatch({ type: "SET_SAVE_STATUS", payload: "error" });
      }
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state.isDirty, state.currentDocument, dispatch]);
}
```

- [ ] **Step 5: Commit**

```bash
git add quickwriter-web/packages/client/src/context/ quickwriter-web/packages/client/src/hooks/
git commit -m "feat: add AppContext, useSettings, useDocuments, and useAutoSave hooks"
```

---

## Task 9: CodeMirror Themes

**Files:**
- Create: `quickwriter-web/packages/client/src/components/Editor/themes/dark.ts`
- Create: `quickwriter-web/packages/client/src/components/Editor/themes/light.ts`

- [ ] **Step 1: Create dark theme**

Create `quickwriter-web/packages/client/src/components/Editor/themes/dark.ts`:
```ts
import { EditorView } from "@codemirror/view";

export const darkTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#0d1117",
      color: "#c9d1d9",
    },
    ".cm-content": {
      caretColor: "#58a6ff",
    },
    ".cm-gutters": {
      backgroundColor: "#0d1117",
      color: "#484f58",
      border: "none",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#161b22",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(22, 27, 34, 0.5)",
    },
    ".cm-selectionBackground": {
      backgroundColor: "rgba(88, 166, 255, 0.15) !important",
    },
    "&.cm-focused .cm-selectionBackground": {
      backgroundColor: "rgba(88, 166, 255, 0.2) !important",
    },
    ".cm-cursor": {
      borderLeftColor: "#58a6ff",
    },
  },
  { dark: true }
);
```

- [ ] **Step 2: Create light theme**

Create `quickwriter-web/packages/client/src/components/Editor/themes/light.ts`:
```ts
import { EditorView } from "@codemirror/view";

export const lightTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#ffffff",
      color: "#1f2328",
    },
    ".cm-content": {
      caretColor: "#0969da",
    },
    ".cm-gutters": {
      backgroundColor: "#ffffff",
      color: "#8c959f",
      border: "none",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#f6f8fa",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(234, 238, 242, 0.5)",
    },
    ".cm-selectionBackground": {
      backgroundColor: "rgba(9, 105, 218, 0.1) !important",
    },
    "&.cm-focused .cm-selectionBackground": {
      backgroundColor: "rgba(9, 105, 218, 0.15) !important",
    },
    ".cm-cursor": {
      borderLeftColor: "#0969da",
    },
  },
  { dark: false }
);
```

- [ ] **Step 3: Commit**

```bash
git add quickwriter-web/packages/client/src/components/Editor/themes/
git commit -m "feat: add dark and light CodeMirror themes"
```

---

## Task 10: CodeMirror Extensions — Text Processing

**Files:**
- Create: `quickwriter-web/packages/client/src/components/Editor/extensions/autoCapitalize.ts`
- Create: `quickwriter-web/packages/client/src/components/Editor/extensions/autoPunctuate.ts`
- Create: `quickwriter-web/packages/client/src/components/Editor/extensions/standaloneI.ts`
- Create: `quickwriter-web/packages/client/src/components/Editor/extensions/wordHighlight.ts`
- Create: `quickwriter-web/packages/client/src/components/Editor/extensions/microFeedback.ts`

- [ ] **Step 1: Create autoCapitalize extension**

Create `quickwriter-web/packages/client/src/components/Editor/extensions/autoCapitalize.ts`:
```ts
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { shouldCapitalizeAfter } from "../../../lib/textProcessing";

/**
 * Auto-capitalizes the first letter after sentence-ending punctuation.
 * Fires on each document change in insert/typing transactions.
 */
export const autoCapitalize = ViewPlugin.fromClass(
  class {
    update(update: ViewUpdate) {
      if (!update.docChanged) return;

      // Only process user input (not programmatic changes)
      const isUserInput = update.transactions.some(
        (tr) => tr.isUserEvent("input.type")
      );
      if (!isUserInput) return;

      const { state } = update;
      const cursor = state.selection.main.head;

      // Get the character just typed
      const typed = state.doc.sliceString(cursor - 1, cursor);

      // Only check on letter input
      if (!/[a-z]/.test(typed)) return;

      // Get text before the typed character
      const lineStart = state.doc.lineAt(cursor).from;
      const textBefore = state.doc.sliceString(
        Math.max(0, lineStart - 200),
        cursor - 1
      );

      if (shouldCapitalizeAfter(textBefore)) {
        update.view.dispatch({
          changes: {
            from: cursor - 1,
            to: cursor,
            insert: typed.toUpperCase(),
          },
        });
      }
    }
  }
);
```

- [ ] **Step 2: Create autoPunctuate extension**

Create `quickwriter-web/packages/client/src/components/Editor/extensions/autoPunctuate.ts`:
```ts
import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import { expandContraction } from "../../../lib/textProcessing";

/**
 * Expands contractions when the user types a space or punctuation after a word.
 * E.g., "dont " → "don't "
 */
export const autoPunctuate = ViewPlugin.fromClass(
  class {
    update(update: ViewUpdate) {
      if (!update.docChanged) return;

      const isUserInput = update.transactions.some(
        (tr) => tr.isUserEvent("input.type")
      );
      if (!isUserInput) return;

      const { state } = update;
      const cursor = state.selection.main.head;

      // Check if the character just typed is a space or punctuation
      const typed = state.doc.sliceString(cursor - 1, cursor);
      if (!/[\s.,;:!?]/.test(typed)) return;

      // Extract the word before the space/punctuation
      const line = state.doc.lineAt(cursor);
      const textBefore = state.doc.sliceString(line.from, cursor - 1);
      const wordMatch = textBefore.match(/([a-zA-Z]+)$/);
      if (!wordMatch) return;

      const word = wordMatch[1];
      const replacement = expandContraction(word);
      if (!replacement) return;

      const wordStart = cursor - 1 - word.length;
      update.view.dispatch({
        changes: {
          from: wordStart,
          to: cursor - 1,
          insert: replacement,
        },
      });
    }
  }
);
```

- [ ] **Step 3: Create standaloneI extension**

Create `quickwriter-web/packages/client/src/components/Editor/extensions/standaloneI.ts`:
```ts
import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import { isStandaloneI } from "../../../lib/textProcessing";

/**
 * Capitalizes standalone "i" to "I" when followed by a space.
 */
export const standaloneIExt = ViewPlugin.fromClass(
  class {
    update(update: ViewUpdate) {
      if (!update.docChanged) return;

      const isUserInput = update.transactions.some(
        (tr) => tr.isUserEvent("input.type")
      );
      if (!isUserInput) return;

      const { state } = update;
      const cursor = state.selection.main.head;

      // Check if space was just typed
      const typed = state.doc.sliceString(cursor - 1, cursor);
      if (typed !== " ") return;

      // Check the character before the space
      const iPos = cursor - 2;
      if (iPos < 0) return;

      const line = state.doc.lineAt(cursor);
      const lineText = state.doc.sliceString(line.from, cursor);
      const relPos = iPos - line.from;

      if (isStandaloneI(lineText, relPos)) {
        update.view.dispatch({
          changes: { from: iPos, to: iPos + 1, insert: "I" },
        });
      }
    }
  }
);
```

- [ ] **Step 4: Create wordHighlight extension**

Create `quickwriter-web/packages/client/src/components/Editor/extensions/wordHighlight.ts`:
```ts
import {
  ViewPlugin,
  ViewUpdate,
  Decoration,
  type DecorationSet,
} from "@codemirror/view";

const highlightMark = Decoration.mark({
  class: "cm-word-highlight",
  attributes: {
    style:
      "border-bottom: 2px solid var(--color-accent, #58a6ff); background: rgba(88,166,255,0.08);",
  },
});

/**
 * Highlights the word under the cursor in navigation mode.
 */
export const wordHighlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor() {
      this.decorations = Decoration.none;
    }

    update(update: ViewUpdate) {
      if (!update.selectionSet && !update.docChanged) return;

      const { state } = update;
      const cursor = state.selection.main.head;
      const line = state.doc.lineAt(cursor);
      const lineText = state.doc.sliceString(line.from, line.to);
      const relPos = cursor - line.from;

      // Find word boundaries
      let wordStart = relPos;
      let wordEnd = relPos;

      while (wordStart > 0 && /\w/.test(lineText[wordStart - 1])) wordStart--;
      while (wordEnd < lineText.length && /\w/.test(lineText[wordEnd]))
        wordEnd++;

      if (wordStart === wordEnd) {
        this.decorations = Decoration.none;
        return;
      }

      this.decorations = Decoration.set([
        highlightMark.range(line.from + wordStart, line.from + wordEnd),
      ]);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);
```

- [ ] **Step 5: Create microFeedback extension**

Create `quickwriter-web/packages/client/src/components/Editor/extensions/microFeedback.ts`:
```ts
import {
  ViewPlugin,
  ViewUpdate,
  Decoration,
  type DecorationSet,
} from "@codemirror/view";

const shimmerMark = Decoration.mark({ class: "cm-correction-shimmer" });

/**
 * Tracks auto-correction positions and applies shimmer decorations.
 * Other extensions dispatch effects to trigger shimmers.
 */
export const microFeedback = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    private pendingClear: ReturnType<typeof setTimeout> | null = null;

    constructor() {
      this.decorations = Decoration.none;
    }

    /**
     * Call this to show a shimmer over a range.
     */
    shimmer(view: { state: { doc: { length: number } } }, from: number, to: number) {
      if (from >= to || to > view.state.doc.length) return;
      this.decorations = Decoration.set([shimmerMark.range(from, to)]);

      if (this.pendingClear) clearTimeout(this.pendingClear);
      this.pendingClear = setTimeout(() => {
        this.decorations = Decoration.none;
        this.pendingClear = null;
      }, 400);
    }

    update(_update: ViewUpdate) {
      // Decorations managed by shimmer() calls
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);
```

- [ ] **Step 6: Commit**

```bash
git add quickwriter-web/packages/client/src/components/Editor/extensions/
git commit -m "feat: add CodeMirror extensions for text processing and visual feedback"
```

---

## Task 11: CodeMirror Keymaps — Vim & Modern Modes

**Files:**
- Create: `quickwriter-web/packages/client/src/components/Editor/keymaps/vimMode.ts`
- Create: `quickwriter-web/packages/client/src/components/Editor/keymaps/modernMode.ts`

- [ ] **Step 1: Create Vim mode keymap**

Create `quickwriter-web/packages/client/src/components/Editor/keymaps/vimMode.ts`:
```ts
import { vim } from "@replit/codemirror-vim";
import { type Extension } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { parseKeybind } from "../../../lib/keybindParser";

interface VimModeCallbacks {
  onModeChange: (mode: "insert" | "normal") => void;
  onHighlightSentence: () => void;
}

/**
 * Create the Vim mode extension with custom keybinds.
 * Provides Navigation mode (Vim normal) and Insert mode.
 */
export function createVimMode(
  shortcuts: Record<string, Record<string, string>>,
  callbacks: VimModeCallbacks
): Extension[] {
  // Build custom keymap from navigation shortcuts
  const navBindings: Record<string, () => boolean> = {};
  const nav = shortcuts.navigation || {};

  // General shortcuts (work in both modes)
  const generalBindings: Record<string, () => boolean> = {};
  const gen = shortcuts.general || {};

  for (const [action, key] of Object.entries(gen)) {
    const cmKey = parseKeybind(key);
    generalBindings[cmKey] = () => {
      // General actions handled by command system
      return false;
    };
  }

  // Sentence highlight
  if (nav.highlight_sentence) {
    const cmKey = parseKeybind(nav.highlight_sentence);
    navBindings[cmKey] = () => {
      callbacks.onHighlightSentence();
      return true;
    };
  }

  return [
    vim(),
    keymap.of(
      Object.entries(generalBindings).map(([key, run]) => ({ key, run: () => run() }))
    ),
    // Vim mode change listener
    EditorView.updateListener.of((update) => {
      // @replit/codemirror-vim exposes mode via cm.state
      const cmVim = (update.view as any).cm;
      if (cmVim) {
        const mode = cmVim.state?.vim?.insertMode ? "insert" : "normal";
        callbacks.onModeChange(mode);
      }
    }),
  ];
}

// Need to import EditorView for the listener
import { EditorView } from "@codemirror/view";
```

- [ ] **Step 2: Create Modern mode keymap**

Create `quickwriter-web/packages/client/src/components/Editor/keymaps/modernMode.ts`:
```ts
import { type Extension } from "@codemirror/state";
import { keymap, EditorView } from "@codemirror/view";
import {
  deleteWordBackward,
  deleteWordForward,
} from "@codemirror/commands";
import { parseKeybind } from "../../../lib/keybindParser";

interface ModernModeCallbacks {
  onHighlightSentence: () => void;
}

/**
 * Create the Modern shortcuts keymap.
 * No modes — all operations via modifier combos.
 */
export function createModernMode(
  shortcuts: Record<string, Record<string, string>>,
  callbacks: ModernModeCallbacks
): Extension[] {
  const bindings: { key: string; run: (view: EditorView) => boolean }[] = [];

  const nav = shortcuts.navigation || {};

  // Delete word
  if (nav.delete_word) {
    bindings.push({
      key: parseKeybind(nav.delete_word),
      run: (view) => deleteWordForward(view),
    });
  }

  // Highlight sentence
  if (nav.highlight_sentence) {
    bindings.push({
      key: parseKeybind(nav.highlight_sentence),
      run: () => {
        callbacks.onHighlightSentence();
        return true;
      },
    });
  }

  // Open line below
  if (nav.open_line_below) {
    bindings.push({
      key: parseKeybind(nav.open_line_below),
      run: (view) => {
        const cursor = view.state.selection.main.head;
        const line = view.state.doc.lineAt(cursor);
        view.dispatch({
          changes: { from: line.to, insert: "\n" },
          selection: { anchor: line.to + 1 },
        });
        return true;
      },
    });
  }

  // Open line above
  if (nav.open_line_above) {
    bindings.push({
      key: parseKeybind(nav.open_line_above),
      run: (view) => {
        const cursor = view.state.selection.main.head;
        const line = view.state.doc.lineAt(cursor);
        view.dispatch({
          changes: { from: line.from, insert: "\n" },
          selection: { anchor: line.from },
        });
        return true;
      },
    });
  }

  return [keymap.of(bindings)];
}
```

- [ ] **Step 3: Commit**

```bash
git add quickwriter-web/packages/client/src/components/Editor/keymaps/
git commit -m "feat: add Vim and Modern editor keymaps"
```

---

## Task 12: Editor Component

**Files:**
- Create: `quickwriter-web/packages/client/src/components/Editor/Editor.tsx`

- [ ] **Step 1: Create the CodeMirror wrapper component**

Create `quickwriter-web/packages/client/src/components/Editor/Editor.tsx`:
```tsx
import { useEffect, useRef, useCallback } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { useAppState, useAppDispatch } from "../../context/AppContext";
import { darkTheme } from "./themes/dark";
import { lightTheme } from "./themes/light";
import { autoCapitalize } from "./extensions/autoCapitalize";
import { autoPunctuate } from "./extensions/autoPunctuate";
import { standaloneIExt } from "./extensions/standaloneI";
import { wordHighlight } from "./extensions/wordHighlight";
import { createVimMode } from "./keymaps/vimMode";
import { createModernMode } from "./keymaps/modernMode";

export default function Editor() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Compartments for live reconfiguration
  const themeComp = useRef(new Compartment());
  const modeComp = useRef(new Compartment());
  const autoCapComp = useRef(new Compartment());
  const autoPunctComp = useRef(new Compartment());
  const standaloneIComp = useRef(new Compartment());

  const getThemeExt = useCallback(() => {
    return state.settings?.theme.theme === "light" ? lightTheme : darkTheme;
  }, [state.settings?.theme.theme]);

  const getModeExt = useCallback(() => {
    const shortcuts = state.settings?.shortcuts || {};
    if (state.editorMode === "vim") {
      return createVimMode(shortcuts, {
        onModeChange: (mode) => dispatch({ type: "SET_VIM_MODE", payload: mode }),
        onHighlightSentence: () => {
          // Sentence highlight implementation
          const view = viewRef.current;
          if (!view) return;
          const cursor = view.state.selection.main.head;
          const doc = view.state.doc;
          const text = doc.toString();

          // Find sentence boundaries
          let start = cursor;
          let end = cursor;
          while (start > 0 && !/[.!?\n]/.test(text[start - 1])) start--;
          while (end < text.length && !/[.!?\n]/.test(text[end])) end++;
          if (end < text.length) end++; // Include the punctuation

          view.dispatch({ selection: { anchor: start, head: end } });
        },
      });
    }
    return createModernMode(shortcuts, {
      onHighlightSentence: () => {
        const view = viewRef.current;
        if (!view) return;
        const cursor = view.state.selection.main.head;
        const text = view.state.doc.toString();
        let start = cursor;
        let end = cursor;
        while (start > 0 && !/[.!?\n]/.test(text[start - 1])) start--;
        while (end < text.length && !/[.!?\n]/.test(text[end])) end++;
        if (end < text.length) end++;
        view.dispatch({ selection: { anchor: start, head: end } });
      },
    });
  }, [state.editorMode, state.settings?.shortcuts, dispatch]);

  // Initialize editor
  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const startState = EditorState.create({
      doc: state.currentDocument?.content || "",
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        themeComp.current.of(getThemeExt()),
        modeComp.current.of(getModeExt()),
        autoCapComp.current.of(autoCapitalize),
        autoPunctComp.current.of(autoPunctuate),
        standaloneIComp.current.of(standaloneIExt),
        wordHighlight,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            dispatch({
              type: "UPDATE_CONTENT",
              payload: update.state.doc.toString(),
            });

            // Word count (debounced via React state batching)
            const text = update.state.doc.toString();
            const count = text.trim() ? text.trim().split(/\s+/).length : 0;
            dispatch({ type: "SET_WORD_COUNT", payload: count });
          }
          if (update.selectionSet) {
            const cursor = update.state.selection.main.head;
            const line = update.state.doc.lineAt(cursor);
            dispatch({
              type: "SET_CURSOR",
              payload: { line: line.number, col: cursor - line.from + 1 },
            });
          }
        }),
      ],
    });

    viewRef.current = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync document content when switching documents
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !state.currentDocument) return;

    const currentContent = view.state.doc.toString();
    if (currentContent !== state.currentDocument.content && !state.isDirty) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: state.currentDocument.content,
        },
      });
    }
  }, [state.currentDocument?.id]);

  // Reconfigure theme
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: themeComp.current.reconfigure(getThemeExt()),
    });
  }, [getThemeExt]);

  // Reconfigure editor mode
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: modeComp.current.reconfigure(getModeExt()),
    });
  }, [getModeExt]);

  // Reconfigure auto-features
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: autoCapComp.current.reconfigure(
        state.settings?.preferences.autoCapitalization ? autoCapitalize : []
      ),
    });
  }, [state.settings?.preferences.autoCapitalization]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: autoPunctComp.current.reconfigure(
        state.settings?.preferences.autoPunctuation ? autoPunctuate : []
      ),
    });
  }, [state.settings?.preferences.autoPunctuation]);

  // Apply font settings
  useEffect(() => {
    const el = editorRef.current;
    if (!el || !state.settings) return;
    el.style.setProperty(
      "--editor-font-size",
      `${state.settings.theme.fontSize}px`
    );
    el.style.setProperty(
      "--editor-font-family",
      state.settings.theme.fontFamily
    );
  }, [state.settings?.theme.fontSize, state.settings?.theme.fontFamily]);

  return (
    <div
      ref={editorRef}
      className="flex-1 overflow-hidden"
      style={{
        backgroundColor:
          state.editorMode === "vim" && state.vimMode === "insert"
            ? "#0d1214" // Warm tint for insert
            : "#0d1117", // Cool/neutral for navigation
        transition: "background-color 400ms ease",
      }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add quickwriter-web/packages/client/src/components/Editor/Editor.tsx
git commit -m "feat: add CodeMirror Editor component with compartment management"
```

---

## Task 13: Status Bar Component

**Files:**
- Create: `quickwriter-web/packages/client/src/components/StatusBar/StatusBar.tsx`

- [ ] **Step 1: Create StatusBar**

Create `quickwriter-web/packages/client/src/components/StatusBar/StatusBar.tsx`:
```tsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppState } from "../../context/AppContext";

export default function StatusBar() {
  const state = useAppState();
  const [milestoneHit, setMilestoneHit] = useState(false);
  const [prevWordCount, setPrevWordCount] = useState(0);
  const [modePulse, setModePulse] = useState(false);
  const [prevVimMode, setPrevVimMode] = useState(state.vimMode);

  const isInsert =
    state.editorMode === "modern" || state.vimMode === "insert";

  const modeColor = isInsert ? "#3fb950" : "#58a6ff";
  const modeLabel = state.editorMode === "modern"
    ? "MODERN"
    : isInsert
      ? "INSERT"
      : "NAVIGATION";

  // Word count milestone animation
  const milestones = [500, 1000, 2500, 5000, 10000];
  useEffect(() => {
    const crossed = milestones.some(
      (m) => prevWordCount < m && state.wordCount >= m
    );
    if (crossed) {
      setMilestoneHit(true);
      setTimeout(() => setMilestoneHit(false), 500);
    }
    setPrevWordCount(state.wordCount);
  }, [state.wordCount]);

  // Mode switch pulse
  useEffect(() => {
    if (state.vimMode !== prevVimMode) {
      setModePulse(true);
      setTimeout(() => setModePulse(false), 300);
      setPrevVimMode(state.vimMode);
    }
  }, [state.vimMode]);

  return (
    <div className="h-8 bg-bg-secondary border-t border-bg-tertiary flex items-center justify-between px-4 text-xs select-none">
      {/* Left side: mode indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: modeColor,
              boxShadow: `0 0 6px ${modeColor}60`,
            }}
            animate={modePulse ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3 }}
          />
          <motion.span
            className="font-semibold tracking-wider"
            style={{ color: modeColor }}
            animate={{ color: modeColor }}
            transition={{ duration: 0.4 }}
          >
            {modeLabel}
          </motion.span>
        </div>
        <span className="text-text-muted">|</span>
        <span className="text-text-secondary">
          {state.editorMode === "vim" ? "Vim Mode" : "Modern Mode"}
        </span>
      </div>

      {/* Right side: position, word count, save status */}
      <div className="flex items-center gap-4 text-text-secondary">
        <span>
          Ln {state.cursorLine}, Col {state.cursorCol}
        </span>

        <motion.span
          animate={milestoneHit ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {state.wordCount} {state.wordCount === 1 ? "word" : "words"}
        </motion.span>

        <AnimatePresence mode="wait">
          {state.saveStatus === "saving" && (
            <motion.span
              key="saving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-text-muted"
            >
              Saving...
            </motion.span>
          )}
          {state.saveStatus === "saved" && (
            <motion.span
              key="saved"
              initial={{ opacity: 0.5 }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.6 }}
              className="text-insert"
            >
              ● Saved
            </motion.span>
          )}
          {state.saveStatus === "error" && (
            <motion.span
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-danger"
            >
              Save failed
            </motion.span>
          )}
          {state.saveStatus === "idle" && state.isDirty && (
            <motion.span
              key="editing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-text-muted"
            >
              Editing...
            </motion.span>
          )}
          {state.saveStatus === "idle" && !state.isDirty && state.currentDocument && (
            <motion.span
              key="clean"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              className="text-insert"
            >
              ● Saved
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add quickwriter-web/packages/client/src/components/StatusBar/
git commit -m "feat: add StatusBar with mode indicator, word milestones, and save pulse"
```

---

## Task 14: Sidebar Component

**Files:**
- Create: `quickwriter-web/packages/client/src/components/Sidebar/DocumentItem.tsx`
- Create: `quickwriter-web/packages/client/src/components/Sidebar/Sidebar.tsx`

- [ ] **Step 1: Create DocumentItem**

Create `quickwriter-web/packages/client/src/components/Sidebar/DocumentItem.tsx`:
```tsx
import { motion } from "framer-motion";

interface Props {
  id: string;
  title: string;
  updatedAt: string;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export default function DocumentItem({
  title,
  isActive,
  onClick,
  onDelete,
}: Props) {
  return (
    <motion.div
      className={`group flex items-center justify-between px-4 py-1.5 cursor-pointer text-sm transition-colors ${
        isActive
          ? "bg-bg-secondary border-l-2 border-accent text-text-primary"
          : "text-text-secondary hover:bg-bg-secondary/50 border-l-2 border-transparent"
      }`}
      onClick={onClick}
      whileHover={{ x: 2 }}
      transition={{ duration: 0.15 }}
    >
      <span className="truncate">📄 {title}</span>
      <button
        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-opacity text-xs px-1"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="Delete"
      >
        ×
      </button>
    </motion.div>
  );
}
```

- [ ] **Step 2: Create Sidebar**

Create `quickwriter-web/packages/client/src/components/Sidebar/Sidebar.tsx`:
```tsx
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppState, useAppDispatch } from "../../context/AppContext";
import { useDocuments } from "../../hooks/useDocuments";
import DocumentItem from "./DocumentItem";

export default function Sidebar() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { recentDocs, fetchRecent, openDocument, createDocument, deleteDocument } =
    useDocuments();

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  const handleNew = async () => {
    await createDocument("Untitled");
  };

  return (
    <AnimatePresence>
      {state.sidebarOpen && (
        <motion.aside
          className="w-[220px] bg-bg-primary border-r border-bg-tertiary flex flex-col select-none overflow-hidden"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 220, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <span className="text-text-secondary text-[11px] uppercase tracking-widest">
              Files
            </span>
            <button
              onClick={handleNew}
              className="text-accent text-xs hover:underline"
            >
              + New
            </button>
          </div>

          {/* Document list */}
          <div className="flex-1 overflow-y-auto">
            {recentDocs.map((doc) => (
              <DocumentItem
                key={doc.id}
                id={doc.id}
                title={doc.title}
                updatedAt={doc.updated_at}
                isActive={state.currentDocument?.id === doc.id}
                onClick={() => openDocument(doc.id)}
                onDelete={() => deleteDocument(doc.id)}
              />
            ))}
            {recentDocs.length === 0 && (
              <div className="px-4 py-8 text-text-muted text-xs text-center">
                No documents yet.
                <br />
                Click "+ New" to start writing.
              </div>
            )}
          </div>

          {/* Bottom links */}
          <div className="border-t border-bg-tertiary p-3 space-y-2">
            <button
              className="flex items-center gap-2 text-text-secondary text-xs hover:text-text-primary transition-colors w-full"
              onClick={() => dispatch({ type: "TOGGLE_SETTINGS_PANEL" })}
            >
              <span>⚙️</span> Settings
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add quickwriter-web/packages/client/src/components/Sidebar/
git commit -m "feat: add Sidebar with document list, new/delete, and animated collapse"
```

---

## Task 15: Command Palette

**Files:**
- Create: `quickwriter-web/packages/client/src/components/CommandPalette/CommandPalette.tsx`

- [ ] **Step 1: Create CommandPalette**

Create `quickwriter-web/packages/client/src/components/CommandPalette/CommandPalette.tsx`:
```tsx
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Fuse from "fuse.js";
import { useAppState, useAppDispatch } from "../../context/AppContext";
import { useDocuments } from "../../hooks/useDocuments";
import { useSettings } from "../../hooks/useSettings";

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
}

export default function CommandPalette() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { updateSettings } = useSettings();
  const { createDocument } = useDocuments();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = useMemo(
    () => [
      {
        id: "new-doc",
        label: "New Document",
        action: () => createDocument("Untitled"),
      },
      {
        id: "toggle-sidebar",
        label: "Toggle Sidebar",
        action: () => dispatch({ type: "TOGGLE_SIDEBAR" }),
      },
      {
        id: "open-settings",
        label: "Open Settings",
        shortcut: "Ctrl+,",
        action: () => dispatch({ type: "TOGGLE_SETTINGS_PANEL" }),
      },
      {
        id: "toggle-theme",
        label: `Switch to ${state.settings?.theme.theme === "dark" ? "Light" : "Dark"} Theme`,
        action: () =>
          updateSettings({
            theme: {
              theme: state.settings?.theme.theme === "dark" ? "light" : "dark",
            },
          }),
      },
      {
        id: "toggle-vim",
        label: `Switch to ${state.editorMode === "vim" ? "Modern" : "Vim"} Mode`,
        action: () => {
          const newMode = state.editorMode === "vim" ? "modern" : "vim";
          dispatch({ type: "SET_EDITOR_MODE", payload: newMode });
          updateSettings({ preferences: { editorMode: newMode } });
        },
      },
      {
        id: "toggle-autopunct",
        label: `${state.settings?.preferences.autoPunctuation ? "Disable" : "Enable"} Auto-Punctuation`,
        action: () =>
          updateSettings({
            preferences: {
              autoPunctuation: !state.settings?.preferences.autoPunctuation,
            },
          }),
      },
      {
        id: "toggle-autocap",
        label: `${state.settings?.preferences.autoCapitalization ? "Disable" : "Enable"} Auto-Capitalization`,
        action: () =>
          updateSettings({
            preferences: {
              autoCapitalization: !state.settings?.preferences.autoCapitalization,
            },
          }),
      },
    ],
    [state, dispatch, updateSettings, createDocument]
  );

  const fuse = useMemo(
    () => new Fuse(commands, { keys: ["label"], threshold: 0.4 }),
    [commands]
  );

  const results = query
    ? fuse.search(query).map((r) => r.item)
    : commands;

  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (state.commandPaletteOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [state.commandPaletteOpen]);

  // Global Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        dispatch({ type: "TOGGLE_COMMAND_PALETTE" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      results[selectedIndex].action();
      dispatch({ type: "TOGGLE_COMMAND_PALETTE" });
    } else if (e.key === "Escape") {
      dispatch({ type: "TOGGLE_COMMAND_PALETTE" });
    }
  };

  return (
    <AnimatePresence>
      {state.commandPaletteOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dispatch({ type: "TOGGLE_COMMAND_PALETTE" })}
          />

          {/* Palette */}
          <motion.div
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[520px] bg-bg-secondary border border-bg-tertiary rounded-xl shadow-2xl z-50 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command..."
              className="w-full px-4 py-3 bg-transparent text-text-primary text-sm outline-none border-b border-bg-tertiary placeholder:text-text-muted"
            />

            <div className="max-h-[300px] overflow-y-auto py-1">
              {results.map((cmd, i) => (
                <div
                  key={cmd.id}
                  className={`flex items-center justify-between px-4 py-2 cursor-pointer text-sm ${
                    i === selectedIndex
                      ? "bg-accent/10 text-text-primary"
                      : "text-text-secondary hover:bg-bg-tertiary/50"
                  }`}
                  onClick={() => {
                    cmd.action();
                    dispatch({ type: "TOGGLE_COMMAND_PALETTE" });
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <span>{cmd.label}</span>
                  {cmd.shortcut && (
                    <span className="text-text-muted text-xs">
                      {cmd.shortcut}
                    </span>
                  )}
                </div>
              ))}
              {results.length === 0 && (
                <div className="px-4 py-6 text-text-muted text-xs text-center">
                  No matching commands
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add quickwriter-web/packages/client/src/components/CommandPalette/
git commit -m "feat: add Command Palette with fuzzy search and keyboard navigation"
```

---

## Task 16: Settings Panel

**Files:**
- Create: `quickwriter-web/packages/client/src/components/Settings/GeneralTab.tsx`
- Create: `quickwriter-web/packages/client/src/components/Settings/ShortcutsTab.tsx`
- Create: `quickwriter-web/packages/client/src/components/Settings/AppearanceTab.tsx`
- Create: `quickwriter-web/packages/client/src/components/Settings/SettingsPanel.tsx`

- [ ] **Step 1: Create GeneralTab**

Create `quickwriter-web/packages/client/src/components/Settings/GeneralTab.tsx`:
```tsx
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
      {/* Editor Mode */}
      <div>
        <h4 className="text-text-primary text-sm font-medium mb-3">
          Editor Mode
        </h4>
        <div className="flex gap-2">
          {(["vim", "modern"] as const).map((mode) => (
            <button
              key={mode}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                state.editorMode === mode
                  ? "bg-accent/20 text-accent border border-accent/30"
                  : "bg-bg-tertiary/50 text-text-secondary border border-transparent hover:border-bg-tertiary"
              }`}
              onClick={() => {
                dispatch({ type: "SET_EDITOR_MODE", payload: mode });
                updateSettings({ preferences: { editorMode: mode } });
              }}
            >
              {mode === "vim" ? "Vim-Style Modal" : "Modern Shortcuts"}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <h4 className="text-text-primary text-sm font-medium">Features</h4>
        {[
          {
            key: "autoPunctuation",
            label: "Auto-Punctuation",
            desc: "Expand contractions (dont → don't)",
            value: state.settings?.preferences.autoPunctuation ?? true,
          },
          {
            key: "autoCapitalization",
            label: "Auto-Capitalization",
            desc: "Capitalize first letter of sentences",
            value: state.settings?.preferences.autoCapitalization ?? true,
          },
        ].map((item) => (
          <label
            key={item.key}
            className="flex items-center justify-between py-2 cursor-pointer"
          >
            <div>
              <div className="text-text-primary text-sm">{item.label}</div>
              <div className="text-text-muted text-xs">{item.desc}</div>
            </div>
            <button
              className={`w-10 h-5 rounded-full transition-colors relative ${
                item.value ? "bg-accent" : "bg-bg-tertiary"
              }`}
              onClick={() => toggle(item.key, item.value)}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                  item.value ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ShortcutsTab**

Create `quickwriter-web/packages/client/src/components/Settings/ShortcutsTab.tsx`:
```tsx
import { useState } from "react";
import { useAppState } from "../../context/AppContext";
import { useSettings } from "../../hooks/useSettings";
import { formatKeybind, checkConflicts } from "../../lib/keybindParser";

export default function ShortcutsTab() {
  const state = useAppState();
  const { updateSettings } = useSettings();
  const [capturing, setCapturing] = useState<{
    context: string;
    action: string;
  } | null>(null);

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
    if (!["Control", "Shift", "Alt", "Meta"].includes(key)) {
      parts.push(key.length === 1 ? key.toUpperCase() : key);
    } else {
      return; // Don't save modifier-only presses
    }

    const newBind = parts.join("+");
    const updated = {
      ...shortcuts,
      [capturing.context]: {
        ...shortcuts[capturing.context],
        [capturing.action]: newBind,
      },
    };

    updateSettings({ shortcuts: updated });
    setCapturing(null);
  };

  const categories = [
    { key: "general", label: "General" },
    { key: "navigation", label: "Navigation" },
    { key: "insert", label: "Insert" },
  ];

  const actionLabels: Record<string, string> = {
    save_file: "Save",
    save_file_as: "Save As",
    move_next_word: "Next Word",
    move_prev_word: "Previous Word",
    delete_word: "Delete Word",
    change_word: "Change Word",
    insert_before_word: "Insert Before",
    append_after_word: "Append After",
    open_line_below: "Open Line Below",
    open_line_above: "Open Line Above",
    highlight_sentence: "Highlight Sentence",
    enter_insert_mode: "Enter Insert Mode",
    enter_navigation_mode: "Enter Navigation Mode",
    enter_navigation_mode_alt: "Enter Nav Mode (Alt)",
  };

  return (
    <div className="space-y-6" onKeyDown={handleKeyCapture} tabIndex={0}>
      {categories.map((cat) => (
        <div key={cat.key}>
          <h4 className="text-text-primary text-sm font-medium mb-2">
            {cat.label}
          </h4>
          <div className="space-y-1">
            {Object.entries(shortcuts[cat.key] || {}).map(([action, key]) => {
              const isCapturing =
                capturing?.context === cat.key &&
                capturing?.action === action;
              const hasConflict = conflicts.some(
                (c) =>
                  c.key.toLowerCase() === key.toLowerCase() &&
                  (c.action1 === action || c.action2 === action)
              );

              return (
                <div
                  key={action}
                  className="flex items-center justify-between py-1.5"
                >
                  <span className="text-text-secondary text-sm">
                    {actionLabels[action] || action}
                  </span>
                  <button
                    className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                      isCapturing
                        ? "bg-accent/20 text-accent border border-accent animate-pulse"
                        : hasConflict
                          ? "bg-danger/10 text-danger border border-danger/30"
                          : "bg-bg-tertiary text-text-secondary border border-transparent hover:border-bg-tertiary"
                    }`}
                    onClick={() =>
                      setCapturing(
                        isCapturing ? null : { context: cat.key, action }
                      )
                    }
                  >
                    {isCapturing ? "Press a key..." : formatKeybind(key)}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {conflicts.length > 0 && (
        <div className="text-danger text-xs bg-danger/5 p-3 rounded-lg border border-danger/20">
          {conflicts.map((c, i) => (
            <div key={i}>
              Conflict: "{c.key}" used by both {c.action1} and {c.action2} ({c.context})
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create AppearanceTab**

Create `quickwriter-web/packages/client/src/components/Settings/AppearanceTab.tsx`:
```tsx
import { useAppState } from "../../context/AppContext";
import { useSettings } from "../../hooks/useSettings";

export default function AppearanceTab() {
  const state = useAppState();
  const { updateSettings } = useSettings();

  const theme = state.settings?.theme;
  if (!theme) return null;

  return (
    <div className="space-y-6">
      {/* Theme toggle */}
      <div>
        <h4 className="text-text-primary text-sm font-medium mb-3">Theme</h4>
        <div className="flex gap-2">
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              className={`flex-1 py-3 rounded-lg text-sm transition-colors border ${
                theme.theme === t
                  ? "bg-accent/20 text-accent border-accent/30"
                  : "bg-bg-tertiary/50 text-text-secondary border-transparent hover:border-bg-tertiary"
              }`}
              onClick={() => updateSettings({ theme: { theme: t } })}
            >
              {t === "dark" ? "🌙 Dark" : "☀️ Light"}
            </button>
          ))}
        </div>
      </div>

      {/* Accent color */}
      <div>
        <h4 className="text-text-primary text-sm font-medium mb-3">
          Accent Color
        </h4>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={theme.accentColor}
            onChange={(e) =>
              updateSettings({ theme: { accentColor: e.target.value } })
            }
            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
          />
          <span className="text-text-secondary text-sm font-mono">
            {theme.accentColor}
          </span>
        </div>
      </div>

      {/* Font family */}
      <div>
        <h4 className="text-text-primary text-sm font-medium mb-3">
          Font Family
        </h4>
        <select
          value={theme.fontFamily}
          onChange={(e) =>
            updateSettings({ theme: { fontFamily: e.target.value } })
          }
          className="w-full bg-bg-tertiary text-text-primary text-sm px-3 py-2 rounded-lg border border-bg-tertiary outline-none"
        >
          <option value="monospace">Monospace (System)</option>
          <option value="'SF Mono', 'Fira Code', monospace">SF Mono / Fira Code</option>
          <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
          <option value="Georgia, serif">Georgia (Serif)</option>
          <option value="'Palatino Linotype', serif">Palatino (Serif)</option>
        </select>
      </div>

      {/* Font size */}
      <div>
        <h4 className="text-text-primary text-sm font-medium mb-3">
          Font Size: {theme.fontSize}px
        </h4>
        <input
          type="range"
          min={12}
          max={24}
          value={theme.fontSize}
          onChange={(e) =>
            updateSettings({ theme: { fontSize: Number(e.target.value) } })
          }
          className="w-full accent-accent"
        />
        <div className="flex justify-between text-text-muted text-xs mt-1">
          <span>12px</span>
          <span>24px</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create SettingsPanel container**

Create `quickwriter-web/packages/client/src/components/Settings/SettingsPanel.tsx`:
```tsx
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

  // Ctrl+, shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        dispatch({ type: "TOGGLE_SETTINGS_PANEL" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch]);

  // Escape to close
  useEffect(() => {
    if (!state.settingsPanelOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dispatch({ type: "TOGGLE_SETTINGS_PANEL" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.settingsPanelOpen, dispatch]);

  return (
    <AnimatePresence>
      {state.settingsPanelOpen && (
        <>
          {/* Click-outside backdrop */}
          <motion.div
            className="fixed inset-0 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dispatch({ type: "TOGGLE_SETTINGS_PANEL" })}
          />

          {/* Panel */}
          <motion.div
            className="fixed right-0 top-0 h-full w-[400px] bg-bg-secondary border-l border-bg-tertiary z-40 flex flex-col shadow-2xl"
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-bg-tertiary">
              <h3 className="text-text-primary text-base font-medium">
                Settings
              </h3>
              <button
                className="text-text-muted hover:text-text-primary transition-colors"
                onClick={() => dispatch({ type: "TOGGLE_SETTINGS_PANEL" })}
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-bg-tertiary px-5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`px-3 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? "text-accent border-accent"
                      : "text-text-secondary border-transparent hover:text-text-primary"
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
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
```

- [ ] **Step 5: Commit**

```bash
git add quickwriter-web/packages/client/src/components/Settings/
git commit -m "feat: add Settings panel with General, Shortcuts, and Appearance tabs"
```

---

## Task 17: Wire Up App.tsx

**Files:**
- Modify: `quickwriter-web/packages/client/src/App.tsx`

- [ ] **Step 1: Update App.tsx to compose all components**

Replace the contents of `quickwriter-web/packages/client/src/App.tsx`:
```tsx
import { useEffect, useRef } from "react";
import { AppProvider, useAppState, useAppDispatch } from "./context/AppContext";
import { useAutoSave } from "./hooks/useAutoSave";
import Editor from "./components/Editor/Editor";
import Sidebar from "./components/Sidebar/Sidebar";
import StatusBar from "./components/StatusBar/StatusBar";
import CommandPalette from "./components/CommandPalette/CommandPalette";
import SettingsPanel from "./components/Settings/SettingsPanel";

function AppShell() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const scrollRef = useRef<HTMLDivElement>(null);

  useAutoSave();

  // Scroll depth parallax shadow
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

  // Toggle sidebar shortcut (Ctrl+B)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        dispatch({ type: "TOGGLE_SIDEBAR" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch]);

  // Show loading state until settings load
  if (!state.settings) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary text-text-muted">
        Loading...
      </div>
    );
  }

  const docTitle = state.currentDocument
    ? `${state.isDirty ? "* " : ""}${state.currentDocument.title} — QuickWriter`
    : "QuickWriter";

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary overflow-hidden">
      {/* Dynamic page title */}
      <title>{docTitle}</title>

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Title bar */}
        <div
          className="h-9 bg-bg-secondary border-b border-bg-tertiary flex items-center justify-center text-xs text-text-secondary select-none transition-shadow duration-300"
          style={{
            boxShadow: `0 ${4 + (parseFloat(scrollRef.current?.style.getPropertyValue("--scroll-shadow-depth") || "0")) * 12}px ${8 + (parseFloat(scrollRef.current?.style.getPropertyValue("--scroll-shadow-depth") || "0")) * 24}px rgba(0,0,0,${0.05 + (parseFloat(scrollRef.current?.style.getPropertyValue("--scroll-shadow-depth") || "0")) * 0.2})`,
          }}
        >
          {state.currentDocument?.title || "QuickWriter"}
        </div>

        {/* Editor */}
        <div ref={scrollRef} className="flex-1 overflow-hidden">
          <Editor />
        </div>

        <StatusBar />
      </div>

      {/* Overlays */}
      <CommandPalette />
      <SettingsPanel />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add quickwriter-web/packages/client/src/App.tsx
git commit -m "feat: wire up all components in App shell with scroll parallax"
```

---

## Task 18: Verify Full Stack & Polish

- [ ] **Step 1: Start the full dev environment**

Run from `quickwriter-web/`:
```bash
npm run dev
```
Expected: Both server (port 3000) and client (port 5173) start. Open `http://localhost:5173`.

- [ ] **Step 2: Verify core flows**

Manual test checklist:
1. App loads with dark theme and empty state
2. Click "+ New" in sidebar → creates document, editor becomes active
3. Type text → auto-save triggers after 2s idle → status bar shows save pulse
4. Type "dont " → auto-corrects to "don't"
5. Type "i " → auto-corrects to "I "
6. Type a period, space, then a letter → letter auto-capitalizes
7. Ctrl+K → command palette opens, fuzzy search works
8. Ctrl+, → settings panel slides in
9. Toggle theme in settings → editor and shell update
10. Toggle Vim/Modern mode → status bar reflects change
11. Ctrl+B → sidebar collapses/expands
12. Create multiple documents → sidebar shows list, clicking switches docs

- [ ] **Step 3: Fix any issues found during verification**

Address any bugs or visual issues discovered in step 2.

- [ ] **Step 4: Run all tests**

```bash
npm run test -w packages/client
```
Expected: All tests pass.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A quickwriter-web/
git commit -m "fix: polish and bug fixes from integration testing"
```

---

## Task 19: Production Build & Launch Script

- [ ] **Step 1: Verify production build**

```bash
cd quickwriter-web && npm run build
```
Expected: Client builds to `packages/client/dist/`, server compiles to `packages/server/dist/`.

- [ ] **Step 2: Test production mode**

```bash
npm start
```
Expected: Express serves the built client at `http://localhost:3000`. All features work.

- [ ] **Step 3: Commit**

```bash
git add quickwriter-web/
git commit -m "feat: verify production build and complete QuickWriter Web v1"
```
