# Solo Leveling RPG — Session Context for Fresh Claude Chat

## HOW TO USE THIS FILE
Paste the prompt at the bottom of this file into a new Claude chat. Everything the new session needs to know is contained here plus the live CLAUDE.md file in the project root.

---

## Project Location
`/Users/aresathletics/Downloads/Solo Leveling RPG`

## What This Is
A fully-featured Solo Leveling RPG simulation — native Electron desktop app, React 18 UI, Claude/OpenAI API-powered AI game master, real-world geocoded map, full disk persistence. The player creates a hunter character and plays through an AI-generated narrative grounded in actual geography.

**Run**: `npm start` (webpack watch + Electron)
**Build**: `/usr/local/bin/node node_modules/.bin/webpack --mode production`
**Save location**: `~/Library/Application Support/solo-leveling-rpg/saves/`

---

## Tech Stack
- **Electron 30** + **React 18** + **Webpack 5** + **Tailwind CSS 3**
- **OpenAI API** (gpt-4o for game, DALL-E 3 for portraits) — direct fetch from renderer
- **Leaflet + OpenStreetMap Nominatim** — mini-map and geocoding
- **Web Audio API** — procedural ambient synth, zero audio files
- **electron-store** — encrypted local key storage

---

## Changes Made This Session (Complete List)

### 1. XP Enforcement Fix
**Problem**: Claude routinely forgot to award XP for kills and quest completions. User had to manually tell it every time.

**Solution — three-layer fix:**

**`src/utils/stateParser.js`**
- Added `xpToNextLevel(level)` formula: `Math.floor(80 * Math.pow(1.32, level - 1))`
  - Lv1→2: 80 XP, Lv2→3: 105, Lv3→4: 139 … (fast early, scaled late)
- Added XP auto-award constants: `KILL_XP_TABLE`, `QUEST_COMPLETION_XP`, `QUEST_FAIL_XP`, `OBJECTIVE_XP`
- Added `computeExpectedXPGain(parsed, prevState)` — derives expected XP from observable signals:
  - LOOT block magic stones → kill rank → XP table lookup
  - QUEST LOG deltas (new completed/failed quests vs previous state)
  - Objective completions on active quests
- Fixed XP bar shape bug: `getBarField()` returns `{ current, max }` but state expects `{ current, toNext }`. Applied normalization in `applyParsedState`: `toNext: sw.xp.toNext ?? sw.xp.max ?? prev.xp?.toNext`
- Made `toNext` always formula-authoritative — recalculated from `xpToNextLevel()` on every status window parse, never trusting Claude's reported value

**`src/hooks/useGameState.js`**
- Added `addXP(amount)` action — adds XP, cascades level-ups with overflow carry-forward, returns `levelUpInfo` if level-up occurred
- Exposed `addXP` in hook return object

**`src/components/GameInterface.jsx`**
- Added XP audit step after every `applyAPIResponse()` call:
  1. Capture `prevQuests` before applying response
  2. Compute `xpAudit.total` from `computeExpectedXPGain`
  3. Calculate `claudeAwardedThisTurn` from status window delta
  4. If `shortfall > 0`: call `gameState.addXP(shortfall)`, show `+N XP (audit)` notification, trigger level-up modal if cascaded

**`src/constants/masterPrompt.js`**
- Added mandatory `XP Awarded: +N` field to LOOT block format
- Added "XP AWARD ENFORCEMENT — MANDATORY, NON-NEGOTIABLE" section with explicit rules
- XP threshold table matches engine formula exactly

**`src/constants/defaultState.js`**
- Fixed default `xp.toNext` from 100 → 80 (formula gives 80 for level 1)

---

### 2. Portrait + Hunter ID Card Feature

**Q15 added to character creation** (`src/constants/defaultState.js`):
- New question after q14: asks for physical appearance (skin tone, hair, eyes, build, scars, etc.)
- Added `appearance: ''` and `portrait: ''` fields to `DEFAULT_PLAYER_STATE`

**Portrait generation** (`src/components/CharacterCreation.jsx`):
- `generatePortrait(name, appearance)` — calls **DALL-E 3** (`dall-e-3`, `quality: 'hd'`, 1024×1024)
- Returns base64 data URL (`data:image/png;base64,...`) stored in `player_state.json`
- Generated BEFORE the main character init call so it's persisted with initial state
- Non-fatal: card falls back to ASCII placeholder if generation fails
- Prompt tuned for Solo Leveling anime aesthetic: cel-shaded, cold/intense, blue-purple atmospheric shadow, rim lighting, sharp angular face

**`src/components/HunterIDCard.jsx`** (new file):
- Renders at the top of the left panel (above map)
- If `portrait` starts with `data:` → renders `<img>` with `aspect-ratio: 3/4`, `object-fit: cover`, `object-position: center top`
- Falls back to ASCII `PLACEHOLDER_PORTRAIT` for old saves
- Shows name, rank badge (color-coded: S=gold, A=blue, else muted), level
- Stat strip removed (stats already visible below in the panel)

**`src/components/SystemStatusWindow.jsx`**:
- Added `import HunterIDCard from './HunterIDCard'`
- `<HunterIDCard playerState={p} />` mounted at top of scrollable content, above the MINIMAP section
- Removed redundant identity/name/rank block that was previously below the map (card supersedes it)

**`src/App.jsx`**:
- `handleCharacterCreationComplete` accepts 4th param `extras = {}`
- After character creation, reloads full playerState from disk and merges `portrait` + `appearance` into live state (ensures geocoded coords AND portrait both survive)

