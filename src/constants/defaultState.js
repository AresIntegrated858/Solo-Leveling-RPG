// Default game state structures used for initialization and resets

export const DEFAULT_PLAYER_STATE = {
  name: '',
  rank: 'E',
  level: 1,
  hp: { current: 100, max: 100 },
  mp: { current: 50, max: 50 },
  stamina: { current: 100, max: 100 },
  stats: {
    STR: 10,
    AGI: 10,
    END: 10,
    INT: 10,
    PER: 10,
    LUCK: 10,
  },
  titles: [],
  traits: [],
  statusEffects: [],
  reputation: {
    hunterAssociation: 'Neutral',
    guilds: 'Unknown',
    civilianPublic: 'Neutral',
  },
  xp: { current: 0, toNext: 100 },
  location: '',
  currentTime: '',
  rawStatusBlock: '',
  hometown: '',
  hometownCoords: null,   // { lat, lng } — set from q14 geocoding
  currentCoords: null,    // { lat, lng } — updated as location changes in-game
  appearance: '',         // free-form aesthetic description from q15
  portrait: '',           // ASCII/Unicode art portrait generated at character creation
  shadowProtocolUnlocked: false,  // true after Phase-1 unlock arc fires (level 3-5, HP < 15%)
  solitudeIndex: 0,               // 0–100, hidden from player; high = isolated; bleeds into System tone
  fearIndex: 0,                   // 0–100, hidden; rises with power; NPCs grow uneasy at high values
  // ── Phase 4 — Story Architecture ─────────────────────────────────────────────
  legendEntries: [],    // [{ entry, timestamp }] notable firsts compiled into the player's reputation
  flashbacks: [],       // [{ title, content, timestamp }] pre-awakening memory fragments
  beliefShifts: [],     // [{ shift, timestamp }] evolving worldview entries
  truthDripCount: 0,    // number of System Anomaly truth drips that have fired (every 10 levels)
  // ── Phase 5 — Loot, Gear & Combat Depth ──────────────────────────────────────
  gearAesthetic: '',    // free-form description of the player's visual combat signature; NPCs reference it
  // ── Phase 6 — Progression & System Depth ─────────────────────────────────────
  statMilestones: [],   // [{ stat, value, title, effect, timestamp }] qualitative threshold breaks
  systemTier: 1,        // 1–5; each tier unlocks new System functionality; starts at 1
  titlePassives: {},    // { [titleName]: passiveEffect } — mechanical passives derived from earned titles
};

export const DEFAULT_SKILLS = [];

export const DEFAULT_INVENTORY = {
  equipment: [],
  consumables: [],
  artifacts: [],
  currency: {
    cash: 0,           // Regular money (won equivalent)
    magicStones: { E: 0, D: 0, C: 0, B: 0, A: 0, S: 0 },
  },
};

export const DEFAULT_QUESTS = {
  active: [],
  completed: [],
  failed: [],
};

// Each NPC — full Phase 2 schema:
//   name           — unique identifier
//   relationship   — legacy label (Newly Met / Friend / Rival / etc.)
//   relationshipTier — 'Stranger' | 'Contact' | 'Acquaintance' | 'Trusted' | 'Loyal' | 'Bound'
//   status         — 'Active' | 'Deceased' | 'Missing' | 'Injured' | 'Unknown'
//   faction        — org/group they belong to
//   lastSeen       — location string
//   notes          — one-sentence current dynamic
//   memoryLog      — string[] of specific events this NPC remembers with the player
//   personalArc    — short description of the NPC's own story thread
//   arcStage       — current stage label for their personal arc
//   isRomantic     — boolean; true if the relationship has romantic depth
//   vulnerabilityStatus — null | 'at risk' | 'in danger' | 'critical' — NPC threat level
//   lastInteraction — ISO date string of most recent meaningful scene
//   deathInfo      — null | { date, circumstance, lastWords } — set when status = Deceased
//   previousName   — used when NPC's real name is revealed mid-story
export const DEFAULT_NPCS = [];

export const DEFAULT_WORLD_STATE = {
  activeEvents: [],
  npcFlags: {},
  factionStates: {},
  gateActivity: [],
};

export const DEFAULT_SESSION_META = {
  sessionNumber: 1,
  totalPlayTime: 0,
  lastSaveTime: null,
  campaignStartDate: null,
  characterAnswers: {},
};

// Daily quest state — reset each real-world day
// penaltyActive: true when the player missed yesterday's deadline
export const DEFAULT_DAILY_QUESTS = {
  issuedDate: null,       // 'YYYY-MM-DD' real-world date quests were issued
  tasks: [],              // [{ description: string, completed: boolean }]
  deadline: null,         // string e.g. "Tonight at midnight"
  allComplete: false,
  bonusXP: 0,
  penaltyActive: false,   // true = penalty zone is active
  penaltyCleared: false,  // true = penalty zone was survived
};

