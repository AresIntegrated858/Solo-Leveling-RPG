# Solo Leveling RPG — Claude Code Context

## What This Is
A fully-featured, immersive Solo Leveling RPG simulation built as a native Electron desktop app. The player creates a hunter character through a 14-question registration wizard and plays through a persistent, AI-generated narrative powered by the Claude API. All game state — stats, skills, inventory, quests, NPCs, conversation history — saves to disk automatically and restores on resume.

The simulation is grounded in real-world geography. The player's hometown (q14) is geocoded via OpenStreetMap and anchors all gate locations, Association branches, and world events to their actual city.

---

## Tech Stack
- **Electron 30** — desktop shell (main + preload + renderer processes)
- **React 18** — UI via custom hooks only; no Redux, no Zustand, no Context API
- **Webpack 5 + Babel 7** — build pipeline
- **Tailwind CSS 3** — styling with a dark custom color system (`system-bg`, `system-gold`, `system-red`, `system-blue`, `system-green`, `system-text`, `system-muted`)
- **Web Audio API** — procedural dark ambient synth (no audio files required)
- **Leaflet + OpenStreetMap Nominatim** — interactive mini-map; free geocoding, no API key needed
- **electron-store** — encrypted local storage (API key only)
- **Claude API** — model `claude-sonnet-4-6`, streaming SSE, direct fetch from renderer

---

## How to Run & Build
```bash
npm start                   # dev: webpack watch + electron (hot reload with Ctrl+R)
npm run build:prod          # production build → .dmg/.exe via electron-builder

# Manual webpack rebuild (when npm start is not running):
/usr/local/bin/node node_modules/.bin/webpack --mode production
```
Entry points: `main.js` (Electron), `src/index.jsx` (React root), `src/index.html` (template).

---

## Architecture

### Three-Process Model
```
Renderer (React) ←→ Preload Bridge (contextBridge) ←→ Main Process (Node.js)
```
- **`main.js`** — BrowserWindow lifecycle, all IPC handlers, auto-save on close, file dialog
- **`preload.js`** — Exposes `window.electronAPI.{store, fs, app}` — only interface for disk I/O in renderer
- **`src/`** — All React UI and game logic; Claude API is called directly from renderer (Electron removes CORS restrictions)

### Screen Flow
```
LOADING → SETUP (API key entry) → RESUME or CHARACTER CREATION → GAME
```
- `LOADING`: app boots, loads saves from disk
- `SETUP`: first run; user enters Anthropic API key (stored encrypted via electron-store)
- `RESUME`: save detected; shows last save details with Resume / New Campaign options
- `CHARACTER`: 14-question wizard; q14 geocodes the hometown and sets map anchor
- `GAME`: three-panel layout — the full simulation

---

## File Map

| File | Purpose |
|------|---------|
| `main.js` | Electron main: window, IPC, auto-save on quit |
| `preload.js` | Context bridge: `fs.read/write/list/mkdir/delete`, `store.get/set`, `app.getSavesDir/getArchiveDir/exportDialog` |
| `src/App.jsx` | Root router; manages screen state transitions |
| `src/components/GameInterface.jsx` | **Core game loop** — streaming, state anchor injection, auto-chronicle, auto-save, all panel wiring |
| `src/components/SystemStatusWindow.jsx` | Left panel: HP/MP/Stamina/XP bars, core stats, traits, reputation, mini-map, session timer |
| `src/components/CharacterCreation.jsx` | 14-question wizard; q14 triggers Nominatim geocode; passes answers + initial Claude response to App |
| `src/components/SkillDirectory.jsx` | Right panel tab 1: skills with rank colors, usage bars, rank-up progress |
| `src/components/Inventory.jsx` | Right panel tab 2: equipment / consumables / artifacts |
| `src/components/QuestsPanel.jsx` | Right panel tab 3: active / completed / failed quests |
| `src/components/WorldPanel.jsx` | Right panel tab 4: world events log |
| `src/components/RelationsPanel.jsx` | Right panel tab 5: NPC relationships grouped by category |
| `src/components/LevelUpModal.jsx` | Full-screen modal on level-up; player freely distributes 5 stat points across 6 stats |
| `src/components/CombatHUD.jsx` | Combat overlay during active fights |
| `src/components/TitleNotification.jsx` | Animated toast when a title is unlocked |
| `src/components/ProgressionLog.jsx` | Modal: level history, session stats |
| `src/components/SettingsPanel.jsx` | Modal: API key update, new campaign, export |
| `src/components/SystemMessage.jsx` | Renders a single narrative message (user/assistant/system-briefing/system-error) |
| `src/components/MiniMap.jsx` | Leaflet map embedded in left panel |
| `src/components/AnimatedBackground.jsx` | Subtle animated background effect |
| `src/components/LoadingScreen.jsx` | Boot screen while saves load |
| `src/hooks/useGameState.js` | **Central state store** — all game data, all setter methods |
| `src/hooks/useClaudeAPI.js` | `stream()`, `send()`, `validateKeyStrict()` — SSE streaming with retry on 529 |
| `src/hooks/useAmbientAudio.js` | Procedural dark ambient synth via Web Audio API |
| `src/hooks/useSessionPersistence.js` | Auto-save interval + save-on-close hook |
| `src/utils/fileManager.js` | All disk I/O: `saveAll()`, `loadAll()`, `archiveCurrentSave()`, `clearSaveData()`, `exportCampaignLog()` |
| `src/utils/promptBuilder.js` | `buildStateAnchor()`, `buildChroniclePrompt()`, `buildSessionContext()`, `buildCharacterCreationMessage()`, `capConversationHistory()` |
| `src/utils/stateParser.js` | `parseFullResponse()` → all block parsers → `applyParsedState()` |
| `src/utils/geocoder.js` | OpenStreetMap Nominatim geocoder |
| `src/constants/masterPrompt.js` | **Master system prompt** — all game rules, XP tables, block formats, tone enforcement |
| `src/constants/defaultState.js` | Default values for all state shapes + `CHARACTER_CREATION_QUESTIONS` array |

