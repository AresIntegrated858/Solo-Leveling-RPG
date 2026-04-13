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
};

export const DEFAULT_SKILLS = [];

export const DEFAULT_INVENTORY = {
  equipment: [],
  consumables: [],
  artifacts: [],
  currency: { gold: 0, crystals: 0 },
};

export const DEFAULT_QUESTS = {
  active: [],
  completed: [],
  failed: [],
};

// Each NPC: { name, relationship, status, faction, lastSeen, notes }
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
    question: 'Finally — what city and country do you actually live in? The System anchors your simulation to the real world.',
    placeholder: 'e.g. Chicago, United States / London, UK / Tokyo, Japan...',
    type: 'text',
  },
];