// Shadow Army — list of extracted shadow soldiers
// ARMY tier  — generic mobs (goblins, wolves, soldiers); auto-named by type; compact roster display
// GENERAL tier — bosses/unique creatures; player-named on extraction; full personality/promotion arc
//
// Grade progression: Private → Soldier → Elite → Knight → Commander → General → Marshal → Sovereign
// Promotion driven by deployment pattern (scouting → Elite, protection → Knight, kills → Commander)
//
// Per-soldier schema:
//   isGeneral     — true = General tier (boss/unique); false = Army tier
//   customName    — player-assigned name (Generals only); null = not yet named or Army tier
//   deploymentState — 'standby' | 'deployed' | 'assigned'
//   personality   — 'prideful' | 'silent' | 'berserker' | 'cautious' | 'loyal' (emerges through use)
//   promotionXP   — deployment tally used to advance grade
//   assignedTask  — string description when deploymentState === 'assigned'; null otherwise
//   extractionRank — rank of the entity at time of extraction (E/D/C/B/A/S)
//   killCount     — number of enemies this shadow has killed
//   firstExtractedAt — ISO date string of extraction moment
//   origin        — creature type / dungeon source
//   grade         — current promotion grade
//   status        — 'active' | 'lost' (lost = fell in combat; displayed separately)
export const DEFAULT_SHADOW_ARMY = [];

// ─── Phase 3 — Living World & Economy ────────────────────────────────────────

// Economy state — tracks expenses, contracts, and balance drain
// expenses: recurring monthly/periodic costs in won
// contractHistory: completed and failed gate contracts
// activeContracts: currently available contracts for bidding
export const DEFAULT_ECONOMY = {
  expenses: {
    rent: 0,               // won/month — housing
    food: 0,               // won/week
    medical: 0,            // accumulated bills (injuries)
    maintenance: 0,        // equipment upkeep per gate
    associationLicense: 0, // monthly Hunter Association licensing fee
  },
  contractHistory: [],     // [{ name, rank, reward, status, completedDate }]
  activeContracts: [],     // [{ name, rank, reward, deadline, sponsor, status }]
};

// City state — hometown zones and overflow events
// dangerLevel: overall city threat assessment
// zones: neighborhood-level status (affected by gate activity)
// overflowEvents: ungated dungeon breaches logged here
// gateActivity: active gates in or near the city
export const DEFAULT_CITY_STATE = {
  dangerLevel: 'Low',    // 'Low' | 'Elevated' | 'High' | 'Critical'
  zones: [],             // [{ name, status: 'Safe'|'Disrupted'|'Damaged'|'Quarantined', lastEvent }]
  overflowEvents: [],    // [{ date, zone, damage, casualties, status: 'active'|'resolved' }]
  gateActivity: [],      // [{ zone, rank, status: 'active'|'cleared'|'overflow', date }]
};

// Market state — magic stone and material price index
// stonePrices: baseline market value in won per stone
// priceIndex: 0–200 index (100 = baseline); shifts with supply/demand events
// trend: 'rising' | 'falling' | 'stable' per rank
export const DEFAULT_MARKET = {
  stonePrices: {
    E: 5000, D: 15000, C: 50000, B: 150000, A: 500000, S: 2000000,
  },
  priceIndex: { E: 100, D: 100, C: 100, B: 100, A: 100, S: 100 },
  trend: { E: 'stable', D: 'stable', C: 'stable', B: 'stable', A: 'stable', S: 'stable' },
  lastUpdated: null,
};

// Rival hunter — assigned at character creation; always one rank ahead of the player
// Shows up in gate registries, Association media, and occasionally in the field.
// wins/losses track direct confrontation outcomes.
export const DEFAULT_RIVAL = null;
// Schema: { name, rank, level, style, guild, notes, wins: 0, losses: 0, lastSeen: null }

// Hunter registry — public Association leaderboard snapshot
// entries: [{ name, rank, level, guild, status: 'Active'|'Deceased'|'Missing', notable: bool }]
export const DEFAULT_HUNTER_REGISTRY = [];

// ─── Phase 5 — Loot, Gear & Combat Depth ─────────────────────────────────────