---

## State Management

`useGameState` is the single source of truth. All state uses functional setters to prevent stale closures.

### State Fields
| Field | Type | Description |
|-------|------|-------------|
| `playerState` | object | name, rank, level, HP/MP/stamina (current+max), stats (STR/AGI/END/INT/PER/LUCK), titles, traits, statusEffects, reputation, xp, location, currentTime, hometown, hometownCoords, currentCoords |
| `skills` | array | `{ name, type, rank, usageCount, description, currentEffect, mutationPotential, riskFactor, growthCondition }` |
| `inventory` | object | `{ equipment[], consumables[], artifacts[], currency: { gold, crystals } }` |
| `quests` | object | `{ active[], completed[], failed[] }` — each quest: `{ name, description, objectives[] }` |
| `npcs` | array | `{ name, relationship, status, faction, lastSeen, notes }` |
| `worldState` | object | `{ activeEvents[], npcFlags{}, factionStates{}, gateActivity[] }` |
| `worldEvents` | array | append-only world event log |
| `titles` | array | string list of earned titles |
| `levelHistory` | array | `{ from, to, timestamp, sessionNumber }` per level-up |
| `reputation` | object | `{ hunterAssociation, guilds, civilianPublic }` |
| `conversationHistory` | array | Claude API message pairs; capped at 60, oldest trimmed |
| `sessionMeta` | object | `{ sessionNumber, totalPlayTime, lastSaveTime, campaignStartDate }` |
| `characterAnswers` | object | q1–q14 answers from character creation |

### Key Methods Exposed by `useGameState`
- `applyAPIResponse(parsed)` — applies all parsed Claude blocks to state using functional setters
- `getFullState()` — serializes everything for disk
- `loadSavedState(saved)` — hydrates all state from disk data
- `addMessage(role, content)` — appends to conversationHistory with cap enforcement
- `setConversationHistory(history)` — direct setter (used by chronicle compression)
- `setPlayerState(fn)` — exposed for external optimistic updates (e.g. stat allocation)
- `incrementSession()` — bumps sessionNumber on resume
- `resetState()` — full reset for new campaign
- `updateSessionTime(ms)` — adds ms to totalPlayTime

---

## Claude API Integration

- **Model**: `claude-sonnet-4-6` | **Max tokens**: 4000
- **Transport**: Direct `fetch()` with SSE streaming; `AbortController` for cancellation
- **Required header**: `'anthropic-dangerous-direct-browser-access': 'true'`
- **Retry logic**: 529 (overloaded) responses retry up to 4 times with exponential backoff (3s → 30s max)

### Three-Layer Prompting System

