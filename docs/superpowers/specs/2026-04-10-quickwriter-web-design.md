# QuickWriter Web — Design Specification

**Date:** 2026-04-10
**Status:** Approved
**Summary:** Rewrite QuickWriter from a Tkinter desktop app to a browser-based local-first writing application using React, CodeMirror 6, Express, and Supabase.

---

## 1. Overview

QuickWriter Web replaces the existing Python/Tkinter modal text editor with a modern browser-based application. The app runs on localhost, serves a React frontend from an Express backend, and persists documents to Supabase. All text processing runs client-side in TypeScript. No Python in the runtime.

### Goals

- Preserve all current editing features (modal editing, custom keybinds, auto-capitalization, auto-punctuation, contraction expansion)
- Dramatically improve UI/UX with modern web technologies
- Add document management via Supabase cloud storage
- Create an app that feels alive and rewarding to use through neuroscience-driven micro-interactions
- Enable progressive disclosure: simple on the surface, powerful when you dig in

### What's Dropped

- Speech-to-text (both local Whisper and Google Cloud) — user uses Wispr Flow externally
- Local filesystem as primary storage — replaced by Supabase
- Tkinter and all Python runtime dependencies

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend framework | React 18+ | Component architecture, state management |
| Styling | Tailwind CSS | Utility-first CSS, rapid custom design |
| Animation | Framer Motion | Physics-based transitions and micro-interactions |
| Editor core | CodeMirror 6 | Text editing, keybinding system, Vim mode |
| Vim mode | @replit/codemirror-vim | First-class Vim emulation plugin |
| Backend | Express (Node.js) | API server, serves static frontend build |
| Language | TypeScript (everywhere) | Single language across frontend and backend |
| Database | Supabase (Postgres) | Document persistence, cloud sync |
| Package management | npm workspaces | Monorepo with shared types |

---

## 3. Project Structure

```
quickwriter-web/
├── package.json                    (monorepo root, npm workspaces)
├── .env                            (Supabase URL + service role key)
├── .gitignore
├── packages/
│   ├── server/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts            (Express entry, serves static + API)
│   │       ├── routes/
│   │       │   ├── files.ts        (document CRUD endpoints)
│   │       │   └── settings.ts     (keybinds, theme, prefs endpoints)
│   │       └── services/
│   │           ├── supabaseClient.ts   (initialized from .env)
│   │           ├── fileService.ts      (Supabase document operations)
│   │           └── settingsService.ts  (read/write ~/.quickwriter/ JSON)
│   └── client/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── App.tsx
│           ├── main.tsx
│           ├── components/
│           │   ├── Editor/
│           │   │   ├── Editor.tsx               (CodeMirror wrapper)
│           │   │   ├── extensions/
│           │   │   │   ├── autoCapitalize.ts    (sentence-start capitalization)
│           │   │   │   ├── autoPunctuate.ts     (contraction expansion)
│           │   │   │   ├── standaloneI.ts       (lowercase "i" correction)
│           │   │   │   ├── wordHighlight.ts     (current word highlight in Nav mode)
│           │   │   │   └── microFeedback.ts     (correction shimmer, ink-bloom)
│           │   │   ├── keymaps/
│           │   │   │   ├── vimMode.ts           (Vim keymap configuration)
│           │   │   │   └── modernMode.ts        (modifier-combo keymap)
│           │   │   └── themes/
│           │   │       ├── dark.ts              (CodeMirror dark theme)
│           │   │       └── light.ts             (CodeMirror light theme)
│           │   ├── Sidebar/
│           │   │   ├── Sidebar.tsx              (document list, settings access)
│           │   │   └── DocumentItem.tsx         (single doc in list)
│           │   ├── StatusBar/
│           │   │   └── StatusBar.tsx            (mode indicator, word count, save status)
│           │   ├── CommandPalette/
│           │   │   └── CommandPalette.tsx       (Ctrl+K fuzzy command search)
│           │   └── Settings/
│           │       ├── SettingsPanel.tsx         (slide-out panel container)
│           │       ├── GeneralTab.tsx            (mode toggle, auto-features)
│           │       ├── ShortcutsTab.tsx          (keybind editor with key capture)
│           │       └── AppearanceTab.tsx         (theme, accent color, font)
│           ├── hooks/
│           │   ├── useSettings.ts               (settings context hook)
│           │   ├── useDocuments.ts              (document CRUD hook)
│           │   └── useAutoSave.ts               (2s idle auto-save trigger)
│           ├── lib/
│           │   ├── textProcessing.ts            (ported Python logic: regex, maps)
│           │   ├── api.ts                       (fetch wrapper for backend endpoints)
│           │   └── keybindParser.ts             (JSON config → CodeMirror keymap)
│           └── context/
│               └── AppContext.tsx                (current doc, settings, sidebar state)
```