// Bestiary — growing log of every monster type encountered
// Keyed by monster name (lowercase). Entry schema:
//   name        — display name
//   rank        — gate rank where first encountered (E/D/C/B/A/S)
//   origin      — gate or region of origin
//   biology     — physical description / species notes
//   behavior    — combat behavior patterns
//   weaknesses  — known vulnerabilities
//   firstSeen   — ISO timestamp of first encounter
//   killCount   — number of this type the player has killed
export const DEFAULT_BESTIARY = {};

// Gate records — first-clear registry + gate discovery log
// [{ name, rank, location, clearedBy: 'player'|npcName, isFirstClear, bonus, timestamp }]
export const DEFAULT_GATE_RECORDS = [];

// ─── Phase 4 — Story Architecture ────────────────────────────────────────────

// News feed — append-only list of media headlines and Association press releases
// Each entry: { headline, source, date, category: 'association'|'local'|'national'|'hunter' }
export const DEFAULT_NEWS_FEED = [];

// Lore codex — growing record of the world since gates appeared
// Each entry: { title, entry, category: 'history'|'lore'|'event'|'origin', timestamp }
export const DEFAULT_CODEX = [];

// ─── Phase 6 — Progression & System Depth ────────────────────────────────────

// Achievements — running record of notable firsts, milestone events, System acknowledgments
// Each entry: { title, description, category: 'system'|'combat'|'social'|'exploration'|'unique', timestamp }
export const DEFAULT_ACHIEVEMENTS = [];

// Shadow capacity is computed from INT — never stored as static state
// INT 1-14: 2 | 15-24: 4 | 25-39: 6 | 40-59: 9 | 60-84: 13 | 85-99: 18 | 100+: 25
export function shadowCapacityFromINT(int) {
  if (int >= 100) return 25;
  if (int >= 85)  return 18;
  if (int >= 60)  return 13;
  if (int >= 40)  return 9;
  if (int >= 25)  return 6;
  if (int >= 15)  return 4;
  return 2;
}

export const CHARACTER_CREATION_QUESTIONS = [
  {
    id: 'q1',
    question: "What is your Hunter's name?",
    placeholder: 'Enter name...',
    type: 'text',
  },
  {
    id: 'q2',
    question: 'How old are you?',
    placeholder: 'Enter age...',
    type: 'text',
  },
  {
    id: 'q3',
    question: 'What is your gender?',
    placeholder: 'Enter gender...',
    type: 'text',
  },
  {
    id: 'q4',
    question: 'What is your background before awakening? (Who were you? What did you have to lose or gain?)',
    placeholder: 'Describe your background...',
    type: 'textarea',
  },
  {
    id: 'q5',
    question: 'How does your character tend to think and act under pressure?',
    placeholder: 'Describe behavior under pressure...',
    type: 'textarea',
  },
  {
    id: 'q6',
    question: 'What is your risk tolerance — do you calculate every move or act on instinct?',
    placeholder: 'Describe your approach to risk...',
    type: 'textarea',
  },
  {
    id: 'q7',
    question: 'Where does your moral line sit — and how hard is it to cross?',
    placeholder: 'Describe your moral boundaries...',
    type: 'textarea',
  },
  {
    id: 'q8',
    question: 'What is your combat preference — close range, distance, support, stealth, or something else?',
    placeholder: 'Describe combat style...',
    type: 'textarea',
  },
  {
    id: 'q9',
    question: 'Do you prefer to work alone or within a team?',
    placeholder: 'Alone / Team / Depends...',
    type: 'textarea',
  },
  {
    id: 'q10',
    question: 'What do you want in the short term — survival, money, power, recognition?',
    placeholder: 'Describe short-term goals...',
    type: 'textarea',
  },
  {
    id: 'q11',
    question: 'What drives you in the long term — what does winning actually look like for you?',
    placeholder: 'Describe long-term vision...',
    type: 'textarea',
  },
  {
    id: 'q12',
    question: 'What is your single greatest strength as a person and as a Hunter?',
    placeholder: 'Describe your greatest strength...',
    type: 'textarea',
  },
  {
    id: 'q13',
    question: 'What is your single most dangerous weakness?',
    placeholder: 'Describe your greatest weakness...',
    type: 'textarea',
  },
  {
    id: 'q14',
    question: 'What city and country do you actually live in? The System anchors your simulation to the real world.',
    placeholder: 'e.g. Chicago, United States / London, UK / Tokyo, Japan...',
    type: 'text',
  },
  {
    id: 'q15',
    question: 'Finally — describe your physical appearance. Skin tone, hair (color, length, style), eye color and intensity, build, distinguishing features (scars, piercings, etc). The System will render a portrait for your Hunter ID.',
    placeholder: 'e.g. Pale skin, jet-black short cut, ice-blue eyes, lean wiry build, faint scar across left brow...',
    type: 'textarea',
  },
];
