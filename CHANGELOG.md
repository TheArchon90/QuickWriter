# QuickWriter Web — Changelog

## v0.1.0 — Initial Build (2026-04-10)

### Architecture & Scaffolding
- Monorepo with npm workspaces: `packages/server` (Express) + `packages/client` (React/Vite)
- TypeScript everywhere — single language across frontend and backend
- Supabase (Postgres) for document persistence with cloud sync
- Settings persist to `~/.quickwriter/` JSON files (shortcuts, theme, preferences)

### Backend (Express)
- **Supabase client** singleton initialized from `.env` credentials
- **File service** with full document CRUD: create, open, save (upsert), archive (soft delete), search, import from local filesystem
- **Settings service** reads/writes three JSON files with defaults fallback: `shortcuts.json`, `theme_config.json`, `preferences.json`
- **API routes**: 7 file endpoints (`GET /recent`, `GET /open/:id`, `POST /save`, `POST /new`, `DELETE /:id`, `POST /import`, `GET /search`) + 3 settings endpoints (`GET /`, `PUT /`, `GET /defaults`)

### Editor Core (CodeMirror 6)
- **Vim-style modal editing** via `@replit/codemirror-vim` with custom QuickWriter actions registered through `Vim.defineAction` + `Vim.mapCommand`
- **Modern shortcuts mode** alternative — no modes, all operations via modifier combos
- **Custom navigation commands**: next word (`n`), previous word (`p`), delete word (`d`), change word (`c`), insert before word (`i`), append after word (`a`), open line below (`o`), open line above (`O`)
- **Text processing extensions** (ported from Python):
  - Auto-capitalization after sentence-ending punctuation (with abbreviation detection)
  - Auto-punctuation / contraction expansion (34 contractions: dont→don't, im→I'm, etc.)
  - Standalone "i" → "I" capitalization
  - All individually toggleable via settings
- **Word highlight** decoration under cursor in navigation mode
- **Micro-feedback** shimmer animation on auto-corrections
- **Dark and light themes** with full CSS variable customization
- **Line wrapping** enabled — text fits horizontally, user scrolls vertically
- **Live compartment reconfiguration** — theme, mode, and extension changes apply without editor reload

### UI Components
- **Sidebar** (220px, collapsible with Ctrl+B): document list from Supabase, "+ New" button, settings access. Animated collapse via Framer Motion
- **Status Bar**: mode indicator with glowing dot (green=INSERT, blue=NAVIGATION), Vim/Modern label, line/col position, word count with milestone animations (500, 1000, 2500, 5000, 10000), save status with pulse animation
- **Command Palette** (Ctrl+K): fuzzy search via Fuse.js, keyboard navigable, 7 built-in commands (new doc, toggle sidebar, settings, theme, mode, auto-punctuation, auto-capitalization)
- **Settings Panel** (Ctrl+,): slide-in from right with 3 tabs:
  - General: editor mode toggle (Vim/Modern), auto-punctuation and auto-capitalization switches
  - Shortcuts: key capture with conflict detection, grouped by context
  - Appearance: dark/light theme, accent color picker, font family dropdown, font size slider
- **Title bar**: shows current document name, updates with dirty state indicator

### Neuroscience-Driven UX
- **Living cursor**: sine-wave opacity pulse (2s cycle) with soft blue glow instead of harsh blink
- **Mode transition color morphs**: editor background subtly shifts warm (insert) ↔ cool (navigation) on mode change, 400ms ease
- **Auto-save pulse**: status bar "Saved" indicator pulses green on successful save (600ms)
- **Word count milestones**: counter does scale-up animation at 500/1000/2500/5000/10000 words
- **Auto-correct shimmer**: 400ms background highlight on contraction expansion
- **Typography**: line-height 2.0, 32px/64px editor padding, slightly warm text color (#c9d1d9), 0.01em letter spacing
- **Scroll depth parallax**: sidebar/titlebar shadow deepens as user scrolls through document

### Auto-Save
- 2-second idle debounce after typing stops
- Status flow: Editing... → Saving... → ● Saved (with pulse) → idle
- New documents defer auto-save until first explicit save (Ctrl+S)
- Last opened document ID persisted in preferences for instant restore on reload

---

## Bug Fixes (2026-04-10)

### Build & Integration
- **`deleteWordForward` doesn't exist** in `@codemirror/commands` v6 — replaced with `deleteGroupForward`
- **TypeScript private member error** on anonymous exported class — extracted to named class for `microFeedback.ts`
- **Unexported Settings type** caused inference failure — exported from `AppContext.tsx`
- **Untyped `api.settings.save()` return** — added generic type parameter
- **dotenv can't find `.env`** when running from workspace package dir — added `--env-file=../../.env` to scripts

### Keyboard / Hotkeys
- **Global hotkeys (Ctrl+K, Ctrl+B, Ctrl+,) not working** — CodeMirror's Vim extension consumed all keyboard events before window-level handlers. Fix: centralized in `useGlobalHotkeys` hook with capture-phase listeners, plus `Prec.highest(EditorView.domEventHandlers)` to intercept at CodeMirror DOM level and re-dispatch to window
- **Ctrl+V paste not working** — Vim mode interpreted Ctrl+V as visual block. First attempt with `navigator.clipboard.readText()` failed (Chrome silently blocks permissions). Fix: native DOM `paste` event handler in `Prec.highest(EditorView.domEventHandlers)` reads from `event.clipboardData`
- **Ctrl+C/X/Z not working** — Vim consuming clipboard/undo keys. Fix: `domEventHandlers` returns `false` for these keys so browser handles natively

### Vim Navigation Mode
- **Nav commands (n/p/d/c/i/a/o/O) not working** — commands were registered as a separate CodeMirror `keymap.of()` alongside `vim()`, but Vim in normal mode consumed the keys first. Fix: register through `Vim.defineAction` + `Vim.mapCommand` so commands run inside Vim's command system
- **Word movement (n/p) stuck on commas** — `\w` regex only matches word characters, so cursor got stuck on punctuation. Fix: movement functions now skip punctuation and whitespace to land on next/previous actual word
- **Change word (c), open line (o/O), insert (i), append (a) not entering insert mode** — three failed approaches:
  1. `Vim.handleKey(cm, "i", "mapping")` — recursed because `i` was remapped to custom action
  2. `setTimeout(() => Vim.handleKey(...))` — caused cursor jumps, Vim state confusion
  3. `isEdit: true` on `mapCommand` — only records for undo/repeat, does NOT enter insert mode
  - **Working fix**: `Vim.noremap("<C-q>", "i", "normal")` preserves original insert mode behavior on an unused key BEFORE remapping `i`. Custom actions call `Vim.handleKey(cm, "<C-q>", "mapping")` which triggers the original `enterInsertMode` without recursion

### Editor Display
- **Horizontal scrolling on long lines** — text extended past editor width. Fix: added `EditorView.lineWrapping` extension + CSS `white-space: pre-wrap` and `overflow-wrap` rules
- **Mouse wheel scroll not working** — parent container `overflow-hidden` was clipping CodeMirror's scroller. Fix: changed to `min-h-0` on parent, `overflow-auto` on editor container

---

## Known Issues / Future Work
- Bundle size is 728KB (CodeMirror + Framer Motion + Fuse.js) — could benefit from code splitting
- Light theme not yet fully tested with all micro-feedback animations
- Document title editing not yet implemented (currently always "Untitled")
- No keyboard shortcut for manual save (Ctrl+S intercepted but not wired to save action)
- Settings changes require page reload for some CodeMirror compartments to fully reconfigure
- No document export (Supabase → local file) feature yet