---

## 4. Supabase Document Storage

### Database Schema

```sql
CREATE TABLE documents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_archived BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_documents_updated_at ON documents (updated_at DESC);
CREATE INDEX idx_documents_archived ON documents (is_archived) WHERE is_archived = false;
```

Single table. No auth, no RLS — this is a local-first personal tool.

### API Endpoints

```
GET    /api/files/recent           → 20 most recent non-archived documents (id, title, updated_at)
GET    /api/files/open/:id         → full document by ID (id, title, content, created_at, updated_at)
POST   /api/files/save             → { id, title, content } → upsert, returns updated doc
POST   /api/files/new              → { title } → insert empty document, returns new doc
DELETE /api/files/:id              → soft delete (set is_archived = true)
POST   /api/files/import           → { path } → read local file, create Supabase document, return doc
GET    /api/files/search?q=...     → full-text search across title and content
```

### Credential Handling

- Supabase URL and service role key stored in `.env` at project root
- Express backend reads via `process.env.SUPABASE_URL` and `process.env.SUPABASE_SERVICE_ROLE_KEY`
- `.env` added to `.gitignore`
- The existing `supabase.txt` file is for reference only — not read by the app

---

## 5. Settings System

### Storage

Settings persist to `~/.quickwriter/` as JSON files (same location as current app for backward compatibility):

- `shortcuts.json` — keybind mappings per action, grouped by context (general, navigation, insert)
- `theme_config.json` — current theme (dark/light), accent color, font family, font size
- `preferences.json` — editor mode (vim/modern), auto-punctuation on/off, auto-capitalization on/off, sidebar visible, last opened document ID

### API Endpoints

```
GET    /api/settings               → merged settings object (shortcuts + theme + preferences)
PUT    /api/settings               → save updated settings (partial update, deep merge)
GET    /api/settings/defaults      → factory defaults for all settings
```

### Client-side Flow

1. App loads → fetches `GET /api/settings` → populates React context
2. User changes a setting in the Settings panel → optimistic UI update → `PUT /api/settings`
3. Settings context change triggers CodeMirror compartment reconfiguration (live, no editor reload)
4. Keybind changes rebuild the active keymap extension on the fly

---

## 6. Editor Core — CodeMirror 6

### Editor Modes

**Vim-style modal (default):**
- Uses `@replit/codemirror-vim` extension
- Navigation mode: word-level movement, delete word, change word, open line above/below, sentence highlight
- Insert mode: standard typing with auto-processing extensions active
- Custom Vim commands registered for QuickWriter-specific operations
- Mode indicator in status bar (green = Insert, blue = Navigation)

**Modern shortcuts:**
- No modes — all operations available via modifier combos
- Default bindings:
  - `Ctrl+D` — delete word
  - `Ctrl+Shift+D` — change word (delete + enter insert)
  - `Ctrl+Shift+J` — highlight sentence
  - `Ctrl+Shift+O` — open line above
  - `Ctrl+O` — open line below (file open is via sidebar or Ctrl+K → "Import File")
- Flat keymap layer replaces Vim extension

**Switching between modes:**
- Setting toggle in General tab or via command palette
- CodeMirror compartment swap — the Vim extension is added/removed live
- Active keymap reconfigured, no editor reload

### Custom Keybinds

- Stored in `shortcuts.json` with this schema (backward compatible with current app):

```json
{
  "general": {
    "save_file": "Ctrl+S",
    "open_file": "Ctrl+O"
  },
  "navigation": {
    "move_next_word": "n",
    "move_prev_word": "p",
    "delete_word": "d",
    "change_word": "c"
  },
  "insert": {
    "enter_navigation_mode": "Escape"
  }
}
```

