# Solo Leveling RPG — Claude Code Context

## What This Is
A fully-featured Solo Leveling RPG simulation built as a native Electron desktop app. The player creates a hunter character and plays through a persistent, AI-generated narrative powered by the Claude API. All game state is saved to disk between sessions.

---

## Tech Stack
- **Electron 30** — desktop shell (main + preload + renderer)
- **React 18** — UI (custom hooks only, no Redux/Zustand)
- **Webpack 5 + Babel 7** — build pipeline
- **Tailwind CSS 3** — styling with custom color system
- **Web Audio API** — procedural ambient audio (no audio files)
- **Leaflet** — interactive map using real-world geocoding
- **OpenStreetMap Nominatim** — free geocoding (no API key)
- **electron-store** — encrypted local storage (for API key)
- **Claude API** — `claude-sonnet-4-20250514`, streaming SSE, direct fetch

---

## How to Run
```bash
npm start          # dev: webpack watch + electron (hot reload with Ctrl+R)
npm run build:prod # production: webpack + electron-builder → .dmg/.exe
```
Entry points: `main.js` (Electron), `src/index.jsx` (React), `src/index.html` (template).

---

## Architecture

### Three-Process Model
```
Renderer (React) ←→ Preload Bridge (contextBridge) ←→ Main Process (Node.js)
```
- **main.js** — window lifecycle, IPC handlers, file system ops, API key storage
- **preload.js** — exposes `window.electronAPI.{store, fs, app}` (no direct Node access in renderer)
- **src/** — all React UI and game logic; Claude API called directly from renderer (Electron removes CORS)

### Screen Flow
`LOADING` → `SETUP` (API key) → `RESUME` or `CHARACTER` (creation wizard) → `GAME`

---

## Key Files

| File | Purpose |
|------|---------|
| `main.js` | Electron main process, IPC, auto-save on close |
| `preload.js` | Context-isolated bridge; all IPC invocations |
| `src/App.jsx` | Root router; manages screen transitions |
| `src/components/GameInterface.jsx` | Main game loop (501 LOC); streaming, auto-save, chronicle compression |
| `src/components/SystemStatusWindow.jsx` | Left panel: stats, map, session timer, reputation |
| `src/components/CharacterCreation.jsx` | 14-question wizard; q14 geocodes hometown |
| `src/hooks/useGameState.js` | All game state (player, skills, inventory, quests, NPCs, history) |
| `src/hooks/useClaudeAPI.js` | Streaming SSE, abort, key validation |
| `src/hooks/useAmbientAudio.js` | Procedural dark ambient synth (227 LOC) |
| `src/hooks/useSessionPersistence.js` | Auto-save interval + on-close save |
| `src/utils/fileManager.js` | All disk I/O via preload IPC; `saveAll()`, `loadAll()`, archive |
| `src/utils/promptBuilder.js` | Master prompt, state anchor, session resume context |
| `src/utils/stateParser.js` | Parses Claude response blocks → state deltas |
| `src/constants/` | Game rules, stat tables, XP thresholds |

---

## State Management
`useGameState` is the single source of truth. Key state:
- `playerState` — name, rank, level, HP/MP/stamina, stats, titles, coords, hometown
- `skills` / `inventory` / `quests` / `npcs` / `worldEvents` / `reputation`
- `conversationHistory` — capped at 60 messages; oldest trimmed on overflow
- `sessionMeta` — session number, total playtime, last save time
- `characterAnswers` — q1–q14 from character creation

Key methods:
- `applyAPIResponse(parsed)` — applies parsed Claude deltas to state
- `getFullState()` — serializes all state for disk
- `loadSavedState(saved)` — hydrates from disk

---

## Claude API Integration
- **Model**: `claude-sonnet-4-20250514` | **Max tokens**: 1500
- **Transport**: Direct `fetch()` with SSE streaming; `AbortController` for cancellation
- **Header required**: `'anthropic-dangerous-direct-browser-access': 'true'`

### Prompting Strategy (3 layers):
1. **Master Prompt** (`system` param, every call) — 300+ lines: game rules, XP tables, stat formulas, mandatory output block formats, tone guidelines
2. **Session Resume Prefix** (on load) — `[ SESSION RESUME ]` marker + full serialized state + last narrative summary
3. **State Anchor** (before each player action, NOT stored in history) — current stats, active quests/NPCs, output format reminders; prevents drift in long sessions

### Chronicle Compression:
At 25+ user turns, the oldest 20 messages get summarized into a single prose entry. Reduces token usage while preserving narrative continuity.

### Mandatory Output Blocks (parsed by `stateParser.js`):
- `[ SYSTEM STATUS WINDOW ]` — authoritative stat snapshot (replaces inventory/skills)
- `[ LEVEL UP DETECTED ]` — triggers level-up modal
- `[ SKILL DIRECTORY ]` — enriches skill objects (rank, effects, mutations)
- `[ QUEST UPDATE ]` — upserts quest state
- `[ NPC RELATIONS ]` — upserts NPC relationships by name
- `[ WORLD EVENT ]` — appends world event log

---

## Persistence
Save location: `~/Library/Application Support/solo-leveling-rpg/saves/`

All saves are JSON files written via Electron IPC (never localStorage):
```
saves/
├── player_state.json
├── skills.json
├── inventory.json
├── quests.json
├── npcs.json
├── titles.json
├── world_events.json
├── level_history.json
├── reputation.json
├── conversation_history.json
├── character_answers.json
├── session_meta.json
├── latest_save.json          ← used by resume screen
└── session_log/              ← timestamped checkpoint per save
```
Archive location: `~/Library/Application Support/solo-leveling-rpg/archive/`
- Starting a new campaign copies current saves to an archive subdirectory.

---

## Audio
Procedural synthesis via Web Audio API — no audio files needed.
- Sub-bass drones (D1/D2/A1 frequencies), LFO breath modulation
- Atmospheric pads with chorus, rhythmic tension pulses (3.2s beats)
- High shimmer layer, convolver reverb
- Fades in over 4s on start; exponential ramp fade-out on stop

---

## Panels & Components
Three-panel layout in `GameInterface`:
- **Left**: `SystemStatusWindow` (stats, mini-map, reputation)
- **Center**: narrative feed (streaming Claude output)
- **Right**: tabbed panel — `SkillDirectory`, `Inventory`, `QuestsPanel`, `RelationsPanel`, `WorldPanel`

Modals: `LevelUpModal`, `SettingsPanel`, `ProgressionLog`
Overlays: `CombatHUD`, `TitleNotification`, `AnimatedBackground`

---

## Notable Conventions
- **No Node integration in renderer** — all file ops go through `window.electronAPI` preload bridge
- **Skills merge** — STATUS WINDOW adds new skills; SKILL DIRECTORY enriches them; usage counts preserved
- **Inventory is authoritative** — each STATUS WINDOW fully replaces inventory state
- **NPC upsert by name** — Claude can update relationships without creating duplicates
- **State anchor not in history** — sent as extra context before player message, never stored
- **Geocoding cached** — hometown coordinates fetched once at creation, stored in `player_state.json`
