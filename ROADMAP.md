# Solo Leveling RPG — Implementation Roadmap
**Last updated: 2026-05-30**

This document is the persistent context for all planned work. Read this at the start of any new session before touching code.

---

## Project Location
`/Users/aresathletics/Downloads/Solo Leveling RPG`

**Run:** `npm start` (webpack watch + Electron)
**Test:** `/usr/local/bin/node node_modules/.bin/jest --no-coverage`
**Build:** `/usr/local/bin/node node_modules/.bin/webpack --mode production`
**Save location:** `~/Library/Application Support/solo-leveling-rpg/saves/`

---

## API & Tech Stack
- **OpenAI gpt-4o** — game GM (NOT Anthropic)
- **DALL-E 3** — portrait generation
- **Electron 30 + React 18 + Webpack 5 + Tailwind CSS**
- **Auth:** `Authorization: Bearer sk-...` (OpenAI key format)

---

## XP Curve (Updated 2026-05-30)
**Formula:** `Math.floor(100 * Math.pow(1.25, level - 1))`

| Level | XP to next |
|-------|-----------|
| 1 | 100 |
| 2 | 125 |
| 3 | 156 |
| 4 | 195 |
| 5 | 244 |
| 6 | 305 |
| 7 | 381 |
| 8 | 476 |
| 9 | 596 |
| 10 | 745 |
| 15 | 2,273 |
| 20 | 5,551 |
| 20+ | ×1.25 per level |

**Kill XP:** `{ E: 100, D: 200, C: 350, B: 550, A: 900, S: 1800 }`
**Quest completion:** 300 XP | **Quest fail:** 150 XP | **Objective:** 120 XP

**Pacing target:** Level up within first dungeon. Level 5 within 1–2 dungeons. Level 10 within 3–4 arcs.

---

## Phase Status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Shadow Army Overhaul | ✅ COMPLETE (2026-05-30) |
| 2 | Relationship & NPC Systems | 🔲 NOT STARTED |
| 3 | Living World & Economy | 🔲 NOT STARTED |
| 4 | Story Architecture | 🔲 NOT STARTED |
| 5 | Loot, Gear & Combat Depth | 🔲 NOT STARTED |
| 6 | Progression & System Depth | 🔲 NOT STARTED |
| 7 | Immersion & Tone Polish | 🔲 NOT STARTED |

---

## PHASE 1 — Shadow Army Overhaul ✅ COMPLETE
**Priority: Highest. Build this first.**