**Layer 1 — Master Prompt** (system param, every call):
Injected from `src/constants/masterPrompt.js`. Contains:
- Full game rules, Solo Leveling canon lore locks
- XP award table and exact level thresholds (100 → 150 → 225 → 338 → 507 → 761...)
- Rank thresholds: E(1–5), D(6–10), C(11–15), B(16–20), A(21–25), S(26+)
- Skill rank-up thresholds by cumulative uses: E→D: 8, D→C: 20, C→B: 45, B→A: 90, A→S: 180
- Mandatory output block formats (exact header names enforced)
- Mandatory output structure: narrative → status window → NPC update → quest/world → stakes → choices
- Tone enforcement (cinematic, dark, tense, no comedy unless earned)
- Self-correction protocol for drift detection

**Layer 2 — Session Resume Prefix** (on load only):
`buildSessionResumePrefix()` + `buildSessionContext(saved)` — serializes full game state into a structured message that's prepended to conversation history when resuming a session. Includes player stats, skills, inventory, quests, NPCs, world events, and last narrative position.

**Layer 3 — State Anchor** (every API call, NOT stored in history):
`buildStateAnchor(gameState)` — compact current-state block prepended to the user's message content in the API call only. Contains name/rank/level, HP/MP/Stamina/XP, stats, location, skills, inventory, active quests, known NPCs. Ends with mandatory reminder to output `[ NPC UPDATE ]` for named characters and `[ SYSTEM STATUS WINDOW ]` for stat changes.

This anchor is **never written to conversationHistory** — it only exists in the `historyForAPI` array sent to the API. Stored history stays clean.

### Auto-Chronicle Compression (every 25 user turns)
After every 25 user turns, `generateChronicle()` fires:
1. Takes the oldest 20 messages from conversationHistory (skipping the first 2 setup messages)
2. Makes a background Claude API call with `buildChroniclePrompt(messages)` — asks Claude to summarize in second-person prose
3. Replaces those 20 messages with a single compressed chronicle exchange in history
4. Shows `[ CHRONICLE COMPRESSED ]` notification in the narrative feed

Controlled by `userTurnRef` (count) and `isChroniclingRef` (lock to prevent concurrent calls).

---

## Mandatory Output Blocks (parsed by `stateParser.js`)

All blocks use regex-based detection that catches Claude's common variants:

| Block | Parser Function | Trigger | Effect |
|-------|----------------|---------|--------|
| `[ SYSTEM STATUS WINDOW ]` | `parseStatusWindow()` | After any stat change | Authoritative replace of HP/MP/Stamina/XP/stats/skills/inventory/reputation/location |
| `[ LEVEL UP DETECTED ]` | `parseLevelUp()` | On XP threshold crossed | Opens `LevelUpModal`; player distributes 5 stat points |
| `[ SKILL DIRECTORY ]` | `parseSkillDirectory()` | Skill gained or changed | Enriches skill with rank, effects, uses count; upserts by name |
| `[ NPC UPDATE ]` | `parseNPCUpdate()` | Named NPC appears or changes | Upserts NPC by name into `npcs` array; populates RelationsPanel |
| `[ QUEST LOG ]` | `parseQuestLog()` | Quest assigned/updated/resolved | Upserts quests by name; updates objectives |
| `[ WORLD EVENT ]` | `parseWorldEvent()` | Major world-level event | Appends to `worldEvents` log |
| `[ COMBAT INTERFACE ]` | `parseCombatInterface()` | Active combat | Shows `CombatHUD` overlay |
| `[ TITLE UNLOCKED ]` | `parseTitleUnlocked()` | Title earned | Shows `TitleNotification`; adds to titles list |

**Parser resilience**: `detectBlocks()` uses intentionally broad regexes to catch all variant block names Claude may output. Each parse function tries multiple known variant headers. `parseNPCUpdate()` scans the entire response for ALL `[ NPC UPDATE ]` occurrences (Claude sometimes outputs one per NPC).

---

## Leveling System

### XP Economy
- XP tracked in `playerState.xp.current` and `playerState.xp.toNext`
- Formula: `xpToNextLevel(level) = Math.floor(100 * Math.pow(1.5, level - 1))`
- XP overflows — does not reset to zero on level-up, carries remainder forward

### Level-Up Flow
1. Claude detects XP threshold crossed → outputs `[ LEVEL UP DETECTED ]`
2. Claude **stops narrative** — no status window yet
3. `LevelUpModal` opens: player sees level transition, vital increases (HP/MP/Stamina max), and distributes 5 stat points freely across STR/AGI/END/INT/PER/LUCK
4. On confirm: `handleStatAllocation()` optimistically applies stats to `playerState`, sends `[ STAT ALLOCATION ]` message to Claude
5. Claude outputs updated `[ SYSTEM STATUS WINDOW ]` and continues narrative