- `keybindParser.ts` reads this config and produces a CodeMirror `keymap` extension
- Shortcuts editor UI: key capture on click, conflict detection across contexts, reset-to-defaults
- Changes apply instantly via compartment reconfiguration

### Text Processing Extensions

Each is a CodeMirror `ViewPlugin` or `inputHandler`:

**autoCapitalize:**
- Fires on character input after sentence-ending punctuation (. ! ?) followed by whitespace
- Checks abbreviation list (mr, mrs, dr, e.g., i.e., etc.) to avoid false positives
- Capitalizes the next letter in the transaction

**autoPunctuate:**
- Fires on space or punctuation after a word
- Checks the preceding word against a contraction map (dont→don't, im→I'm, cant→can't, etc.)
- Replaces the word in the transaction
- Case-aware: preserves original casing pattern (DONT→DON'T, Dont→Don't)

**standaloneI:**
- Fires on space after a standalone "i"
- Checks word boundaries to avoid matching words containing "i"
- Replaces with "I"

All three can be individually toggled via settings (controlled by compartment configuration).

---

## 7. UI Shell

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  [●][●][●]         chapter-03.txt — QuickWriter         │  ← Title bar
├────────────┬────────────────────────────────────────────┤
│            │                                            │
│  FILES     │                                            │
│            │           Editor Area                      │
│  📄 ch-03  │        (CodeMirror 6)                      │
│  📄 ch-02  │                                            │
│  📄 ch-01  │     Generous padding (32px 64px)           │
│  📄 outline│     Line height 2.0                        │
│            │     Warm text color on dark bg              │
│            │                                            │
│  ──────    │                                            │
│  ⚙ Settings│                                            │
│  ⌨ Shortcuts                                            │
├────────────┴────────────────────────────────────────────┤
│ ● INSERT  │ Vim Mode        Ln 14, Col 38  347 words ● │  ← Status bar
└─────────────────────────────────────────────────────────┘
```

### Sidebar

- **Width:** 220px, collapsible to hidden via keyboard shortcut or button
- **Content:** Document list (from Supabase, ordered by `updated_at`), "New" button, Settings and Shortcuts links at bottom
- **Active document** highlighted with accent color left-border
- **Collapse animation:** Framer Motion slide with width transition (200ms ease-out)
- **State persisted** in `preferences.json` (sidebar open/closed)

### Status Bar

- **Left side:** Mode indicator (glowing dot + label), editor mode label (Vim/Modern)
- **Right side:** Line/column position, word count, save status
- **Mode indicator colors:**
  - Insert: green (#3fb950) with green glow shadow
  - Navigation: blue (#58a6ff) with blue glow shadow
- **Save status states:** "Editing..." (neutral) → "Saving..." (pulse) → "Saved" (green, fades)
- **Color transition:** 400ms ease on mode switch, not instant

### Command Palette (Ctrl+K)

- Center-screen overlay with backdrop blur
- Scale-up entrance animation (0.95→1.0, 150ms)
- Search input with fuzzy matching against all registered commands
- Each result shows: command name + current keybind (right-aligned, muted)
- Arrow key navigation, Enter to execute, Escape to dismiss
- Commands: mode switch, theme toggle, file operations, settings, feature toggles

### Settings Panel (Ctrl+,)

- Slides in from right side, 400px wide
- Three tabs: General, Shortcuts, Appearance
- Editor stays visible and interactive behind it (not a blocking modal)
- Changes apply instantly, auto-persist on change (no save button)
- Closes with Escape or clicking outside

**General tab:**
- Editor mode toggle (Vim-style / Modern shortcuts)
- Auto-punctuation on/off
- Auto-capitalization on/off

**Shortcuts tab:**
- Grouped by context (General, Navigation, Insert)
- Click a shortcut → key capture mode (press new key combo)
- Conflict detection with warning highlight
- Reset to defaults button

**Appearance tab:**
- Theme toggle (dark / light)
- Accent color picker
- Font family dropdown (monospace options + serif options like Georgia)
- Font size slider (12–24px, live preview)

---

## 8. Neuroscience-Driven UX Layer

### The Living Cursor

- Opacity pulses on a sine wave (0.4→1.0→0.4 over 2s) instead of harsh on/off blink
- Soft glow shadow in accent color (box-shadow with 8px blur, 0.3 opacity)
- Implemented via CodeMirror cursor CSS override

### Mode Transition Color Morphs

- Switching Insert↔Navigation triggers:
  1. Status bar mode dot color transition (400ms ease)
  2. Status bar mode label text color transition (400ms ease)
  3. Editor background subtle color temperature shift:
     - Insert: barely-perceptible warm tint (e.g., bg shifts from #0d1117 to #0d1214)
     - Navigation: barely-perceptible cool tint (e.g., bg shifts from #0d1117 to #0d1119)
  4. Mode indicator single pulse animation (scale 1.0→1.2→1.0 over 300ms)

### Scroll Depth Parallax

- As scroll position increases, the sidebar and title bar cast progressively deeper shadows
- Shadow depth calculated from scroll percentage: `box-shadow: 0 ${4 + scrollPct * 12}px ${8 + scrollPct * 24}px rgba(0,0,0,${0.1 + scrollPct * 0.4})`
- Creates spatial depth perception — user feels like they're moving through the document

### Micro-Feedback Animations

**Auto-save pulse:**
- When auto-save completes, the "Saved" text in the status bar pulses green
- Single pulse: opacity 0.5→1.0→0.5 over 600ms
- No toast, no popup — just a heartbeat

**Auto-correct shimmer:**
- When auto-punctuation corrects a word, the corrected text gets a 400ms background highlight
- Highlight fades from accent color (0.2 opacity) to transparent
- Implemented as a CodeMirror Decoration with CSS animation

**Word count milestones:**
- At 500, 1000, 2500, 5000, 10000 words, the word counter does a scale animation
- Scale 1.0→1.15→1.0 over 500ms with ease-out
- Variable-ratio reinforcement — the user doesn't know when the next one hits

**Sentence completion ink-bloom:**
- When a period is typed and auto-capitalize preps the next sentence, the period gets a subtle radial gradient bloom
- 300ms, barely visible — subconscious "I finished a thought" signal

### Typography

- Line height: 2.0 (generous, reduces eye fatigue)
- Text color: slightly warm off-white (#c9d1d9 on dark, #1f2328 on light) — not pure white/black
- Editor padding: 32px vertical, 64px horizontal — text doesn't crowd the edges
- Letter spacing: 0.01em — subtle but improves readability
- Default font: monospace (user can switch to serif like Georgia in settings)

### Progressive Disclosure

| Layer | What the user sees | Discovery trigger |
|-------|-------------------|-------------------|
| Surface | Clean editor, sidebar with files, status bar | Immediately on open |
| First dig | Command palette (Ctrl+K), settings panel (Ctrl+,) | First few minutes of use |
| Power user | Vim mode toggle, custom keybinds, accent colors | Exploring settings |
| Deep end | Full shortcut remapping, keyboard-only workflow, hidden sidebar | Making the app theirs |

---

## 9. Auto-Save Behavior

1. User types → dirty state set → title shows unsaved indicator
2. After 2 seconds of idle (no keystrokes), auto-save triggers
3. `POST /api/files/save` with current document ID, title, and content
4. On success: status bar shows save pulse animation, dirty state cleared
5. On failure: status bar shows "Save failed" in red, retry after next idle period
6. New documents (never saved): auto-save deferred until first explicit save via Ctrl+S or command palette, which creates the Supabase record and assigns an ID
7. On app load: last opened document ID read from `preferences.json`, document fetched from Supabase and loaded into editor

---

## 10. Startup Flow

1. User runs `npm start` (or `node packages/server/dist/index.js`)
2. Express server starts on localhost:3000 (configurable via PORT env var)
3. Server serves React build as static files from `packages/client/dist/`
4. Browser opens to `http://localhost:3000`
5. Client fetches `GET /api/settings` → populates context, configures CodeMirror
6. Client fetches last opened document ID from settings → `GET /api/files/open/:id`
7. If no last document: show empty editor with sidebar open, recent docs listed
8. Editor ready, cursor breathing, mode set — user is writing in under 1 second of page load

---

## 11. Development Workflow

- **Monorepo:** npm workspaces, single `npm install` at root
- **Client dev:** Vite dev server with HMR (hot module reload), proxies API calls to Express
- **Server dev:** `tsx watch` for auto-restart on changes
- **Build:** `npm run build` → Vite builds client to `packages/client/dist/`, tsc compiles server
- **Run production:** `npm start` → Express serves built client + API