### Confirmed Features
- **A** — Early unlock at level 3–5 (not story-gated to late game)
- **B** — Shadows as active combatants in every combat description (no recovery — they're shadows)
- **C** — Shadow commands as valid player input, Claude processes via `[ SHADOW COMMAND RESULT ]`
- **D** — Shadow capacity tied to INT, always visible in left panel as `DOMAIN: X / Y`
- **E** — Shadow personalities that emerge through deployment (prideful, silent, berserker, etc.)
- **F** — Shadow promotion through deployment patterns (not just time)
- **G** — First extraction as a major story event (full ceremony, audio, unlike anything before)
- **I** — Shadow army as intelligence asset (assign shadows between sessions for recon)
- **K** — Other hunters and civilians react to deployed shadows with fear
- **EXTRACTION** — Dynamic extraction on any fallen enemy the player personally killed, with rank-based failure chance
- **NAMING** — Boss/unique shadows get a naming prompt on extraction; standard mobs extract as their type

### Extraction Mechanic
After player kills an enemy, Claude offers `[ SHADOW EXTRACTION AVAILABLE ]` block.

**Failure chance by rank delta:**
| Entity rank vs player level | Success chance |
|---|---|
| Below player range | 95% |
| Matching player range | 75% |
| One rank above | 45% |
| Two ranks above | 20% |
| Dungeon boss / named entity | 10–15% |
| Unique / monarch-class | 5% |

- Only entities killed by the player can be extracted (not party kills — player is always solo)
- One attempt per entity — failure is permanent
- Failure: one cold System line. No explanation. No retry.

### Army vs Generals Tiers
**Army** — generic mobs (goblins, wolves, soldiers). Auto-extracted under creature type. No naming. Compact roster display.

**Generals** — bosses, dungeon-named entities, unique creatures. Naming modal on successful extraction. Full personality, promotion arc, Commander-level communication. Expanded card display.

### Shadow Capacity (INT-gated)
| INT | Max shadows |
|---|---|
| 1–14 | 2 |
| 15–24 | 4 |
| 25–39 | 6 |
| 40–59 | 9 |
| 60–84 | 13 |
| 85–99 | 18 |
| 100+ | 25 |

Displayed in SystemStatusWindow as `DOMAIN: active / max`.

### Shadow Promotion (Feature F)
Shadows rank up through specific deployment patterns:
- Repeated scouting → Elite
- Repeated player protection → Knight
- Repeated kill execution → Commander
- Uses same usage-count logic as player skills

### Unlock Arc (Feature G — scripted)
1. Level 3–5, HP drops below 15% → `[ ANOMALOUS THRESHOLD DETECTED ]` — extraction interface fragment appears, then vanishes. Looks like a glitch. Player can't act.
2. Shortly after: System issues `[ SHADOW PROTOCOL — COMPATIBILITY CONFIRMED ]` quest. Objective: reach next gate and kill the boss.
3. Boss death: full extraction ceremony. Audio sting fires. Block presentation unlike anything prior. Extracted General acknowledges the player. ShadowArmyPanel fully unlocks.

### New State Fields (per shadow entry)
```js
isGeneral: bool
customName: string | null
deploymentState: 'standby' | 'deployed' | 'assigned'
personality: string          // 'prideful' | 'silent' | 'berserker' | 'cautious' | 'loyal'
promotionXP: number
assignedTask: string | null
extractionRank: string
killCount: number
firstExtractedAt: string     // ISO date
```

### New Master Prompt Blocks
```
[ SHADOW EXTRACTION AVAILABLE ]
[ SHADOW EXTRACTION RESULT ]
[ SHADOW PROTOCOL ]
[ SHADOW COMMAND RESULT ]
[ SHADOW INTEL ]
[ SHADOW ARMY ]              — already exists, extended
```

### Files to Touch (Phase 1)
| File | Change |
|---|---|
| `src/constants/defaultState.js` | Extended shadow schema, shadowCapacity field, shadowProtocolUnlocked flag |
| `src/constants/masterPrompt.js` | New blocks, extraction rules, army/general distinction, INT-capacity table, command rules |
| `src/utils/stateParser.js` | Parsers for all 5 new blocks |
| `src/hooks/useGameState.js` | `attemptExtraction`, `nameGeneral`, `commandShadow`, `assignShadow`, capacity logic |
| `src/components/GameInterface.jsx` | Extraction prompt handling, naming modal trigger |
| `src/components/ShadowArmyPanel.jsx` | Two-tier layout, General cards, Army roster, assignment display |
| `src/utils/promptBuilder.js` | State anchor updated with shadow deployment states and assignments |
| `src/components/ShadowNamingModal.jsx` | NEW — naming prompt for General-tier extractions |

---

## PHASE 2 — Relationship & NPC Systems ✅ COMPLETE
**Prerequisite for: Phase 3 (rival hunter), Phase 4 (family, NPC arcs, betrayal)**

### Features
| # | Feature |
|---|---------|
| 25 | **NPC memory depth** — every NPC remembers specific events, references them in future interactions |
| 26 | **Relationship tier system + romantic depth** — Stranger→Contact→Acquaintance→Trusted→Loyal→Bound; each tier unlocks options; romantic relationships have their own arc depth |
| 27 | **NPC personal arcs** — each significant NPC has their own story in motion, evolves independent of player |
| 28 | **NPC vulnerability and loss** — beloved NPCs face real danger; some can die permanently if player doesn't act |
| 29 | **Betrayal system** — loyalty isn't permanent; NPCs under pressure can turn; trust must be maintained |
| 30 | **Family integration** — character creation family members (if any) exist as meaningful NPCs with stakes |
| 65 | **NPC deaths permanently logged** — codex logs date, circumstance, last words; registry marks "Deceased" |
| 66 | **Isolation mechanic** — hidden Solitude Index bleeds into narrative tone; connections are the counterweight |

### Key Design Points
- NPC state shape extended: `{ relationshipTier, memoryLog[], personalArc, arcStage, isRomantic, vulnerabilityStatus, lastInteraction }`
- Relationship tier affects available dialogue options and NPC willingness to help
- Romantic relationships: slow-burn development, player must invest, have their own tension and risk (NPC can be threatened)
- Solitude Index: never shown to player; affects System voice tone and narrative interiority
- NPC death: once marked deceased, their entry in RelationsPanel shows grayed-out with date and circumstance

---

## PHASE 3 — Living World & Economy ✅ COMPLETE (2026-05-30)
**Makes the world feel alive and financially consequential.**

### Features
| # | Feature |
|---|---------|
| 3 | **Rival hunter** — one specific hunter always one rank above; shows up in gates, Association records, media |
| 13 | **Living city simulation** — hometown changes between sessions; gate activity affects neighborhoods, businesses, safety |
| 17 | **Dungeon overflow events** — ungated dungeons overflow; real city damage, casualties, Association fines |
| 19 | **Real ongoing expenses** — rent, food, medical, equipment maintenance, Association licensing |
| 20 | **Gate contracts and bidding** — high-value gates auctioned; financial standing affects access |
| 23 | **Market price volatility** — magic stone and material prices shift based on in-world supply/demand |
| 40 | **Rank ceremony and social weight** — rank-up is a public event; NPCs react; rival notices; guilds recruit |
| 46 | **Social perception shift** — civilian/hunter/guild reactions change as rank rises |
| 57 | **Hunter social network/registry** — public Association leaderboard; rivals and fallen hunters tracked |
| 68 | **World's growing fear** — power earns fear as much as respect; NPCs who were warm grow uneasy at high rank |

### Key Design Points
- New state fields: `expenses{ rent, food, medical, maintenance }`, `contractHistory[]`, `cityState{ zones[], overflowEvents[] }`
- Rival hunter is a persistent NPC assigned at character creation, tracked in RelationsPanel
- Economy: gold has real drain; income sources include gate contracts, guild stipends, item sales
- Market prices: a simple price index per material type, shifts each "day" in-world

---

## PHASE 4 — Story Architecture ✅ COMPLETE (2026-05-30)
**Long-running narrative threads. Requires phases 2 and 3 populated.**

### Features
| # | Feature |
|---|---------|
| 1 | **Personal story arc from creation answers** — Q1–Q15 answers woven into story events, family, job, geography |
| 4 | **News feed / media layer** — Hunter Association press releases, local news headlines referencing real events |
| 5 | **Hidden truth drip** — every 10 levels, System lets something slip; player slowly realizes the System's true nature |
| 7 | **Flashback fragments** — after trauma/near-death, System issues "Memory Fragment" from before Awakening |
| 15 | **Belief/worldview shifts** — as player learns more, their perspective on hunters, gates, the world evolves |
| 18 | **Historical lore codex** — growing record of the 10 years since gates appeared; famous hunters, lost expeditions |
| 73 | **Time-pressure moral decisions** — forced choices with countdown; not combat — moral/strategic |
| 74 | **Origin question throughline** — mystery seeded from session 1: who built the System, why this player |
| 75 | **Player's legend** — actions compile into a reputation with specific shape; doors open, enemies hesitate |

### Key Design Points
- Character creation answers actively referenced in worldbuilding (job becomes cover story, family becomes stakes)
- News feed: new UI component, append-only log of headlines that reference actual player actions
- Hidden truth drip: System-level event triggered every 10 levels, uses anomaly block type
- Player's legend: a `legendEntries[]` state field appended by significant firsts and achievements

---

## PHASE 5 — Loot, Gear & Combat Depth ✅ COMPLETE (2026-05-30)
**Meaningful items and discovery systems.**

### Features
| # | Feature |
|---|---------|
| 31 | **Named unique items with history** — legendary drops with lore, previous owners, special passives |
| 34 | **Set and synergy bonuses** — matching gear from same gate/lineage unlocks passive combinations |
| 36 | **Loot with follow-up hooks** — some items are story seeds (encrypted key card, shadow soldier identity fragment) |
| 53 | **Secret objectives in dungeons** — every dungeon has hidden layers; finding them rewards significantly |
| 60 | **Monster bestiary** — growing log of every monster type: biology, behavior, weaknesses, gate origin |
| 70 | **Gear aesthetic identity** — player specifies visual signature; NPCs reference it; player develops a look |
| 72 | **Gate discovery and first-clear records** — undiscovered gates; first-clear bonus + named in Association registry |

### Key Design Points
- Named items: `{ name, lore, previousOwner, passiveEffect, isUnique }` fields on inventory items
- Bestiary: new state field `bestiary{}` keyed by monster type, entries added from combat descriptions
- Gear aesthetic: stored in `playerState.gearAesthetic`; referenced in `buildStateAnchor()`
- Set bonuses: tracked in masterPrompt rules + stateParser passive application

---

## PHASE 6 — Progression & System Depth ✅ COMPLETE (2026-05-30)
**Power fantasy deepening and the System's mystery.**

### Features
| # | Feature |
|---|---------|
| 12 | **Stat milestone qualitative breaks** — STR 50, AGI 50, etc. trigger narrative + System acknowledgment |
| 38 | **Skill mutation paths** — at A→S threshold, player chooses mutation direction (permanent, closes other paths) |
| 41 | **Title passive effects** — every title has a mechanical passive, not just cosmetic |
| 42 | **System tier reveals** — at story milestones, System unlocks new functionality previously marked LOCKED |
| 54 | **Achievement codex** — running record of notable firsts, System acknowledgments, milestone events |

### Key Design Points
- Skill mutation: at rank A→S transition, present 2 mutation paths; choice is permanent; stored on skill object
- Title effects: each title in `titles[]` has a corresponding passive in a lookup table
- System tier reveals: new `systemTier` field on playerState (1–5); each tier unlocks new block types/features
- Achievement codex: new state field `achievements[]`, new panel or modal to view

---

## PHASE 7 — Immersion & Tone Polish ✅ COMPLETE (2026-05-30)
**Atmosphere and tonal refinement layered over everything built before.**

### Features
| # | Feature |
|---|---------|
| 47 | **Rest and recovery scenes** — after major gates, recovery beats are narrative events, not just stat resets |
| 48 | **System ignores real-world suffering** — enforced tone: System is cold to grief/exhaustion, always has been |

### Key Design Points
- Rest scenes: System issues a `[ REST ]` block after significant gates with narrative recovery description
- System indifference: masterPrompt tone enforcement — the System's language never acknowledges emotional state

---

## Key Architecture Rules (Never Break These)
1. All file I/O through `window.electronAPI` bridge — never Node `fs` directly in renderer
2. `playerState.xp.toNext` is always recomputed from `xpToNextLevel()` in stateParser — never trust Claude's value
3. State anchor injected into API calls but NEVER written to `conversationHistory`
4. All state setters use functional form `setState((prev) => ...)` — prevents stale closure bugs
5. `const gs = gameState` declared at ~line 524 in GameInterface — `useCallback` deps must reference `gameState` not `gs`
6. Skills merge (upsert by name), inventory replaces, NPCs upsert by name
7. No commits until user says "good to go" — co-author: `Claude Opus 4.6 <noreply@anthropic.com>`
8. Portraits stored as full base64 data URL in `player_state.json`

---

## What Was Built Before This Roadmap
- ✅ Full Electron + React + Webpack app shell
- ✅ 15-question character creation with real-world geocoding
- ✅ OpenAI gpt-4o streaming integration (migrated from Anthropic)
- ✅ DALL-E 3 portrait generation + HunterIDCard component
- ✅ Three-panel game layout (status, narrative, tabbed right panel)
- ✅ Live HP/MP/Stamina/XP bars
- ✅ Skill directory with usage-based rank progression
- ✅ Inventory, quests, world events, NPC relations panels
- ✅ Level-up modal with stat point allocation
- ✅ XP enforcement: 3-layer (masterPrompt + stateParser audit + GameInterface top-up)
- ✅ Auto-chronicle compression every 25 turns
- ✅ Full disk persistence (all state in JSON)
- ✅ Auto-save every response + 5-min interval + on close
- ✅ DailyQuestPanel + ShadowArmyPanel (basic — Phase 1 will overhaul shadow)
- ✅ FloatingNotifications toast system
- ✅ useSystemSting wired into all event triggers (level-up, title, skill, shadow, penalty, daily-complete)
- ✅ Desktop shortcut `.app` on desktop
- ✅ Jest test suite (28 tests, stateParser XP math coverage)
- ✅ XP curve updated to 100×1.25^(level-1) — faster Solo Leveling pace