### Skill Progression
Usage-based ranking tracked by `usageCount` field on each skill object:
- E→D: 8 uses | D→C: 20 | C→B: 45 | B→A: 90 | A→S: 180
- Rank-ups shown via `UsageBar` component in `SkillDirectory`

### Story-Gated Unlocks
New abilities unlock only through specific narrative events — never freely granted. Each unlock is tied to something the player survives or masters (e.g. Shadow Extraction only after surviving a dungeon where shadow entities manifest).

---

## Panels & UI

### Layout
Three-panel layout inside `GameInterface.jsx`:

**Left** — `SystemStatusWindow` (280px fixed):
- HP / MP / Stamina bars with current/max values
- XP bar (gold) showing progress to next level
- Core stats grid: STR, AGI, END, INT, PER, LUCK
- Traits list
- Reputation: Hunter Association / Guilds / Civilian Public
- Leaflet mini-map with current location marker
- Session timer and session number

**Center** — Narrative feed (flex-1):
- Streaming Claude output via `SystemMessage` components
- System briefing (gold), system errors (red)
- Input textarea + SEND button
- `[ SYSTEM PROCESSING... ]` indicator while streaming
- `CombatHUD` overlay during combat

**Right** — Tabbed panel (260px fixed), 5 tabs:
1. `SKILLS` — `SkillDirectory`: skill cards with rank badge, colored border, usage bar
2. `INVENTORY` — `Inventory`: equipment / consumables / artifacts / currency
3. `QUESTS` — `QuestsPanel`: active (with objectives) / completed / failed
4. `WORLD` — `WorldPanel`: world events log
5. `NPCS` — `RelationsPanel`: NPCs grouped as HOSTILE / RIVALS / PERSONAL / FAMILY / ALLIES / CONTACTS; click to expand details

**Bottom bar**: Hunter name, level/rank, session number, save status, SAVE / PROGRESSION / SETTINGS buttons

### Modals
- `LevelUpModal` — full-screen stat allocation on level-up
- `TitleNotification` — animated toast for title unlocks
- `ProgressionLog` — level history, session stats
- `SettingsPanel` — API key update, new campaign, export campaign log

---

## Persistence

Save location: `~/Library/Application Support/solo-leveling-rpg/saves/`
Archive location: `~/Library/Application Support/solo-leveling-rpg/archive/`

All saves are JSON written via Electron IPC — never `localStorage`:

```
saves/
├── player_state.json       — full playerState object
├── skills.json             — skills array
├── inventory.json          — inventory object
├── quests.json             — quests object (active/completed/failed)
├── npcs.json               — npcs array
├── titles.json             — titles array
├── world_events.json       — worldEvents array
├── level_history.json      — levelHistory array
├── reputation.json         — reputation object
├── conversation_history.json
├── character_answers.json
├── session_meta.json
├── latest_save.json        — resume screen metadata (name, level, rank, savedAt, narrativeSummary)
└── session_log/            — timestamped checkpoint per save event
```

`saveAll()` and `loadAll()` in `fileManager.js` handle the full bundle in parallel. New campaign = `archiveCurrentSave()` copies everything to a timestamped archive subdirectory before `clearSaveData()`.

---

## Audio
Procedural synthesis via Web Audio API — zero audio files:
- Sub-bass drones at D1/D2/A1 frequencies with LFO breath modulation
- Atmospheric pads with chorus effect
- Rhythmic tension pulses on 3.2s intervals
- High shimmer layer
- Convolver reverb
- 4-second fade-in on game start; exponential ramp fade-out on stop

---

## Key Conventions & Rules — Always Follow

1. **No Node in renderer** — all file ops go through `window.electronAPI` preload bridge only
2. **Inventory is authoritative** — each `[ SYSTEM STATUS WINDOW ]` fully replaces inventory state. Items are tracked via the block, never inferred from narrative text
3. **Skills merge, not replace** — `[ SYSTEM STATUS WINDOW ]` does a lightweight upsert (name + type); `[ SKILL DIRECTORY ]` enriches with full data. Usage counts are always preserved
4. **NPC upsert by name** — `name` field is the key; updates merge fields, never create duplicates
5. **State anchor NOT in history** — the anchor is injected into the API call's `historyForAPI` array but the stored `conversationHistory` only contains clean user/assistant messages
6. **All setters functional** — `applyAPIResponse` and all state updaters use `setState((prev) => ...)` form to prevent stale closure bugs
7. **`gs` alias is declared at line 246** — it is `const gs = gameState` inside the GameInterface render body. Any `useCallback` that references game state must use `gameState` (the prop), not `gs`, in its dependency array to avoid temporal dead zone errors
8. **Geocoding cached** — hometown coordinates fetched once during character creation (q14), stored in `player_state.json`. Never re-fetched
9. **Block headers are exact** — the master prompt enforces a hard list of permitted headers. The parser also catches common variants. Do not invent new block headers
10. **`[ NPC UPDATE ]` is mandatory** — as of the latest masterPrompt, NPC tracking is part of the MANDATORY OUTPUT STRUCTURE (step 3), not optional. The parser also scans for multiple blocks per response