---

### 3. OpenAI Migration (Anthropic → OpenAI)

**`src/hooks/useClaudeAPI.js`** — complete rewrite, same exported interface:
- `API_URL`: `https://api.openai.com/v1/chat/completions`
- `MODEL`: `gpt-4o`
- Auth: `Authorization: Bearer ${apiKey}` (not `x-api-key`)
- SSE chunk parsing: `choices[0].delta.content` (not `content_block_delta`)
- Retry on 429/503 (not 529)
- `toOpenAIMessages()` helper: flattens Anthropic content-block arrays to strings, prepends `system` message
- `send()` — added `systemPrompt` parameter:
  - `undefined` → use MASTER_PROMPT (default for all game calls)
  - `null` → no system message (for self-contained prompts)
  - `string` → use that string
- Added `generateImage({ apiKey, prompt })` method — calls DALL-E 3, returns `data:image/png;base64,...`
- Exported `generateImage` in hook return object

**`src/index.html`**:
- CSP `connect-src`: replaced `https://api.anthropic.com` with `https://api.openai.com`

**`src/components/SetupScreen.jsx`**:
- Label: `ANTHROPIC API KEY` → `OPENAI API KEY`
- Helper text: "Anthropic API key" → "OpenAI API key"
- Placeholder: `sk-ant-...` → `sk-...`

**`src/App.jsx`** boot sequence:
- Detects stale Anthropic keys (`sk-ant-` prefix) on boot, clears them, redirects to SETUP screen
- Prevents old key from silently bypassing the setup screen

---

## Current Save File State
The existing `player_state.json` in the saves directory has been patched:
- `xp` shape fixed: `{ current: 0, max: 80 }` → `{ current: 0, toNext: 80 }`
- The current character (John Maciel, Lv.1, Fort Collins CO) can resume without issues

---

## Architecture Quick Reference

### Key Files
| File | Role |
|------|------|
| `src/hooks/useClaudeAPI.js` | All OpenAI calls: streaming, non-streaming, image gen, key validation |
| `src/components/GameInterface.jsx` | Core game loop — streaming, XP audit, all panel wiring |
| `src/components/HunterIDCard.jsx` | Portrait + identity card, top of left panel |
| `src/components/SystemStatusWindow.jsx` | Full left panel: bars, stats, traits, rep, map, session |
| `src/components/CharacterCreation.jsx` | 15-question wizard + portrait gen + initial Claude call |
| `src/utils/stateParser.js` | All response block parsers + XP enforcement logic |
| `src/hooks/useGameState.js` | Single source of truth for all game state |
| `src/constants/masterPrompt.js` | GM system prompt — game rules, XP tables, block formats |
| `src/constants/defaultState.js` | Default shapes for all state + CHARACTER_CREATION_QUESTIONS |
| `src/App.jsx` | Screen router: LOADING→SETUP→RESUME/CHARACTER→GAME |

### State Shape: playerState.xp
```js
{ current: number, toNext: number }
// toNext is ALWAYS recomputed from xpToNextLevel(level) in applyParsedState
// Never trust Claude's reported toNext value
```

### Portrait Storage
- Stored in `player_state.json` as `portrait: "data:image/png;base64,..."` (full base64 PNG)
- HunterIDCard detects `data:` prefix → renders `<img>`, otherwise falls back to ASCII placeholder

### OpenAI Key Format
- OpenAI keys start with `sk-` (not `sk-ant-`)
- Boot sequence auto-detects and clears old Anthropic keys

---

## Known Issues / Watch Out For
1. **First launch after this session**: App will show SETUP screen (old Anthropic key was cleared). Enter OpenAI key.
2. **Portrait in current save**: John Maciel's save predates DALL-E portrait generation — HunterIDCard shows ASCII placeholder. New character creation will generate a real DALL-E portrait.
3. **`gs` alias**: In `GameInterface.jsx`, `const gs = gameState` is declared at line ~246 inside the render body. `useCallback` hooks must reference `gameState` (the prop), not `gs`, in dependency arrays to avoid temporal dead zone errors.
4. **State anchor not in history**: The state anchor injected into each API call lives only in `historyForAPI` — it is never written to `conversationHistory`. Keep it that way.

---

## PROMPT FOR NEW CLAUDE CHAT

```
You are continuing work on a Solo Leveling RPG desktop application at:
/Users/aresathletics/Downloads/Solo Leveling RPG

FIRST: Read these two files in full before doing anything else:
1. /Users/aresathletics/Downloads/Solo Leveling RPG/SESSION_CONTEXT.md  ← complete session history
2. /Users/aresathletics/Downloads/Solo Leveling RPG/CLAUDE.md           ← full architecture reference

The SESSION_CONTEXT.md file documents every change made in the previous session (XP enforcement, DALL-E portrait system, OpenAI migration, XP bar fix) including exact file locations, what was changed, and why. CLAUDE.md is the authoritative architecture reference.

Key facts to internalize before touching any code:
- This is an Electron app — all file I/O goes through window.electronAPI bridge, never Node fs directly in renderer
- API is now OpenAI (gpt-4o + DALL-E 3), NOT Anthropic — hook is src/hooks/useClaudeAPI.js
- playerState.xp shape is { current, toNext } — toNext is always recalculated from xpToNextLevel() in stateParser.js, never trusted from API response
- The portrait stored in player_state.json is a full base64 data URL (data:image/png;base64,...)
- Build command: /usr/local/bin/node node_modules/.bin/webpack --mode production

The app is fully functional and building clean. The user will tell you what to work on next.
```