---

## Claude API — Block Header Reference

### Permitted headers (master prompt enforced):
```
[ SYSTEM STATUS WINDOW ]
[ COMBAT INTERFACE ]
[ LEVEL UP DETECTED ]
[ SKILL DIRECTORY ]
[ TITLE UNLOCKED ]
[ QUEST LOG ]
[ WORLD EVENT ]
[ NPC UPDATE ]
[ SYSTEM NOTICE ]
[ SYSTEM FAILURE ]
```

### Explicitly banned (Claude is told never to use):
```
[ SYSTEM STATUS UPDATE ]   [ STATUS UPDATE ]   [ ITEM ACQUIRED ]
[ SYSTEM ALERT ]           [ STATUS WINDOW ]   (any other variant)
```

---

## The System — Permanent Lore Rules (Every Playthrough)

These rules are absolute and must never be violated regardless of character, city, or story direction:

- **The player is the only hunter in the world who can level up.** All other hunters have static, locked abilities from the moment of awakening. Growth after awakening is impossible for everyone except the player.
- **The System is completely secret.** No NPC, guild master, Association official, or any other character knows it exists. They may notice the player getting stronger but will rationalize it as talent, training, or luck — never the truth.
- **System UI is invisible to everyone but the player.** Status windows, level-up alerts, skill notifications — the player sees them; no one else does. Never describe them as visible to NPCs.
- **No NPC ever correctly identifies the System.** Comments on the player's growth must come from ignorance — impressed, confused, suspicious — but never correct.
- **This makes the player uniquely dangerous long-term.** Veterans are powerful now, but their ceiling is fixed. The player's ceiling is unknown.

---

## Player Goals & Design Intent

The player IS the solo hunter — the only one in the world who can level up (mirroring Jin-Woo's architecture from Solo Leveling canon). The design intent is:
- **Fast early arc**: Power growth from E-rank to meaningful strength should feel quick but earned and rewarding
- **Player agency**: Stats distributed by the player (not random); choices drive the narrative
- **Usage-based skill mastery**: Skills deepen through actual use, not just time
- **Story-gated unlocks**: Abilities like Shadow Extraction unlock only when the player earns them through narrative events — never freely given
- **Real-world grounding**: The simulation is anchored to the player's actual city; gates, guilds, Association branches are placed realistically
- **Persistent consequences**: Injuries compound, reputation shifts, NPC relationships evolve — the world doesn't wait
- **Cinematic, dark tone**: No comfort, no warmth from the System. High pressure, consequence-focused, immersive

---

## What Has Been Built (Complete Feature List)

- [x] 14-question character creation wizard with real-world geocoding
- [x] Full streaming Claude API integration with SSE and retry logic
- [x] Three-panel game layout (left stats, center narrative, right tabs)
- [x] Live HP/MP/Stamina/XP bars updating from every Claude response
- [x] Core stats display (STR/AGI/END/INT/PER/LUCK)
- [x] Skill directory with rank colors, usage bars, rank-up progress tracking
- [x] Inventory panel (equipment / consumables / artifacts / currency)
- [x] Quest panel (active with objectives / completed / failed)
- [x] World events log panel
- [x] NPC Relationships panel with grouped categories and expandable cards
- [x] Level-up modal with free stat point allocation (5 points per level)
- [x] Usage-based skill ranking system
- [x] Story-gated ability unlock system
- [x] XP bar and progression tracking
- [x] Title system with animated notification
- [x] Combat HUD overlay
- [x] Session resume with full state restoration
- [x] Auto-save every 5 minutes + on every Claude response + on app close
- [x] State Anchor injection (drift-proofing layer 1)
- [x] Auto-Chronicle compression every 25 turns (drift-proofing layer 2)
- [x] Procedural ambient audio
- [x] Interactive Leaflet mini-map
- [x] Settings panel (API key, new campaign, export)
- [x] Progression log modal
- [x] Full disk persistence for all state including quests and NPCs
- [x] New campaign → archive → fresh start flow
