// State Parser — scans Claude API responses for System UI blocks
// Returns structured diff objects. Never crashes on malformed input.

// ─── XP Curve ────────────────────────────────────────────────────────────────
// Returns XP needed to advance FROM the given level.
// Tuned for a Solo Leveling pace: fast early levels (E→D feels rewarding), steady mid-game,
// scaled-but-not-grindy late game. Lv1→2 = 80 XP, Lv5→6 ≈ 240 XP, Lv10→11 ≈ 970, Lv20→21 ≈ 16K.
export function xpToNextLevel(level) {
  // Faster Solo Leveling pace: Lv1→2 = 100 XP, doubles roughly every 4 levels.
  // Formula: 100 × 1.25^(level-1). Significantly faster than prior 80×1.32 curve.
  return Math.floor(100 * Math.pow(1.25, level - 1));
}

// ─── XP Auto-Award Tables (client-side enforcement) ──────────────────────────
// Mid-range values from the masterPrompt XP table. Used by computeExpectedXPGain
// to detect when Claude under-awarded XP for kills, quests, or objectives so the
// engine can top up the shortfall. Must roughly track the masterPrompt ranges.
export const KILL_XP_TABLE       = { E: 100, D: 200, C: 350, B: 550, A: 900, S: 1800 };
export const QUEST_COMPLETION_XP = 300; // mid of 200–350 range
export const QUEST_FAIL_XP       = 150; // partial reward for surviving a failed contract
export const OBJECTIVE_XP        = 120; // mid of 100–140 range

// Skill rank-up threshold (cumulative uses)
export const SKILL_RANK_THRESHOLDS = { E: 8, D: 20, C: 45, B: 90, A: 180 };
export const SKILL_RANK_ORDER = ['E', 'D', 'C', 'B', 'A', 'S'];
export function getSkillRankFromUses(uses) {
  if (uses >= 180) return 'S';
  if (uses >= 90)  return 'A';
  if (uses >= 45)  return 'B';
  if (uses >= 20)  return 'C';
  if (uses >= 8)   return 'D';
  return 'E';
}

// ─── Block Detection ─────────────────────────────────────────────────────────
// Intentionally broad — catches every variant Claude might output despite prompt rules.

export function detectBlocks(text) {
  // Strip markdown wrappers GPT-4o uses around block headers before detection
  const t = text
    .replace(/\*{1,2}(\[\s*[A-Z][A-Z\s\[\]]+\])\*{1,2}/g, '$1')
    .replace(/#{1,3}\s*(\[\s*[A-Z][A-Z\s\[\]]+\])/g, '$1');
  // Rebind text to cleaned version for all tests below
  text = t;
  return {
    // Catches: SYSTEM STATUS WINDOW, SYSTEM STATUS UPDATE, STATUS UPDATE, STATUS WINDOW, SYSTEM STATUS
    hasStatusWindow: /\[\s*(?:SYSTEM\s+)?STATUS(?:\s+(?:WINDOW|UPDATE))?\s*\]/i.test(text)
      || /\[\s*SYSTEM\s+STATUS\s*\]/i.test(text),
    hasCombat: /\[\s*COMBAT\s+(?:INTERFACE|HUD|STATUS)\s*\]/i.test(text),
    hasLevelUp: /\[\s*LEVEL[\s-]+UP(?:\s+DETECTED)?\s*\]/i.test(text),
    hasTitleUnlocked: /\[\s*TITLE(?:\s+UNLOCKED)?\s*\]/i.test(text),
    hasSkillDirectory: /\[\s*SKILL(?:\s+DIRECTORY)?\s*\]/i.test(text),
    hasSystemNotice: /\[\s*SYSTEM\s+(?:NOTICE|ALERT|MESSAGE)\s*\]/i.test(text),
    hasSystemFailure: /\[\s*SYSTEM\s+FAILURE\s*\]/i.test(text),
    hasItemAcquired: /\[\s*ITEM(?:S)?\s+(?:ACQUIRED|RECEIVED|OBTAINED|ADDED|UPDATE)\s*\]/i.test(text),
    hasQuestLog: /\[\s*QUEST(?:\s+LOG)?\s*\]/i.test(text),
    hasWorldEvent: /\[\s*WORLD\s+(?:EVENT|STATE|UPDATE)\s*\]/i.test(text),
    hasNPCUpdate: /\[\s*NPC(?:\s+UPDATE)?\s*\]/i.test(text),
    hasNPCArc: /\[\s*NPC\s+ARC\s*\]/i.test(text),
    hasCityUpdate: /\[\s*CITY\s+UPDATE\s*\]/i.test(text),
    hasMarketUpdate: /\[\s*MARKET\s+UPDATE\s*\]/i.test(text),
    hasContractAvailable: /\[\s*CONTRACT\s+AVAILABLE\s*\]/i.test(text),
    hasContractResult: /\[\s*CONTRACT\s+RESULT\s*\]/i.test(text),
    hasRivalSighting: /\[\s*RIVAL\s+SIGHTING\s*\]/i.test(text),
    hasExpenseNotice: /\[\s*EXPENSE\s+NOTICE\s*\]/i.test(text),
    hasRankCeremony: /\[\s*RANK\s+CEREMONY\s*\]/i.test(text),
    hasHunterRegistry: /\[\s*HUNTER\s+REGISTRY\s*\]/i.test(text),
    hasDailyQuest: /\[\s*DAILY\s+QUEST\s*\]/i.test(text),
    hasDailyQuestUpdate: /\[\s*DAILY\s+QUEST\s+UPDATE\s*\]/i.test(text),
    hasPenaltyZone: /\[\s*PENALTY\s+ZONE\s*\]/i.test(text),
    hasShadowArmy: /\[\s*SHADOW\s+ARMY\s*\]/i.test(text),
    hasShadowProtocol: /\[\s*SHADOW\s+PROTOCOL\s*\]/i.test(text),
    hasShadowExtractionAvailable: /\[\s*SHADOW\s+EXTRACTION\s+AVAILABLE\s*\]/i.test(text),
    hasShadowExtractionResult: /\[\s*SHADOW\s+EXTRACTION\s+RESULT\s*\]/i.test(text),
    hasShadowCommandResult: /\[\s*SHADOW\s+COMMAND\s+RESULT\s*\]/i.test(text),
    hasShadowIntel: /\[\s*SHADOW\s+INTEL\s*\]/i.test(text),
    hasLoot: /\[\s*LOOT\s*\]/i.test(text),
    // Phase 5 — Loot, Gear & Combat Depth
    hasBestiaryUpdate: /\[\s*BESTIARY\s+UPDATE\s*\]/i.test(text),
    hasUniqueItem: /\[\s*UNIQUE\s+ITEM\s*\]/i.test(text),
    hasSetBonus: /\[\s*SET\s+BONUS\s*\]/i.test(text),
    hasGateRecord: /\[\s*GATE\s+RECORD\s*\]/i.test(text),
    hasGearAesthetic: /\[\s*GEAR\s+AESTHETIC\s*\]/i.test(text),
    // Phase 4 — Story Architecture
    hasNewsFeed: /\[\s*NEWS\s+FEED\s*\]/i.test(text),
    hasMemoryFragment: /\[\s*MEMORY\s+FRAGMENT\s*\]/i.test(text),
    hasBeliefShift: /\[\s*BELIEF\s+SHIFT\s*\]/i.test(text),
    hasSystemAnomaly: /\[\s*SYSTEM\s+ANOMALY\s*\]/i.test(text),
    hasLegendEntry: /\[\s*LEGEND\s+ENTRY\s*\]/i.test(text),
    hasLoreCodex: /\[\s*LORE\s+CODEX\s*\]/i.test(text),
    hasMoralDecision: /\[\s*MORAL\s+DECISION\s*\]/i.test(text),
    hasOriginClue: /\[\s*ORIGIN\s+CLUE\s*\]/i.test(text),
    // Phase 7 — Immersion & Tone Polish
    hasRest: /\[\s*REST\s*\]/i.test(text),
    // Phase 6 — Progression & System Depth
    hasStatMilestone: /\[\s*STAT\s+MILESTONE\s*\]/i.test(text),
    hasSkillMutation: /\[\s*SKILL\s+MUTATION\s*\]/i.test(text),
    hasSystemTierUnlock: /\[\s*SYSTEM\s+TIER\s+UNLOCK\s*\]/i.test(text),
    hasAchievement: /\[\s*ACHIEVEMENT\s+UNLOCKED\s*\]/i.test(text),
  };
}

// ─── Extract Block Content ───────────────────────────────────────────────────

function extractBlock(text, startPattern) {
  try {
    // Strip markdown formatting that GPT-4o sometimes wraps blocks in
    // e.g. **[ SYSTEM STATUS WINDOW ]** or ### [ COMBAT INTERFACE ]
    const cleaned = text
      .replace(/\*{1,2}(\[\s*[A-Z][A-Z\s\[\]]+\])\*{1,2}/g, '$1')
      .replace(/#{1,3}\s*(\[\s*[A-Z][A-Z\s\[\]]+\])/g, '$1');

    const startRe = new RegExp(startPattern, 'i');
    const startIdx = cleaned.search(startRe);
    if (startIdx === -1) return null;

    const afterStart = cleaned.slice(startIdx);

    // End at the next bracketed system block header (but not the start itself)
    const nextBlockRe = /\n\[\s*[A-Z][A-Z\s]+\]/;
    const nextMatch = afterStart.slice(10).search(nextBlockRe);
    const endIdx = nextMatch !== -1 ? nextMatch + 10 : afterStart.length;

    return afterStart.slice(0, endIdx).trim();
  } catch (err) {
    console.error('stateParser: extractBlock error', err);
    return null;
  }
}

// ─── Flexible value extractors ───────────────────────────────────────────────

function getField(block, key) {
  // Match "Key: value" — handles em-dashes, numbers, text
  // Stops at " | " separator so multi-field lines like "Location: X | Time: Y" parse cleanly
  const re = new RegExp(`(?:^|\\s|\\|)\\s*${key}:\\s*([^\\n|]+?)(?=\\s*\\||\\n|$)`, 'im');
  const m = block.match(re);
  if (!m) return null;
  const val = m[1].trim();
  // Treat placeholder dashes as null
  if (val === '—' || val === '-' || val === '') return null;
  return val;
}

function getBarField(block, key) {
  // Match "Key: 85 / 100" or "Key: 85/100" — very flexible
  const re = new RegExp(`${key}:\\s*(\\d+)\\s*[/]\\s*(\\d+)`, 'im');
  const m = block.match(re);
  if (!m) return null;
  return { current: parseInt(m[1], 10), max: parseInt(m[2], 10) };
}

function getStatField(block, key) {
  // Match "STR: 15" possibly inline with others
  const re = new RegExp(`\\b${key}:\\s*(\\d+)`, 'im');
  const m = block.match(re);
  return m ? parseInt(m[1], 10) : null;
}

function getListField(block, key) {
  // Match "Key:\n- item1\n- item2" (multi-line bulleted form)
  const sectionRe = new RegExp(`${key}:\\s*\\n((?:[\\s]*[-–•·][^\\n]+\\n?)+)`, 'im');
  const m = block.match(sectionRe);
  if (m) {
    return m[1]
      .split('\n')
      .map((l) => l.replace(/^[\s\-–•·]+/, '').trim())
      .filter((l) => l && l !== '—' && l !== '-' && l !== 'None');
  }
  // Fallback: "Key: value, value, value" inline form
  const inline = new RegExp(`${key}:\\s*(.+)`, 'im');
  const im = block.match(inline);
  if (im) {
    const val = im[1].trim();
    if (val === '—' || val === '-' || val === 'None' || val === '') return [];
    // Split on commas for inline lists
    return val.split(',').map((s) => s.trim()).filter((s) => s && s !== '—' && s !== '-' && s !== 'None');
  }
  return [];
}

// ─── Parse Status Window — tries all known Claude block name variants ────────

export function parseStatusWindow(text) {
  try {
    // Try each known variant in priority order
    const block =
      extractBlock(text, '\\[\\s*SYSTEM\\s+STATUS\\s+WINDOW\\s*\\]') ||
      extractBlock(text, '\\[\\s*SYSTEM\\s+STATUS\\s+UPDATE\\s*\\]') ||
      extractBlock(text, '\\[\\s*SYSTEM\\s+STATUS\\s*\\]') ||
      extractBlock(text, '\\[\\s*STATUS\\s+UPDATE\\s*\\]') ||
      extractBlock(text, '\\[\\s*STATUS\\s+WINDOW\\s*\\]');
    if (!block) return null;

    const hp = getBarField(block, 'HP');
    const mp = getBarField(block, 'MP');
    const stamina = getBarField(block, 'Stamina');
    const xp = getBarField(block, 'XP');

    // Reputation — handle both old multi-line and new compact "Assoc: X | Guilds: Y | Civilian: Z" formats
    const repLineMatch = block.match(/Reputation:\s*(.+)/i);
    let repAssocStr = null, repGuildsStr = null, repCivilianStr = null;
    if (repLineMatch) {
      const segs = repLineMatch[1].split(/\s*\|\s*/);
      for (const seg of segs) {
        const am = seg.match(/^(?:Hunter\s+)?Assoc(?:iation)?\s*:\s*(.+)/i);
        if (am) { repAssocStr = am[1].trim(); continue; }
        const gm = seg.match(/^Guilds?\s*:\s*(.+)/i);
        if (gm) { repGuildsStr = gm[1].trim(); continue; }
        const cm = seg.match(/^Civilian(?:\s+(?:Public|Population))?\s*:\s*(.+)/i);
        if (cm) { repCivilianStr = cm[1].trim(); continue; }
      }
    }
    // Fallback to old multi-line style
    if (!repAssocStr) {
      const m = block.match(/Hunter\s+Association(?:\s*\([^)]*\))?\s*:\s*(.+)/i);
      if (m) repAssocStr = m[1].trim();
    }
    if (!repGuildsStr) {
      const m = block.match(/^\s*Guilds?(?:\s*\([^)]*\))?\s*:\s*(.+)/im);
      if (m) repGuildsStr = m[1].trim();
    }
    if (!repCivilianStr) {
      const m = block.match(/Civilian\s+(?:Public|Population)(?:\s*\([^)]*\))?\s*:\s*(.+)/i);
      if (m) repCivilianStr = m[1].trim();
    }
    const repAssocMatch = repAssocStr ? [null, repAssocStr] : null;
    const repGuildsMatch = repGuildsStr ? [null, repGuildsStr] : null;
    const repCivilianMatch = repCivilianStr ? [null, repCivilianStr] : null;

    const levelVal = getField(block, 'Level');

    // ── Active Skills ── parse "- Skill Name (Type, Rank: X)" entries
    const rawActiveSkills = getListField(block, 'Active Skills');
    const activeSkills = rawActiveSkills
      .filter((s) => s && s !== 'None' && s !== '—')
      .map((s) => {
        // Format: "Skill Name (Active, Rank: D)" or "Skill Name (Active)"
        const fullMatch = s.match(/^(.+?)\s*\(([^,)]+)(?:,\s*Rank:\s*([A-Z]))?\)\s*$/i);
        if (fullMatch) {
          return {
            name: fullMatch[1].trim(),
            type: fullMatch[2].trim(),
            rank: fullMatch[3] ? fullMatch[3].toUpperCase() : null,
          };
        }
        // Fallback: bare name
        return { name: s.trim(), type: 'Unknown', rank: null };
      });

    // ── Inventory ── parse Equipment and Consumables sections as item objects
    const parseItemList = (rawList) =>
      rawList
        .filter((s) => s && s !== 'None' && s !== '—' && s !== '-')
        .map((s) => {
          // "Item Name (notes/description)" → split on first paren
          const parenMatch = s.match(/^(.+?)\s*\((.+)\)\s*$/);
          if (parenMatch) return { name: parenMatch[1].trim(), description: parenMatch[2].trim() };
          return { name: s.trim(), description: '' };
        });

    const equipment = parseItemList(getListField(block, 'Equipment'));
    const consumables = parseItemList(getListField(block, 'Consumables'));
    const artifacts = parseItemList(getListField(block, 'Artifacts'));

    // Currency: detect "$XX cash" or "XX gold" in equipment list (legacy fallback)
    let currency = null;
    const allItems = [...equipment, ...consumables];
    const cashItem = allItems.find((i) => /\$\d+|\bcash\b|\bgold\b|\bcrystals?\b/i.test(i.name));
    if (cashItem) {
      const goldMatch = cashItem.name.match(/\$?(\d+)/);
      if (goldMatch) currency = { gold: parseInt(goldMatch[1], 10), crystals: 0 };
    }

    // ── Currency ── parse "Currency:\n- Cash: X won\n- Magic Stones: E×N D×N..."
    let parsedCurrency = null;
    const currencyBlockMatch = block.match(/Currency:\s*\n((?:- .+\n?)+)/i);
    if (currencyBlockMatch) {
      const currLines = currencyBlockMatch[1].split('\n').map(l => l.replace(/^[-\s]+/, '').trim()).filter(Boolean);
      let cash = 0;
      const magicStones = { E: 0, D: 0, C: 0, B: 0, A: 0, S: 0 };
      for (const line of currLines) {
        // Cash: 45,200 won  or  Cash: $12,000
        const cashMatch = line.match(/^Cash:\s*([0-9,]+)/i);
        if (cashMatch) { cash = parseInt(cashMatch[1].replace(/,/g, ''), 10) || 0; continue; }
        // Magic Stones: E×12 D×2 C×1  (various formats)
        const stoneMatch = line.match(/^Magic\s+Stones?:/i);
        if (stoneMatch) {
          const stoneStr = line.replace(/^Magic\s+Stones?:/i, '');
          const ranks = ['E', 'D', 'C', 'B', 'A', 'S'];
          for (const rank of ranks) {
            // Matches "E×12" or "E-rank ×12" or "E: 12" or "E x12"
            const m = stoneStr.match(new RegExp(`${rank}(?:-rank)?\\s*[×x:]\\s*(\\d+)`, 'i'));
            if (m) magicStones[rank] = parseInt(m[1], 10) || 0;
          }
          continue;
        }
      }
      parsedCurrency = { cash, magicStones };
    }

    return {
      rawBlock: block,
      name: getField(block, 'Name'),
      rank: getField(block, 'Rank'),
      level: levelVal ? parseInt(levelVal, 10) : null,
      hp,
      mp,
      stamina,
      stats: {
        STR: getStatField(block, 'STR'),
        AGI: getStatField(block, 'AGI'),
        END: getStatField(block, 'END'),
        INT: getStatField(block, 'INT'),
        PER: getStatField(block, 'PER'),
        LUCK: getStatField(block, 'LUCK'),
      },
      titles: getListField(block, 'Titles'),
      traits: getListField(block, 'Traits'),
      statusEffects: getListField(block, 'Status Effects'),
      activeSkills,
      equipment,
      consumables,
      artifacts,
      currency: parsedCurrency || currency,
      location: getField(block, 'Current Location') || getField(block, 'Location'),
      currentTime: getField(block, 'Current Time') || getField(block, 'Time'),
      xp,
      reputationHunterAssociation: repAssocMatch ? repAssocMatch[1].trim() : null,
      reputationGuilds: repGuildsMatch ? repGuildsMatch[1].trim() : null,
      reputationCivilian: repCivilianMatch ? repCivilianMatch[1].trim() : null,
    };
  } catch (err) {
    console.error('stateParser: parseStatusWindow error', err);
    return null;
  }
}

// ─── Parse Combat Interface ──────────────────────────────────────────────────

export function parseCombatInterface(text) {
  try {
    const block =
      extractBlock(text, '\\[\\s*COMBAT\\s+INTERFACE\\s*\\]') ||
      extractBlock(text, '\\[\\s*COMBAT\\s+HUD\\s*\\]') ||
      extractBlock(text, '\\[\\s*COMBAT\\s+STATUS\\s*\\]');
    if (!block) return null;

    return {
      rawBlock: block,
      enemy: getField(block, 'Enemy'),
      threatLevel: getField(block, 'Threat Level'),
      distance: getField(block, 'Distance'),
      enemyCondition: getField(block, 'Enemy Condition'),
      playerHp: getField(block, 'HP'),
      playerStamina: getField(block, 'Stamina'),
      injuryStatus: getField(block, 'Injury Status'),
      activeBuffs: getListField(block, 'Active Buffs'),
      activeDebuffs: getListField(block, 'Active Debuffs'),
      availableActions: getListField(block, 'Available Actions'),
      environmentalFactors: getListField(block, 'Environmental Factors'),
    };
  } catch (err) {
    console.error('stateParser: parseCombatInterface error', err);
    return null;
  }
}

// ─── Parse Level Up ──────────────────────────────────────────────────────────

export function parseLevelUp(text) {
  try {
    const block =
      extractBlock(text, '\\[\\s*LEVEL\\s+UP\\s+DETECTED\\s*\\]') ||
      extractBlock(text, '\\[\\s*LEVEL[-\\s]+UP\\s*\\]') ||
      extractBlock(text, '\\[\\s*LEVELUP\\s*\\]');
    if (!block) return null;

    const levelMatch = block.match(/Level:\s*(\d+)\s*[→\->]+\s*(\d+)/i);
    const paths = [];

    // Match numbered paths: "1. [Path Name]" or "1. Path Name"
    const pathRe = /(\d+)\.\s*\[?([^\]\n]+)\]?\s*\n\s*Effect:\s*([^\n]+)\n\s*Cost:\s*([^\n]+)/gi;
    let m;
    while ((m = pathRe.exec(block)) !== null) {
      paths.push({
        number: parseInt(m[1]),
        name: m[2].trim(),
        effect: m[3].trim(),
        cost: m[4].trim(),
      });
    }

    // Fallback: simpler path detection if regex above found nothing
    if (paths.length === 0) {
      const simplePathRe = /(\d+)\.\s+(.+)/g;
      let sm;
      while ((sm = simplePathRe.exec(block)) !== null) {
        paths.push({
          number: parseInt(sm[1]),
          name: sm[2].trim(),
          effect: '',
          cost: '',
        });
      }
    }

    const statPointsMatch = block.match(/Stat\s+Points?\s+(?:Awarded|Available|Granted)?:?\s*(\d+)/i);
    const overflowMatch = block.match(/XP\s+Overflow:\s*(\d+)/i);
    const noteMatch = block.match(/System\s+Note:\s*(.+)/i) || block.match(/Growth\s+Note:\s*(.+)/i);

    // HP/MP/Stamina auto-increases
    const hpIncMatch = block.match(/HP\s+Max:\s*\+(\d+)/i);
    const mpIncMatch = block.match(/MP\s+Max:\s*\+(\d+)/i);
    const stamIncMatch = block.match(/Stamina\s+Max:\s*\+(\d+)/i);

    return {
      rawBlock: block,
      fromLevel: levelMatch ? parseInt(levelMatch[1]) : null,
      toLevel: levelMatch ? parseInt(levelMatch[2]) : null,
      statPoints: statPointsMatch ? parseInt(statPointsMatch[1]) : 5,
      xpOverflow: overflowMatch ? parseInt(overflowMatch[1]) : 0,
      systemNote: noteMatch ? noteMatch[1].trim() : null,
      hpIncrease: hpIncMatch ? parseInt(hpIncMatch[1]) : null,
      mpIncrease: mpIncMatch ? parseInt(mpIncMatch[1]) : null,
      staminaIncrease: stamIncMatch ? parseInt(stamIncMatch[1]) : null,
      paths, // kept for backward compat but no longer used in UI
    };
  } catch (err) {
    console.error('stateParser: parseLevelUp error', err);
    return null;
  }
}

// ─── Parse Title Unlocked ────────────────────────────────────────────────────

export function parseTitleUnlocked(text) {
  try {
    const block =
      extractBlock(text, '\\[\\s*TITLE\\s+UNLOCKED\\s*\\]') ||
      extractBlock(text, '\\[\\s*TITLE\\s+ACQUIRED\\s*\\]') ||
      extractBlock(text, '\\[\\s*TITLE\\s*\\]');
    if (!block) return null;
    return {
      rawBlock: block,
      title: getField(block, 'Title'),
      effect: getField(block, 'Effect'),
      condition: getField(block, 'Condition'),
      passive: getField(block, 'Passive') || null,  // Phase 6: mechanical passive effect
      trigger: getField(block, 'Trigger') || null,
    };
  } catch (err) {
    return null;
  }
}

// ─── Parse Skill Directory ───────────────────────────────────────────────────

export function parseSkillDirectory(text) {
  try {
    const block =
      extractBlock(text, '\\[\\s*SKILL\\s+DIRECTORY\\s*\\]') ||
      extractBlock(text, '\\[\\s*SKILL\\s+UPDATE\\s*\\]') ||
      extractBlock(text, '\\[\\s*SKILLS?\\s*\\]');
    if (!block) return null;

    const skills = [];
    // Split on "Skill Name:" occurrences
    const parts = block.split(/(?=Skill Name:)/i);
    for (const part of parts) {
      if (!part.trim() || !/Skill Name:/i.test(part)) continue;
      const rawUses = getField(part, 'Uses') || getField(part, 'Usage Count') || getField(part, 'Use Count');
      skills.push({
        name: getField(part, 'Skill Name') || '—',
        type: getField(part, 'Type') || 'Unknown',
        rank: getField(part, 'Rank') || 'E',
        usageCount: rawUses ? parseInt(rawUses, 10) || 0 : 0,
        description: getField(part, 'Description') || '',
        currentEffect: getField(part, 'Current Effect') || '',
        growthCondition: getField(part, 'Growth Condition') || '',
        mutationPotential: getField(part, 'Mutation Potential') || '',
        riskFactor: getField(part, 'Risk Factor') || '',
      });
    }

    return { rawBlock: block, skills };
  } catch (err) {
    console.error('stateParser: parseSkillDirectory error', err);
    return null;
  }
}

// ─── Parse Item Acquired ─────────────────────────────────────────────────────
// Handles any [ ITEM ACQUIRED / RECEIVED / OBTAINED ] block Claude outputs

export function parseItemAcquired(text) {
  try {
    const block =
      extractBlock(text, '\\[\\s*ITEMS?\\s+ACQUIRED\\s*\\]') ||
      extractBlock(text, '\\[\\s*ITEMS?\\s+RECEIVED\\s*\\]') ||
      extractBlock(text, '\\[\\s*ITEMS?\\s+OBTAINED\\s*\\]') ||
      extractBlock(text, '\\[\\s*ITEMS?\\s+ADDED\\s*\\]') ||
      extractBlock(text, '\\[\\s*ITEMS?\\s+UPDATE\\s*\\]');
    if (!block) return null;

    const items = [];
    // Match "- Item Name" or "Name:" patterns
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (/^\[/.test(line)) continue; // skip header
      // Bullet line: "- Tactical Utility Knife"
      const bulletMatch = line.match(/^[-–•·]\s+(.+)/);
      if (bulletMatch) {
        const name = bulletMatch[1].split(/[:(]/)[0].trim();
        if (name && name.length > 1) {
          const effectMatch = line.match(/[:(]\s*(.+)/);
          items.push({ name, description: effectMatch ? effectMatch[1].trim() : '' });
        }
        continue;
      }
      // "Name: description" format
      const colonMatch = line.match(/^([A-Z][^:]{2,40}):\s*(.+)/);
      if (colonMatch && colonMatch[1] !== 'Effect' && colonMatch[1] !== 'Type') {
        items.push({ name: colonMatch[1].trim(), description: colonMatch[2].trim() });
      }
    }
    return items.length > 0 ? { items } : null;
  } catch (err) {
    return null;
  }
}

// ─── Parse Quest Log ─────────────────────────────────────────────────────────
// Handles [ QUEST LOG ] blocks — parses active, completed, and failed quests

export function parseQuestLog(text) {
  try {
    const block =
      extractBlock(text, '\\[\\s*QUEST\\s+LOG\\s*\\]') ||
      extractBlock(text, '\\[\\s*QUEST\\s*\\]');
    if (!block) return null;

    // Parse line-by-line tracking sections explicitly
    // This avoids the regex-based section extraction that captures stray narrative text
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);

    let currentSection = null; // 'active' | 'completed' | 'failed'
    const sections = { active: [], completed: [], failed: [] };
    let currentQuest = null;

    const pushCurrent = () => {
      if (currentQuest && currentSection && currentQuest.name.length >= 3) {
        sections[currentSection].push(currentQuest);
      }
      currentQuest = null;
    };

    for (const line of lines) {
      // Skip the block header itself
      if (/^\[\s*QUEST/i.test(line)) continue;

      // Section header detection — strict match
      if (/^Active\s+Quests?\s*:?\s*$/i.test(line) || /^Active\s*:?\s*$/i.test(line)) {
        pushCurrent(); currentSection = 'active'; continue;
      }
      if (/^Completed\s+Quests?\s*:?\s*$/i.test(line) || /^Completed\s*:?\s*$/i.test(line)) {
        pushCurrent(); currentSection = 'completed'; continue;
      }
      if (/^Failed\s+Quests?\s*:?\s*$/i.test(line) || /^Failed\s*:?\s*$/i.test(line)) {
        pushCurrent(); currentSection = 'failed'; continue;
      }

      // Must be inside a recognized section to parse anything
      if (!currentSection) continue;

      // Skip "None" / placeholder lines
      if (/^[-–•]?\s*(None|—|N\/A)\s*$/i.test(line)) continue;

      // Quest bullet: "- Quest Name: description" or "- Quest Name"
      if (/^[-–•]\s+/.test(line)) {
        pushCurrent();
        const raw = line.replace(/^[-–•]\s+/, '').trim();

        // Validate: must be a real quest name (3–80 chars, not a placeholder)
        if (raw.length < 3 || raw.length > 80) continue;
        if (/^(None|—|No quests?|Empty)/i.test(raw)) continue;

        const colonIdx = raw.indexOf(':');
        if (colonIdx > 2 && colonIdx < 60) {
          currentQuest = {
            name: raw.slice(0, colonIdx).trim(),
            description: raw.slice(colonIdx + 1).trim(),
            objectives: [],
          };
        } else {
          currentQuest = { name: raw, description: '', objectives: [] };
        }
        continue;
      }

      // Objective line: "[ ] text" or "[x] text"
      if (currentQuest && /\[\s*[xX✓ ]\s*\]/.test(line)) {
        const completed = /\[[xX✓]\]/.test(line);
        const objText = line.replace(/\[\s*[xX✓ ]\s*\]/, '').replace(/^[-–•\s]+/, '').trim();
        if (objText && objText.length > 2) currentQuest.objectives.push({ text: objText, completed });
        continue;
      }

      // Continuation text for current quest (only short lines, not narrative prose)
      if (currentQuest && line.length < 120 && !/^[A-Z]{2,}/.test(line)) {
        currentQuest.description = (currentQuest.description ? currentQuest.description + ' ' : '') + line;
      }
    }

    pushCurrent();

    // Only return if we actually parsed something useful
    const hasContent = sections.active.length > 0 || sections.completed.length > 0 || sections.failed.length > 0;
    if (!hasContent) return null;

    return {
      rawBlock: block,
      active: sections.active,
      completed: sections.completed,
      failed: sections.failed,
    };
  } catch (err) {
    console.error('stateParser: parseQuestLog error', err);
    return null;
  }
}

// ─── Parse World Event ───────────────────────────────────────────────────────
// Handles [ WORLD EVENT ] blocks — appended to worldEvents array

export function parseWorldEvent(text) {
  try {
    const block =
      extractBlock(text, '\\[\\s*WORLD\\s+EVENT\\s*\\]') ||
      extractBlock(text, '\\[\\s*WORLD\\s+STATE\\s*\\]') ||
      extractBlock(text, '\\[\\s*WORLD\\s+UPDATE\\s*\\]');
    if (!block) return null;

    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    // First line is the block header — skip it
    const contentLines = lines.filter((l) => !/^\[\s*WORLD/i.test(l));

    const event = getField(block, 'Event') || getField(block, 'Description');
    const type = getField(block, 'Type') || getField(block, 'Category');
    // If no explicit "Event:" field, join all content lines as description
    const description = event || contentLines.join(' ').trim();

    if (!description) return null;
    return {
      rawBlock: block,
      description,
      type: type || 'World Event',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return null;
  }
}

// ─── Parse Daily Quest ────────────────────────────────────────────────────────
export function parseDailyQuest(text) {
  try {
    const block = extractBlock(text, '\\[\\s*DAILY\\s+QUEST\\s*\\]');
    if (!block) return null;

    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const tasks = [];
    let deadline = null;

    for (const line of lines) {
      if (/^\[\s*DAILY\s+QUEST\s*\]/i.test(line)) continue;
      const taskMatch = line.match(/^Task:\s*(.+)/i);
      if (taskMatch) { tasks.push({ description: taskMatch[1].trim(), completed: false }); continue; }
      const deadlineMatch = line.match(/^Deadline:\s*(.+)/i);
      if (deadlineMatch) { deadline = deadlineMatch[1].trim(); continue; }
    }

    if (tasks.length === 0) return null;
    return { tasks, deadline: deadline || 'Tonight at midnight' };
  } catch (err) {
    console.error('stateParser: parseDailyQuest error', err);
    return null;
  }
}

// ─── Parse Daily Quest Update ─────────────────────────────────────────────────
export function parseDailyQuestUpdate(text) {
  try {
    const block = extractBlock(text, '\\[\\s*DAILY\\s+QUEST\\s+UPDATE\\s*\\]');
    if (!block) return null;

    const completed = getField(block, 'Completed');
    const status = getField(block, 'Status');
    const bonusXPRaw = getField(block, 'Bonus XP') || getField(block, 'Bonus');
    const bonusXP = bonusXPRaw ? parseInt(bonusXPRaw, 10) || 0 : 0;
    const allComplete = /ALL\s+COMPLETE/i.test(status || '');
    const penaltyCleared = /PENALTY\s+CLEARED/i.test(status || '');

    return { completedTask: completed, allComplete, penaltyCleared, bonusXP, status };
  } catch (err) {
    return null;
  }
}

// ─── Parse Penalty Zone ───────────────────────────────────────────────────────
export function parsePenaltyZone(text) {
  try {
    const block = extractBlock(text, '\\[\\s*PENALTY\\s+ZONE\\s*\\]');
    if (!block) return null;

    const incompleteTasks = getField(block, 'Incomplete Tasks');
    const dungeonRank = getField(block, 'Dungeon Rank');
    return {
      incompleteTasks: incompleteTasks ? parseInt(incompleteTasks, 10) : null,
      dungeonRank: dungeonRank || 'Unknown',
    };
  } catch (err) {
    return null;
  }
}

// ─── Parse Loot ───────────────────────────────────────────────────────────────
export function parseLoot(text) {
  try {
    const block = extractBlock(text, '\\[\\s*LOOT\\s*\\]');
    if (!block) return null;

    const source = getField(block, 'Source');
    const cashRaw = getField(block, 'Cash');
    const cash = cashRaw ? parseInt(cashRaw.replace(/[^0-9]/g, ''), 10) || 0 : 0;
    const notesVal = getField(block, 'Notes');

    // Parse explicit "XP Awarded: +N" field — used as authoritative kill XP
    // so the audit doesn't have to estimate from stone counts
    const xpAwardedRaw = getField(block, 'XP Awarded') || getField(block, 'XP Award') || getField(block, 'XP');
    const xpAwarded = xpAwardedRaw ? parseInt(xpAwardedRaw.replace(/[^0-9]/g, ''), 10) || 0 : 0;

    // Parse magic stones: "E-rank ×3, D-rank ×1" or "E×3 D×1"
    const magicStones = { E: 0, D: 0, C: 0, B: 0, A: 0, S: 0 };
    const stoneLineMatch = block.match(/Magic\s+Stones?:\s*(.+)/i);
    if (stoneLineMatch) {
      const stoneStr = stoneLineMatch[1];
      const ranks = ['E', 'D', 'C', 'B', 'A', 'S'];
      for (const rank of ranks) {
        const m = stoneStr.match(new RegExp(`${rank}(?:-rank)?\\s*[×x:]?\\s*(\\d+)`, 'i'));
        if (m) magicStones[rank] = parseInt(m[1], 10) || 0;
      }
    }

    // Parse items from bullet list under "Items:"
    const items = [];
    const itemsMatch = block.match(/Items?:\s*\n((?:- .+\n?)*)/i);
    if (itemsMatch) {
      itemsMatch[1].split('\n').forEach(line => {
        const cleaned = line.replace(/^[-\s]+/, '').trim();
        if (cleaned && cleaned.toLowerCase() !== 'none' && cleaned !== '—') {
          const parenMatch = cleaned.match(/^(.+?)\s*\((.+)\)\s*$/);
          if (parenMatch) items.push({ name: parenMatch[1].trim(), description: parenMatch[2].trim() });
          else items.push({ name: cleaned, description: '' });
        }
      });
    }

    const hasSomething = cash > 0 || Object.values(magicStones).some(v => v > 0) || items.length > 0 || xpAwarded > 0;
    if (!hasSomething) return null;

    return { source, cash, magicStones, items, notes: notesVal, xpAwarded };
  } catch (err) {
    console.error('stateParser: parseLoot error', err);
    return null;
  }
}

// ─── Parse Shadow Army ────────────────────────────────────────────────────────
// Handles two-tier DOMAIN format:
//   DOMAIN: X / Y
//   — GENERALS —   (full cards with isGeneral: true)
//   — ARMY —       (compact: "Creature Type × N: Grade — Status")
//   — FALLEN —     (compact fallen record)
export function parseShadowArmy(text) {
  try {
    const block = extractBlock(text, '\\[\\s*SHADOW\\s+ARMY\\s*\\]');
    if (!block) return null;

    const soldiers = [];

    // ── Parse DOMAIN counter ──────────────────────────────────────────────────
    let domainActive = null;
    let domainMax = null;
    const domainMatch = block.match(/DOMAIN:\s*(\d+)\s*[\/]\s*(\d+)/i);
    if (domainMatch) {
      domainActive = parseInt(domainMatch[1], 10);
      domainMax = parseInt(domainMatch[2], 10);
    }

    // ── Determine current section ─────────────────────────────────────────────
    const lines = block.split('\n');
    let section = 'generals'; // default section before any section header

    // Track current general chunk being built
    let currentChunk = null;

    const flushGeneral = () => {
      if (!currentChunk) return;
      const name = getField(currentChunk, 'Name');
      if (!name) { currentChunk = null; return; }
      const grade       = getField(currentChunk, 'Grade') || 'Private';
      const origin      = getField(currentChunk, 'Origin');
      const status      = getField(currentChunk, 'Status') || 'active';
      const extractedAt = getField(currentChunk, 'Extracted At') || getField(currentChunk, 'Location');
      const notes       = getField(currentChunk, 'Notes') || getField(currentChunk, 'Description');
      const deployment  = getField(currentChunk, 'Deployment') || 'standby';
      const personality = getField(currentChunk, 'Personality');
      const killCountRaw = getField(currentChunk, 'Kill Count') || getField(currentChunk, 'Kills');
      const killCount   = killCountRaw ? parseInt(killCountRaw, 10) || 0 : 0;
      const assignedTask = getField(currentChunk, 'Task');

      soldiers.push({
        name,
        grade,
        origin,
        status: /lost/i.test(status) ? 'lost' : 'active',
        extractedAt,
        notes,
        isGeneral: true,
        customName: name,
        deploymentState: /assigned/i.test(deployment) ? 'assigned' : /deployed/i.test(deployment) ? 'deployed' : 'standby',
        personality: personality || null,
        promotionXP: 0,
        assignedTask: /^—$/.test(assignedTask || '—') ? null : assignedTask,
        extractionRank: null,
        killCount,
        firstExtractedAt: null,
      });
      currentChunk = null;
    };

    for (const line of lines) {
      const trimmed = line.trim();

      // Section header detection
      if (/^—\s*GENERALS\s*—/i.test(trimmed)) { flushGeneral(); section = 'generals'; continue; }
      if (/^—\s*ARMY\s*—/i.test(trimmed))     { flushGeneral(); section = 'army'; continue; }
      if (/^—\s*FALLEN\s*—/i.test(trimmed))   { flushGeneral(); section = 'fallen'; continue; }

      // Skip block header and DOMAIN line
      if (/^\[\s*SHADOW\s+ARMY/i.test(trimmed)) continue;
      if (/^DOMAIN:/i.test(trimmed)) continue;

      if (section === 'generals') {
        // Each General starts with "Name:" — flush previous when we see a new one
        if (/^Name:/i.test(trimmed)) {
          flushGeneral();
          currentChunk = trimmed + '\n';
        } else if (currentChunk !== null) {
          currentChunk += trimmed + '\n';
        }
      }

      if (section === 'army') {
        // Compact format: "Creature Type × N: Grade — Status" or "- Creature × N: ..."
        const armyLine = trimmed.replace(/^[-•]\s*/, '');
        const armyMatch = armyLine.match(/^(.+?)\s*[×x]\s*(\d+)\s*:\s*(\w+)\s*—?\s*(.+)?$/i);
        if (armyMatch) {
          const type   = armyMatch[1].trim();
          const count  = parseInt(armyMatch[2], 10) || 1;
          const grade  = armyMatch[3].trim();
          const status = armyMatch[4]?.trim() || 'standby';
          soldiers.push({
            name: type,       // army units use creature type as name
            grade,
            origin: type,
            status: /lost/i.test(status) ? 'lost' : 'active',
            extractedAt: null,
            notes: null,
            isGeneral: false,
            customName: null,
            deploymentState: /assigned/i.test(status) ? 'assigned' : /deployed/i.test(status) ? 'deployed' : 'standby',
            personality: null,
            promotionXP: 0,
            assignedTask: null,
            extractionRank: null,
            killCount: 0,
            firstExtractedAt: null,
            armyCount: count,
          });
        }
      }

      if (section === 'fallen') {
        // Brief fallen record: "Name: Lost — note"
        const fallenLine = trimmed.replace(/^[-•]\s*/, '');
        if (fallenLine && fallenLine.length > 2 && !/^—$/.test(fallenLine)) {
          const fallenMatch = fallenLine.match(/^(.+?):\s*Lost\s*—?\s*(.+)?$/i);
          const fallenName = fallenMatch ? fallenMatch[1].trim() : fallenLine.split(':')[0].trim();
          if (fallenName) {
            // Upsert as lost; don't duplicate if already in list
            const existingIdx = soldiers.findIndex(
              (s) => s.name.toLowerCase() === fallenName.toLowerCase(),
            );
            if (existingIdx !== -1) {
              soldiers[existingIdx] = { ...soldiers[existingIdx], status: 'lost' };
            } else {
              soldiers.push({
                name: fallenName,
                grade: 'Private',
                origin: null,
                status: 'lost',
                extractedAt: null,
                notes: fallenMatch?.[2]?.trim() || null,
                isGeneral: false,
                customName: null,
                deploymentState: 'standby',
                personality: null,
                promotionXP: 0,
                assignedTask: null,
                extractionRank: null,
                killCount: 0,
                firstExtractedAt: null,
              });
            }
          }
        }
      }
    }

    // Flush any pending general
    flushGeneral();

    // Fallback: if no section headers found, try legacy "Name:" split parsing
    if (soldiers.length === 0) {
      const rawChunks = block.split(/(?=^Name:)/im).filter((c) => /Name:/i.test(c));
      for (const chunk of rawChunks) {
        const name = getField(chunk, 'Name');
        if (!name) continue;
        soldiers.push({
          name,
          grade:        getField(chunk, 'Grade') || 'Private',
          origin:       getField(chunk, 'Origin'),
          status:       /lost/i.test(getField(chunk, 'Status') || '') ? 'lost' : 'active',
          extractedAt:  getField(chunk, 'Extracted At') || getField(chunk, 'Location'),
          notes:        getField(chunk, 'Notes') || getField(chunk, 'Description'),
          isGeneral:    false,
          customName:   null,
          deploymentState: 'standby',
          personality:  null,
          promotionXP:  0,
          assignedTask: null,
          extractionRank: null,
          killCount:    0,
          firstExtractedAt: null,
        });
      }
    }

    return { soldiers, domainActive, domainMax };
  } catch (err) {
    console.error('stateParser: parseShadowArmy error', err);
    return null;
  }
}

// ─── Parse Shadow Protocol ────────────────────────────────────────────────────
// Fires during unlock arc stages (anomaly, compatibility, unlock).
export function parseShadowProtocol(text) {
  try {
    const block = extractBlock(text, '\\[\\s*SHADOW\\s+PROTOCOL\\s*\\]');
    if (!block) return null;
    const status    = getField(block, 'Status');
    const directive = getField(block, 'Directive');
    const classification = getField(block, 'Classification');
    const note      = getField(block, 'Note');
    // Determine arc stage from status value
    let stage = 'anomaly';
    if (/COMPATIBILITY\s+CONFIRMED/i.test(status || '')) stage = 'compatibility';
    if (/UNLOCKED/i.test(status || ''))                   stage = 'unlocked';
    return { rawBlock: block, status, directive, classification, note, stage };
  } catch (err) {
    return null;
  }
}

// ─── Parse Shadow Extraction Available ───────────────────────────────────────
export function parseShadowExtractionAvailable(text) {
  try {
    const block = extractBlock(text, '\\[\\s*SHADOW\\s+EXTRACTION\\s+AVAILABLE\\s*\\]');
    if (!block) return null;
    const target  = getField(block, 'Target');
    const window_ = getField(block, 'Window');
    return { rawBlock: block, target, window: window_ };
  } catch (err) {
    return null;
  }
}

// ─── Parse Shadow Extraction Result ──────────────────────────────────────────
const GENERAL_GRADES = new Set(['Knight', 'Commander', 'General', 'Marshal', 'Sovereign']);

export function parseShadowExtractionResult(text) {
  try {
    const block = extractBlock(text, '\\[\\s*SHADOW\\s+EXTRACTION\\s+RESULT\\s*\\]');
    if (!block) return null;
    const target    = getField(block, 'Target');
    const outcomeRaw = getField(block, 'Outcome');
    const success   = /SUCCESS/i.test(outcomeRaw || '');
    const gradeRaw  = getField(block, 'Grade');
    const personality = getField(block, 'Personality') || getField(block, 'Personality Note');
    const domainUpdate = getField(block, 'DOMAIN') || getField(block, 'Domain');
    // General tier: Knight-grade or above → gets naming modal
    const isGeneral = GENERAL_GRADES.has(gradeRaw || '');
    return { rawBlock: block, target, success, grade: gradeRaw, personality, domainUpdate, isGeneral };
  } catch (err) {
    return null;
  }
}

// ─── Parse Shadow Command Result ─────────────────────────────────────────────
export function parseShadowCommandResult(text) {
  try {
    const block = extractBlock(text, '\\[\\s*SHADOW\\s+COMMAND\\s+RESULT\\s*\\]');
    if (!block) return null;
    const command    = getField(block, 'Command');
    const executedBy = getField(block, 'Executed By') || getField(block, 'Shadow');
    const result     = getField(block, 'Result');
    return { rawBlock: block, command, executedBy, result };
  } catch (err) {
    return null;
  }
}

// ─── Parse Shadow Intel ───────────────────────────────────────────────────────
export function parseShadowIntel(text) {
  try {
    const block = extractBlock(text, '\\[\\s*SHADOW\\s+INTEL\\s*\\]');
    if (!block) return null;
    const shadow     = getField(block, 'Shadow');
    const assignment = getField(block, 'Assignment');
    const duration   = getField(block, 'Duration');
    const report     = getField(block, 'Report');
    return { rawBlock: block, shadow, assignment, duration, report };
  } catch (err) {
    return null;
  }
}

// ─── Parse NPC Update ────────────────────────────────────────────────────────
// Handles [ NPC UPDATE ] blocks — upserts NPCs by name into the relationships list

export function parseNPCUpdate(text) {
  try {
    // Claude may output multiple [ NPC UPDATE ] blocks — collect all of them
    const npcBlockRe = /\[\s*NPC\s+UPDATE\s*\]|\[\s*NPC\s*\]/gi;
    const allBlocks = [];
    let match;

    while ((match = npcBlockRe.exec(text)) !== null) {
      const startIdx = match.index;
      const afterStart = text.slice(startIdx);

      // End at the next bracketed system block header
      const nextBlockRe = /\n\[\s*[A-Z][A-Z\s]+\]/;
      const nextMatch = afterStart.slice(10).search(nextBlockRe);
      const endIdx = nextMatch !== -1 ? nextMatch + 10 : afterStart.length;

      allBlocks.push(afterStart.slice(0, endIdx).trim());
    }

    if (allBlocks.length === 0) return null;

    // Parse every NPC entry from every block
    const allNPCs = [];

    for (const block of allBlocks) {
      // Split on "Name:" boundaries — each chunk is one NPC entry
      const rawChunks = block.split(/(?=^Name:)/im).filter((c) => /Name:/i.test(c));

      for (const chunk of rawChunks) {
        const name         = getField(chunk, 'Name');
        const relationship = getField(chunk, 'Relationship');
        const status       = getField(chunk, 'Status') || 'Active';
        const faction      = getField(chunk, 'Faction');
        const lastSeen     = getField(chunk, 'Last Seen') || getField(chunk, 'Location');
        const notes        = getField(chunk, 'Notes') || getField(chunk, 'Description');
        const previousName = getField(chunk, 'Previously Known As') || getField(chunk, 'Also Known As') || getField(chunk, 'Formerly');

        // Phase 2 fields
        const relationshipTier = getField(chunk, 'Relationship Tier');
        const romanticRaw  = getField(chunk, 'Romantic');
        const isRomantic   = romanticRaw ? /^yes$/i.test(romanticRaw.trim()) : false;
        const vulnerability = getField(chunk, 'Vulnerability');
        const personalArc  = getField(chunk, 'Personal Arc');
        const arcStage     = getField(chunk, 'Arc Stage');
        const memory       = getField(chunk, 'Memory');

        // Death info — only populated when Status === Deceased
        let deathInfo = null;
        if (/deceased/i.test(status)) {
          const deathDate        = getField(chunk, 'Death Date') || getField(chunk, 'Date');
          const deathCircumstance = getField(chunk, 'Circumstance');
          const lastWords        = getField(chunk, 'Last Words');
          if (deathDate || deathCircumstance || lastWords) {
            deathInfo = { date: deathDate, circumstance: deathCircumstance, lastWords };
          }
        }

        if (!name) continue;
        // Deduplicate by name — last entry wins if the same name appears multiple times
        const existingIdx = allNPCs.findIndex((n) => n.name.toLowerCase() === name.toLowerCase());
        const entry = {
          name, relationship, status, faction, lastSeen, notes, previousName,
          relationshipTier, isRomantic, vulnerability, personalArc, arcStage, memory, deathInfo,
        };
        if (existingIdx !== -1) {
          allNPCs[existingIdx] = entry;
        } else {
          allNPCs.push(entry);
        }
      }
    }

    return allNPCs.length > 0 ? { npcs: allNPCs } : null;
  } catch (err) {
    console.error('stateParser: parseNPCUpdate error', err);
    return null;
  }
}

// ─── Parse NPC Arc ────────────────────────────────────────────────────────────
// Handles [ NPC ARC ] blocks — signals a turning point in an NPC's personal story.
// Appends a memory entry and updates arc stage on the matching NPC.

export function parseNPCArc(text) {
  try {
    const block = extractBlock(text, '\\[\\s*NPC\\s+ARC\\s*\\]');
    if (!block) return null;
    const name         = getField(block, 'Name');
    const arcStage     = getField(block, 'Arc Stage');
    const event        = getField(block, 'Event');
    const playerImpact = getField(block, 'Player Impact');
    const memoryAdded  = getField(block, 'Memory Added');
    if (!name) return null;
    return { rawBlock: block, name, arcStage, event, playerImpact, memoryAdded };
  } catch (err) {
    console.error('stateParser: parseNPCArc error', err);
    return null;
  }
}

// ─── Parse System Notices ────────────────────────────────────────────────────

export function parseSystemNotice(text) {
  try {
    const block = extractBlock(text, '\\[\\s*SYSTEM\\s+NOTICE\\s*\\]');
    if (!block) return null;
    return { rawBlock: block, content: block.replace(/\[\s*SYSTEM\s+NOTICE\s*\]/i, '').trim() };
  } catch { return null; }
}

export function parseSystemFailure(text) {
  try {
    const block = extractBlock(text, '\\[\\s*SYSTEM\\s+FAILURE\\s*\\]');
    if (!block) return null;
    return { rawBlock: block, content: block.replace(/\[\s*SYSTEM\s+FAILURE\s*\]/i, '').trim() };
  } catch { return null; }
}

// ─── Phase 3 Parsers — Living World & Economy ────────────────────────────────

// [ CITY UPDATE ] — zone/overflow/danger level changes
export function parseCityUpdate(text) {
  try {
    const block = extractBlock(text, '\\[\\s*CITY\\s+UPDATE\\s*\\]');
    if (!block) return null;
    const dangerLevel  = getField(block, 'Danger Level');
    const zone         = getField(block, 'Zone');
    const zoneStatus   = getField(block, 'Zone Status');
    const event        = getField(block, 'Event');
    const gateActivity = getField(block, 'Gate Activity');
    const overflowRaw  = getField(block, 'Overflow');
    const isOverflow   = overflowRaw ? /^yes$/i.test(overflowRaw.trim()) : false;
    return { rawBlock: block, dangerLevel, zone, zoneStatus, event, gateActivity, isOverflow };
  } catch (err) {
    return null;
  }
}

// [ MARKET UPDATE ] — stone price shift
export function parseMarketUpdate(text) {
  try {
    const block = extractBlock(text, '\\[\\s*MARKET\\s+UPDATE\\s*\\]');
    if (!block) return null;
    const stone     = getField(block, 'Stone');
    const direction = getField(block, 'Direction');
    const priceRaw  = getField(block, 'Price');
    const reason    = getField(block, 'Reason');
    const price     = priceRaw ? parseInt(priceRaw.replace(/[^0-9]/g, ''), 10) || null : null;
    return { rawBlock: block, stone, direction, price, reason };
  } catch (err) {
    return null;
  }
}

// [ CONTRACT AVAILABLE ] — gate contract issued
export function parseContractAvailable(text) {
  try {
    const block = extractBlock(text, '\\[\\s*CONTRACT\\s+AVAILABLE\\s*\\]');
    if (!block) return null;
    const name      = getField(block, 'Contract');
    const rank      = getField(block, 'Rank');
    const rewardRaw = getField(block, 'Reward');
    const deadline  = getField(block, 'Deadline');
    const sponsor   = getField(block, 'Sponsor');
    const riskNotes = getField(block, 'Risk Notes');
    const bidding   = getField(block, 'Bidding');
    const reward    = rewardRaw ? parseInt(rewardRaw.replace(/[^0-9]/g, ''), 10) || 0 : 0;
    return { rawBlock: block, name, rank, reward, deadline, sponsor, riskNotes, bidding };
  } catch (err) {
    return null;
  }
}

// [ CONTRACT RESULT ] — contract completed or failed
export function parseContractResult(text) {
  try {
    const block = extractBlock(text, '\\[\\s*CONTRACT\s+RESULT\s*\\]') ||
                  extractBlock(text, '\\[\\s*CONTRACT\\s+RESULT\\s*\\]');
    if (!block) return null;
    const name       = getField(block, 'Contract');
    const outcome    = getField(block, 'Outcome');
    const rewardRaw  = getField(block, 'Reward Paid');
    const penaltyRaw = getField(block, 'Penalty');
    const notes      = getField(block, 'Notes');
    const reward     = rewardRaw ? parseInt(rewardRaw.replace(/[^0-9]/g, ''), 10) || 0 : 0;
    const penalty    = penaltyRaw ? parseInt(penaltyRaw.replace(/[^0-9]/g, ''), 10) || 0 : 0;
    return { rawBlock: block, name, outcome, reward, penalty, notes };
  } catch (err) {
    return null;
  }
}

// [ RIVAL SIGHTING ] — rival hunter appears
export function parseRivalSighting(text) {
  try {
    const block = extractBlock(text, '\\[\\s*RIVAL\\s+SIGHTING\\s*\\]');
    if (!block) return null;
    const name             = getField(block, 'Name');
    const rank             = getField(block, 'Rank');
    const location         = getField(block, 'Location');
    const context          = getField(block, 'Context');
    const reaction         = getField(block, 'Reaction');
    const lastKnownLocation = getField(block, 'Last Known Location');
    return { rawBlock: block, name, rank, location, context, reaction, lastKnownLocation };
  } catch (err) {
    return null;
  }
}

// [ EXPENSE NOTICE ] — recurring cost comes due
export function parseExpenseNotice(text) {
  try {
    const block = extractBlock(text, '\\[\\s*EXPENSE\\s+NOTICE\\s*\\]');
    if (!block) return null;
    const type        = getField(block, 'Type');
    const amountRaw   = getField(block, 'Amount');
    const status      = getField(block, 'Status');
    const consequence = getField(block, 'Consequence');
    const amount      = amountRaw ? parseInt(amountRaw.replace(/[^0-9]/g, ''), 10) || 0 : 0;
    return { rawBlock: block, type, amount, status, consequence };
  } catch (err) {
    return null;
  }
}

// [ RANK CEREMONY ] — rank advancement becomes public
export function parseRankCeremony(text) {
  try {
    const block = extractBlock(text, '\\[\\s*RANK\\s+CEREMONY\\s*\\]');
    if (!block) return null;
    const oldRank        = getField(block, 'Old Rank');
    const newRank        = getField(block, 'New Rank');
    const ceremony       = getField(block, 'Ceremony');
    const mediaCoverageRaw = getField(block, 'Media Coverage');
    const mediaRaw       = getField(block, 'Guild Interest');
    const rivalReaction  = getField(block, 'Rival Reaction');
    const publicReaction = getField(block, 'Public Reaction');
    const mediaCoverage  = mediaCoverageRaw ? /^yes$/i.test(mediaCoverageRaw.trim()) : false;
    const guildInterest  = mediaRaw ? /^yes$/i.test(mediaRaw.trim()) : false;
    return { rawBlock: block, oldRank, newRank, ceremony, mediaCoverage, guildInterest, rivalReaction, publicReaction };
  } catch (err) {
    return null;
  }
}

// [ HUNTER REGISTRY ] — Association leaderboard snapshot
export function parseHunterRegistry(text) {
  try {
    const block = extractBlock(text, '\\[\\s*HUNTER\\s+REGISTRY\\s*\\]');
    if (!block) return null;
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const entries = [];
    const recentlyNoted = [];
    let section = 'top';

    for (const line of lines) {
      if (/^\[\s*HUNTER\s+REGISTRY/i.test(line)) continue;
      if (/^—\s*TOP\s+HUNTERS\s*—/i.test(line)) { section = 'top'; continue; }
      if (/^—\s*RECENTLY\s+NOTED\s*—/i.test(line)) { section = 'recent'; continue; }

      if (section === 'top') {
        // "Name | Rank | Level | Guild | Status"
        const parts = line.split('|').map((p) => p.trim());
        if (parts.length >= 4) {
          entries.push({
            name:   parts[0],
            rank:   parts[1],
            level:  parts[2] ? parseInt(parts[2], 10) || null : null,
            guild:  parts[3] || null,
            status: parts[4] || 'Active',
          });
        }
      } else if (section === 'recent') {
        // "Name | context"
        const pipeIdx = line.indexOf('|');
        if (pipeIdx > 0) {
          recentlyNoted.push({
            name:    line.slice(0, pipeIdx).trim(),
            context: line.slice(pipeIdx + 1).trim(),
          });
        }
      }
    }

    return { rawBlock: block, entries, recentlyNoted };
  } catch (err) {
    return null;
  }
}

// ─── Phase 5 Parsers — Loot, Gear & Combat Depth ─────────────────────────────

// [ BESTIARY UPDATE ] — new or updated monster entry
export function parseBestiaryUpdate(text) {
  try {
    const block = extractBlock(text, '\\[\\s*BESTIARY\\s+UPDATE\\s*\\]');
    if (!block) return null;
    const monster   = getField(block, 'Monster');
    const rank      = getField(block, 'Rank');
    const origin    = getField(block, 'Origin');
    const biology   = getField(block, 'Biology');
    const behavior  = getField(block, 'Behavior');
    const weakness  = getField(block, 'Weakness');
    const killRaw   = getField(block, 'Kill Count');
    const killCount = killRaw ? parseInt(killRaw, 10) || 0 : 0;
    if (!monster) return null;
    return { rawBlock: block, monster, rank: rank || 'E', origin: origin || null, biology: biology || null, behavior: behavior || null, weakness: weakness || 'Unknown', killCount };
  } catch (err) { return null; }
}

// [ UNIQUE ITEM ] — named legendary drop
export function parseUniqueItem(text) {
  try {
    const block = extractBlock(text, '\\[\\s*UNIQUE\\s+ITEM\\s*\\]');
    if (!block) return null;
    const name    = getField(block, 'Name');
    const type    = getField(block, 'Type');
    const rank    = getField(block, 'Rank');
    const lore    = getField(block, 'Lore');
    const passive = getField(block, 'Passive');
    const hook    = getField(block, 'Hook');
    const set     = getField(block, 'Set');
    if (!name) return null;
    return {
      rawBlock: block, name, type: type || 'Equipment', rank: rank || 'E',
      lore: lore || null, passive: passive || null, hook: hook || null,
      set: (set && set !== '—') ? set : null,
      isUnique: true,
    };
  } catch (err) { return null; }
}

// [ SET BONUS ] — set bonus activation/deactivation
export function parseSetBonus(text) {
  try {
    const block = extractBlock(text, '\\[\\s*SET\\s+BONUS\\s*\\]');
    if (!block) return null;
    const setName = getField(block, 'Set Name');
    const pieces  = getField(block, 'Pieces Equipped');
    const bonus   = getField(block, 'Bonus');
    const status  = getField(block, 'Status');
    if (!setName || !bonus) return null;
    return {
      rawBlock: block, setName, pieces: pieces ? pieces.split(',').map((p) => p.trim()) : [],
      bonus, active: /^ACTIVE$/i.test((status || '').trim()),
    };
  } catch (err) { return null; }
}

// [ GATE RECORD ] — gate discovery or first-clear
export function parseGateRecord(text) {
  try {
    const block = extractBlock(text, '\\[\\s*GATE\\s+RECORD\\s*\\]');
    if (!block) return null;
    const gateName    = getField(block, 'Gate Name');
    const rank        = getField(block, 'Rank');
    const location    = getField(block, 'Location');
    const status      = getField(block, 'Status');
    const clearedBy   = getField(block, 'Cleared By');
    const bonusRaw    = getField(block, 'Bonus');
    const registryNote = getField(block, 'Registry Note');
    const bonus = bonusRaw ? parseInt(bonusRaw.replace(/[^0-9]/g, ''), 10) || 0 : 0;
    const isFirstClear = /FIRST\s+CLEARED/i.test(status || '');
    if (!gateName) return null;
    return {
      rawBlock: block, name: gateName, rank: rank || 'E', location: location || null,
      status: status || 'DISCOVERED', clearedBy: clearedBy || null, bonus, registryNote: registryNote || null,
      isFirstClear, timestamp: new Date().toISOString(),
    };
  } catch (err) { return null; }
}

// [ GEAR AESTHETIC ] — player's visual combat signature
export function parseGearAesthetic(text) {
  try {
    const block = extractBlock(text, '\\[\\s*GEAR\\s+AESTHETIC\\s*\\]');
    if (!block) return null;
    const description = getField(block, 'Description');
    const notable     = getField(block, 'Notable');
    const npcView     = getField(block, 'How NPCs See It');
    if (!description) return null;
    return { rawBlock: block, description, notable: notable || null, npcView: npcView || null };
  } catch (err) { return null; }
}

// ─── Phase 7 Parsers — Immersion & Tone Polish ───────────────────────────────

// [ REST ] — recovery beat after major gates or near-death
export function parseRest(text) {
  try {
    const block = extractBlock(text, '\\[\\s*REST\\s*\\]');
    if (!block) return null;
    const duration  = getField(block, 'Duration');
    const location  = getField(block, 'Location');
    const condition = getField(block, 'Condition');
    const hpRaw     = getField(block, 'HP Recovered');
    const mpRaw     = getField(block, 'MP Recovered');
    const stRaw     = getField(block, 'Stamina Recovered');
    const scene     = getField(block, 'Scene');
    return {
      rawBlock: block,
      duration:  duration  || null,
      location:  location  || null,
      condition: condition || null,
      hpRecovered:      hpRaw ? parseInt(hpRaw,  10) || 0 : 0,
      mpRecovered:      mpRaw ? parseInt(mpRaw,  10) || 0 : 0,
      staminaRecovered: stRaw ? parseInt(stRaw,  10) || 0 : 0,
      scene: scene || null,
    };
  } catch (err) { return null; }
}

// ─── Phase 6 Parsers — Progression & System Depth ────────────────────────────

// [ STAT MILESTONE ] — qualitative break when a stat crosses 25/50/75/100
export function parseStatMilestone(text) {
  try {
    const block = extractBlock(text, '\\[\\s*STAT\\s+MILESTONE\\s*\\]');
    if (!block) return null;
    const stat      = getField(block, 'Stat');
    const threshold = getField(block, 'Threshold');
    const title     = getField(block, 'Title');
    const effect    = getField(block, 'Effect');
    if (!stat || !threshold) return null;
    return {
      rawBlock: block,
      stat: stat.toUpperCase(),
      value: parseInt(threshold, 10) || 0,
      title: title || null,
      effect: effect || null,
      timestamp: new Date().toISOString(),
    };
  } catch (err) { return null; }
}

// [ SKILL MUTATION ] — permanent A→S mutation fork; two paths presented
export function parseSkillMutation(text) {
  try {
    const block = extractBlock(text, '\\[\\s*SKILL\\s+MUTATION\\s*\\]');
    if (!block) return null;
    const skillName  = getField(block, 'Skill');
    const path1Name  = getField(block, 'Path 1 Name');
    const path1Desc  = getField(block, 'Path 1 Description');
    const path1Trade = getField(block, 'Path 1 Tradeoff');
    const path2Name  = getField(block, 'Path 2 Name');
    const path2Desc  = getField(block, 'Path 2 Description');
    const path2Trade = getField(block, 'Path 2 Tradeoff');
    if (!skillName || !path1Name || !path2Name) return null;
    return {
      rawBlock: block,
      skillName,
      paths: [
        { name: path1Name, description: path1Desc || '', tradeoff: path1Trade || '' },
        { name: path2Name, description: path2Desc || '', tradeoff: path2Trade || '' },
      ],
    };
  } catch (err) { return null; }
}

// [ SYSTEM TIER UNLOCK ] — System unlocks new functionality tier
export function parseSystemTierUnlock(text) {
  try {
    const block = extractBlock(text, '\\[\\s*SYSTEM\\s+TIER\\s+UNLOCK\\s*\\]');
    if (!block) return null;
    const tierRaw         = getField(block, 'Tier');
    const unlockedFeature = getField(block, 'Unlocked Feature');
    const message         = getField(block, 'Message');
    const tier = parseInt(tierRaw, 10);
    if (!tier) return null;
    return { rawBlock: block, tier, unlockedFeature: unlockedFeature || null, message: message || null };
  } catch (err) { return null; }
}

// [ ACHIEVEMENT UNLOCKED ] — notable first or milestone
export function parseAchievement(text) {
  try {
    const block = extractBlock(text, '\\[\\s*ACHIEVEMENT\\s+UNLOCKED\\s*\\]');
    if (!block) return null;
    const title       = getField(block, 'Title');
    const description = getField(block, 'Description');
    const category    = getField(block, 'Category');
    if (!title) return null;
    return {
      rawBlock: block,
      title,
      description: description || '',
      category: (category || 'unique').toLowerCase(),
      timestamp: new Date().toISOString(),
    };
  } catch (err) { return null; }
}

// ─── Phase 4 Parsers — Story Architecture ────────────────────────────────────

// [ NEWS FEED ] — media headline / Association press release
export function parseNewsFeed(text) {
  try {
    const block = extractBlock(text, '\\[\\s*NEWS\\s+FEED\\s*\\]');
    if (!block) return null;
    const headline = getField(block, 'Headline');
    const source   = getField(block, 'Source');
    const date     = getField(block, 'Date');
    const category = getField(block, 'Category');
    if (!headline) return null;
    return {
      rawBlock: block,
      headline,
      source: source || 'Hunter Association Bulletin',
      date: date || null,
      category: (category || 'association').toLowerCase(),
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return null;
  }
}

// [ MEMORY FRAGMENT ] — pre-awakening flashback
export function parseMemoryFragment(text) {
  try {
    const block = extractBlock(text, '\\[\\s*MEMORY\\s+FRAGMENT\\s*\\]');
    if (!block) return null;
    const title   = getField(block, 'Title');
    const memory  = getField(block, 'Memory');
    const trigger = getField(block, 'Trigger');
    if (!memory) return null;
    return {
      rawBlock: block,
      title: title || 'Memory Fragment',
      content: memory,
      trigger: trigger || null,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return null;
  }
}

// [ BELIEF SHIFT ] — worldview change
export function parseBeliefShift(text) {
  try {
    const block = extractBlock(text, '\\[\\s*BELIEF\\s+SHIFT\\s*\\]');
    if (!block) return null;
    const shift   = getField(block, 'Shift');
    const trigger = getField(block, 'Trigger');
    const tone    = getField(block, 'Tone');
    if (!shift) return null;
    return { rawBlock: block, shift, trigger: trigger || null, tone: tone || null, timestamp: new Date().toISOString() };
  } catch (err) {
    return null;
  }
}

// [ SYSTEM ANOMALY ] — hidden truth drip (every 10 levels)
export function parseSystemAnomaly(text) {
  try {
    const block = extractBlock(text, '\\[\\s*SYSTEM\\s+ANOMALY\\s*\\]');
    if (!block) return null;
    const classification = getField(block, 'Classification');
    const observation    = getField(block, 'Observation');
    const status         = getField(block, 'Status');
    return { rawBlock: block, classification: classification || 'ANOMALY', observation: observation || '', status: status || 'OBSERVATION LOGGED' };
  } catch (err) {
    return null;
  }
}

// [ LEGEND ENTRY ] — player's growing reputation
export function parseLegendEntry(text) {
  try {
    const block = extractBlock(text, '\\[\\s*LEGEND\\s+ENTRY\\s*\\]');
    if (!block) return null;
    const entry     = getField(block, 'Entry');
    const witnesses = getField(block, 'Witnesses');
    const effect    = getField(block, 'Effect');
    if (!entry) return null;
    return { rawBlock: block, entry, witnesses: witnesses || null, effect: effect || null, timestamp: new Date().toISOString() };
  } catch (err) {
    return null;
  }
}

// [ LORE CODEX ] — historical record entry
export function parseLoreCodex(text) {
  try {
    const block = extractBlock(text, '\\[\\s*LORE\\s+CODEX\\s*\\]');
    if (!block) return null;
    const title    = getField(block, 'Title');
    const entry    = getField(block, 'Entry');
    const category = getField(block, 'Category');
    if (!entry) return null;
    return {
      rawBlock: block,
      title: title || 'Codex Entry',
      entry,
      category: (category || 'lore').toLowerCase(),
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return null;
  }
}

// [ MORAL DECISION ] — time-pressured choice overlay
export function parseMoralDecision(text) {
  try {
    const block = extractBlock(text, '\\[\\s*MORAL\\s+DECISION\\s*\\]');
    if (!block) return null;
    const situation  = getField(block, 'Situation');
    const stakes     = getField(block, 'Stakes');
    const timerRaw   = getField(block, 'Timer');
    const option1    = getField(block, 'Option 1');
    const option2    = getField(block, 'Option 2');
    const option3    = getField(block, 'Option 3');
    const defaultOpt = getField(block, 'Default');
    const timer      = timerRaw ? parseInt(timerRaw, 10) || 30 : 30;
    const options = [option1, option2, option3].filter(Boolean).map((o, i) => ({ key: i + 1, text: o }));
    if (!situation || options.length < 2) return null;
    return { rawBlock: block, situation, stakes: stakes || '', timer, options, defaultOption: defaultOpt || '2' };
  } catch (err) {
    return null;
  }
}

// [ ORIGIN CLUE ] — cryptic mystery fragment
export function parseOriginClue(text) {
  try {
    const block = extractBlock(text, '\\[\\s*ORIGIN\\s+CLUE\\s*\\]');
    if (!block) return null;
    const clue           = getField(block, 'Clue');
    const classification = getField(block, 'Classification');
    const note           = getField(block, 'Note');
    if (!clue) return null;
    return {
      rawBlock: block,
      title: classification || 'ORIGIN',
      entry: clue + (note && note !== '—' ? ` [${note}]` : ''),
      category: 'origin',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return null;
  }
}

// ─── Full Response Parse ──────────────────────────────────────────────────────

export function parseFullResponse(text) {
  if (!text) return {};

  const blocks = detectBlocks(text);

  const result = {
    blocks,
    statusWindow: blocks.hasStatusWindow ? parseStatusWindow(text) : null,
    combat: blocks.hasCombat ? parseCombatInterface(text) : null,
    levelUp: blocks.hasLevelUp ? parseLevelUp(text) : null,
    titleUnlocked: blocks.hasTitleUnlocked ? parseTitleUnlocked(text) : null,
    skillDirectory: blocks.hasSkillDirectory ? parseSkillDirectory(text) : null,
    systemNotice: blocks.hasSystemNotice ? parseSystemNotice(text) : null,
    systemFailure: blocks.hasSystemFailure ? parseSystemFailure(text) : null,
    itemAcquired: blocks.hasItemAcquired ? parseItemAcquired(text) : null,
    questLog: blocks.hasQuestLog ? parseQuestLog(text) : null,
    worldEvent: blocks.hasWorldEvent ? parseWorldEvent(text) : null,
    npcUpdate: blocks.hasNPCUpdate ? parseNPCUpdate(text) : null,
    npcArc: blocks.hasNPCArc ? parseNPCArc(text) : null,
    dailyQuest: blocks.hasDailyQuest ? parseDailyQuest(text) : null,
    dailyQuestUpdate: blocks.hasDailyQuestUpdate ? parseDailyQuestUpdate(text) : null,
    penaltyZone: blocks.hasPenaltyZone ? parsePenaltyZone(text) : null,
    shadowArmy: blocks.hasShadowArmy ? parseShadowArmy(text) : null,
    shadowProtocol: blocks.hasShadowProtocol ? parseShadowProtocol(text) : null,
    shadowExtractionAvailable: blocks.hasShadowExtractionAvailable ? parseShadowExtractionAvailable(text) : null,
    shadowExtractionResult: blocks.hasShadowExtractionResult ? parseShadowExtractionResult(text) : null,
    shadowCommandResult: blocks.hasShadowCommandResult ? parseShadowCommandResult(text) : null,
    shadowIntel: blocks.hasShadowIntel ? parseShadowIntel(text) : null,
    loot: blocks.hasLoot ? parseLoot(text) : null,
    cityUpdate: blocks.hasCityUpdate ? parseCityUpdate(text) : null,
    marketUpdate: blocks.hasMarketUpdate ? parseMarketUpdate(text) : null,
    contractAvailable: blocks.hasContractAvailable ? parseContractAvailable(text) : null,
    contractResult: blocks.hasContractResult ? parseContractResult(text) : null,
    rivalSighting: blocks.hasRivalSighting ? parseRivalSighting(text) : null,
    expenseNotice: blocks.hasExpenseNotice ? parseExpenseNotice(text) : null,
    rankCeremony: blocks.hasRankCeremony ? parseRankCeremony(text) : null,
    hunterRegistry: blocks.hasHunterRegistry ? parseHunterRegistry(text) : null,
    // Phase 5 — Loot, Gear & Combat Depth
    bestiaryUpdate: blocks.hasBestiaryUpdate ? parseBestiaryUpdate(text) : null,
    uniqueItem: blocks.hasUniqueItem ? parseUniqueItem(text) : null,
    setBonus: blocks.hasSetBonus ? parseSetBonus(text) : null,
    gateRecord: blocks.hasGateRecord ? parseGateRecord(text) : null,
    gearAesthetic: blocks.hasGearAesthetic ? parseGearAesthetic(text) : null,
    // Phase 4 — Story Architecture
    newsFeed: blocks.hasNewsFeed ? parseNewsFeed(text) : null,
    memoryFragment: blocks.hasMemoryFragment ? parseMemoryFragment(text) : null,
    beliefShift: blocks.hasBeliefShift ? parseBeliefShift(text) : null,
    systemAnomaly: blocks.hasSystemAnomaly ? parseSystemAnomaly(text) : null,
    legendEntry: blocks.hasLegendEntry ? parseLegendEntry(text) : null,
    loreCodex: blocks.hasLoreCodex ? parseLoreCodex(text) : null,
    moralDecision: blocks.hasMoralDecision ? parseMoralDecision(text) : null,
    originClue: blocks.hasOriginClue ? parseOriginClue(text) : null,
    // Phase 7 — Immersion & Tone Polish
    rest: blocks.hasRest ? parseRest(text) : null,
    // Phase 6 — Progression & System Depth
    statMilestone: blocks.hasStatMilestone ? parseStatMilestone(text) : null,
    skillMutation: blocks.hasSkillMutation ? parseSkillMutation(text) : null,
    systemTierUnlock: blocks.hasSystemTierUnlock ? parseSystemTierUnlock(text) : null,
    achievement: blocks.hasAchievement ? parseAchievement(text) : null,
  };

  return result;
}

// ─── Apply Parsed State to Game State ────────────────────────────────────────

export function applyParsedState(currentState, parsed) {
  if (!parsed) return currentState;
  const next = { ...currentState };

  if (parsed.statusWindow) {
    const sw = parsed.statusWindow;
    const prev = next.playerState || {};

    // Build updated stats — only overwrite if we got a real value
    const updatedStats = { ...prev.stats };
    if (sw.stats) {
      Object.entries(sw.stats).forEach(([k, v]) => {
        if (v !== null && v !== undefined) updatedStats[k] = v;
      });
    }

    next.playerState = {
      ...prev,
      name: sw.name || prev.name,
      rank: sw.rank || prev.rank,
      // Never allow a status window to regress the player's level — Claude sometimes
      // outputs a stale level in a response that also contains a level-up event.
      level: sw.level !== null ? Math.max(sw.level, prev.level || 1) : prev.level,
      // HP/MP/Stamina: use parsed value if it has valid numbers, else keep prev
      hp: (sw.hp && !isNaN(sw.hp.current)) ? sw.hp : prev.hp,
      mp: (sw.mp && !isNaN(sw.mp.current)) ? sw.mp : prev.mp,
      stamina: (sw.stamina && !isNaN(sw.stamina.current)) ? sw.stamina : prev.stamina,
      stats: updatedStats,
      titles: sw.titles && sw.titles.length > 0 ? sw.titles : prev.titles,
      traits: sw.traits && sw.traits.length > 0 ? sw.traits : prev.traits,
      // Guard empty array — only replace if Claude actually listed effects
      statusEffects: sw.statusEffects && sw.statusEffects.length > 0 ? sw.statusEffects : prev.statusEffects || [],
      // Normalize XP shape: getBarField returns { current, max } but state uses { current, toNext }
      xp: (sw.xp && !isNaN(sw.xp.current))
        ? { current: sw.xp.current, toNext: sw.xp.toNext ?? sw.xp.max ?? prev.xp?.toNext }
        : prev.xp,
      location: sw.location || prev.location,
      currentTime: sw.currentTime || prev.currentTime,
      reputation: {
        hunterAssociation: sw.reputationHunterAssociation || prev.reputation?.hunterAssociation,
        guilds: sw.reputationGuilds || prev.reputation?.guilds,
        civilianPublic: sw.reputationCivilian || prev.reputation?.civilianPublic,
      },
      rawStatusBlock: sw.rawBlock || prev.rawStatusBlock,
    };

    // ── XP toNext is always formula-authoritative ─────────────────────────────
    // Claude's reported toNext is unreliable (wrong formula, stale values).
    // Always recompute from xpToNextLevel() so the panel and the status block
    // always agree — regardless of what the AI outputs.
    {
      const correctToNext = xpToNextLevel(next.playerState.level || 1);
      const currentXP = next.playerState.xp?.current ?? 0;
      next.playerState.xp = { current: currentXP, toNext: correctToNext };
    }
  }

  // ── Skills: two-pass upsert ──────────────────────────────────────────────────
  // Pass 1: STATUS WINDOW activeSkills → lightweight entries for newly-seen skills only
  // Pass 2: SKILL DIRECTORY → rich detail entries, always overwrite by name

  let skillsWorking = Array.isArray(next.skills) ? [...next.skills] : [];

  if (parsed.statusWindow?.activeSkills?.length > 0) {
    const swSkills = parsed.statusWindow.activeSkills;
    const swNames = new Set(swSkills.map((s) => s.name));

    // Update existing skills: apply type/rank from STATUS WINDOW if available
    skillsWorking = skillsWorking.map((existing) => {
      const exName = typeof existing === 'string' ? existing : existing.name;
      const swEntry = swSkills.find((s) => s.name === exName);
      if (!swEntry) return existing;
      const updates = {};
      if (swEntry.type && swEntry.type !== 'Unknown') updates.type = swEntry.type;
      // Only update rank if STATUS WINDOW provides one AND it's a real rank letter
      if (swEntry.rank && /^[EDCBAS]$/.test(swEntry.rank)) updates.rank = swEntry.rank;
      return Object.keys(updates).length > 0 ? { ...existing, ...updates } : existing;
    });

    // Add brand-new skills not yet in the working list
    const existingNames = new Set(skillsWorking.map((s) => (typeof s === 'string' ? s : s.name)));
    const toAdd = swSkills
      .filter((s) => s.name && !existingNames.has(s.name))
      .map((s) => ({
        name: s.name,
        type: s.type || 'Unknown',
        rank: (s.rank && /^[EDCBAS]$/.test(s.rank)) ? s.rank : 'E',
        description: '',
        currentEffect: '',
        growthCondition: '',
        mutationPotential: '',
        riskFactor: '',
      }));
    if (toAdd.length > 0) skillsWorking = [...skillsWorking, ...toAdd];
  }

  if (parsed.skillDirectory?.skills?.length > 0) {
    const incoming = parsed.skillDirectory.skills;
    const incomingNames = new Set(incoming.map((s) => s.name));
    const retained = skillsWorking.filter((s) => !incomingNames.has(typeof s === 'string' ? s : s.name));
    // Preserve the higher usageCount — never let Claude accidentally reset a skill's progress
    const merged = incoming.map((newSkill) => {
      const existing = skillsWorking.find(
        (s) => (typeof s === 'string' ? s : s.name) === newSkill.name,
      );
      if (existing && typeof existing === 'object') {
        return { ...newSkill, usageCount: Math.max(newSkill.usageCount || 0, existing.usageCount || 0) };
      }
      return newSkill;
    });
    skillsWorking = [...retained, ...merged];
  }

  if (skillsWorking !== (Array.isArray(next.skills) ? next.skills : [])) {
    next.skills = skillsWorking;
  }

  // ── Inventory: STATUS WINDOW is authoritative (always the full current list) ─
  // Equipment/Consumables/Artifacts sections replace previous data each STATUS WINDOW update.
  if (parsed.statusWindow) {
    const sw = parsed.statusWindow;
    const hasEq = sw.equipment && sw.equipment.length > 0;
    const hasCons = sw.consumables && sw.consumables.length > 0;
    const hasArt = sw.artifacts && sw.artifacts.length > 0;

    if (hasEq || hasCons || hasArt) {
      const prevInv = next.inventory || {};
      next.inventory = {
        equipment: hasEq ? sw.equipment : (prevInv.equipment || []),
        consumables: hasCons ? sw.consumables : (prevInv.consumables || []),
        artifacts: hasArt ? sw.artifacts : (prevInv.artifacts || []),
        currency: sw.currency || prevInv.currency || { cash: 0, magicStones: { E: 0, D: 0, C: 0, B: 0, A: 0, S: 0 } },
      };
    }
  }

  // ── itemAcquired: merge newly acquired items (additive, for any [ ITEM ACQUIRED ] blocks)
  if (parsed.itemAcquired && parsed.itemAcquired.items?.length > 0) {
    const prevInv = next.inventory || { equipment: [], consumables: [], artifacts: [], currency: { cash: 0, magicStones: { E: 0, D: 0, C: 0, B: 0, A: 0, S: 0 } } };
    const newItems = parsed.itemAcquired.items;
    const existingNames = new Set([
      ...(prevInv.equipment || []).map(i => (typeof i === 'string' ? i : i.name)),
      ...(prevInv.consumables || []).map(i => (typeof i === 'string' ? i : i.name)),
    ]);
    const toAdd = newItems.filter(item => !existingNames.has(item.name));
    if (toAdd.length > 0) {
      next.inventory = {
        ...prevInv,
        equipment: [...(prevInv.equipment || []), ...toAdd],
      };
    }
  }

  // ── Loot: add items to inventory, add magic stones and cash to currency ─────
  // IMPORTANT: If [ SYSTEM STATUS WINDOW ] is also present in this response, it is
  // authoritative and already reflects the post-loot totals. In that case we only
  // add the physical items (weapons, crafting materials) — we do NOT add stones or
  // cash again, because the status window has already set the correct new totals and
  // double-adding would inflate the currency every time loot drops.
  if (parsed.loot) {
    const hasStatusWindow = !!parsed.statusWindow;
    const prevInv = next.inventory || { equipment: [], consumables: [], artifacts: [], currency: { cash: 0, magicStones: { E: 0, D: 0, C: 0, B: 0, A: 0, S: 0 } } };
    const prevCur = prevInv.currency || { cash: 0, magicStones: { E: 0, D: 0, C: 0, B: 0, A: 0, S: 0 } };

    // Add looted physical items (always — status window doesn't carry these as additions)
    const existingNames = new Set([
      ...(prevInv.equipment || []).map(i => (typeof i === 'string' ? i : i.name)),
      ...(prevInv.consumables || []).map(i => (typeof i === 'string' ? i : i.name)),
    ]);
    const toAdd = (parsed.loot.items || []).filter(item => !existingNames.has(item.name));

    if (hasStatusWindow) {
      // Status window already applied the correct currency totals — only merge items
      next.inventory = {
        ...prevInv,
        equipment: toAdd.length > 0 ? [...(prevInv.equipment || []), ...toAdd] : prevInv.equipment,
      };
    } else {
      // No status window this turn — apply stones and cash delta from the loot block
      const prevStones = prevCur.magicStones || { E: 0, D: 0, C: 0, B: 0, A: 0, S: 0 };
      const newStones = { ...prevStones };
      Object.entries(parsed.loot.magicStones || {}).forEach(([rank, count]) => {
        if (count > 0) newStones[rank] = (newStones[rank] || 0) + count;
      });
      const newCash = (prevCur.cash || 0) + (parsed.loot.cash || 0);
      next.inventory = {
        ...prevInv,
        equipment: toAdd.length > 0 ? [...(prevInv.equipment || []), ...toAdd] : prevInv.equipment,
        currency: { cash: newCash, magicStones: newStones },
      };
    }
  }

  // Merge quest log — upsert active by name, append completed/failed
  if (parsed.questLog) {
    const ql = parsed.questLog;
    const prevQ = next.quests || { active: [], completed: [], failed: [] };

    const upsertQuests = (prevList, incoming) => {
      if (!incoming || incoming.length === 0) return prevList;
      const incomingNames = new Set(incoming.map((q) => q.name));
      const retained = (prevList || []).filter((q) => {
        const name = typeof q === 'string' ? q : q.name;
        return !incomingNames.has(name);
      });
      return [...retained, ...incoming];
    };

    const appendUnique = (prevList, incoming) => {
      if (!incoming || incoming.length === 0) return prevList;
      const prevNames = new Set((prevList || []).map((q) => (typeof q === 'string' ? q : q.name)));
      const toAdd = incoming.filter((q) => !prevNames.has(q.name));
      return [...(prevList || []), ...toAdd];
    };

    next.quests = {
      active: upsertQuests(prevQ.active, ql.active),
      completed: appendUnique(prevQ.completed, ql.completed),
      failed: appendUnique(prevQ.failed, ql.failed),
    };

    // Remove from active any quests that moved to completed or failed
    const doneNames = new Set([
      ...(ql.completed || []).map((q) => q.name),
      ...(ql.failed || []).map((q) => q.name),
    ]);
    if (doneNames.size > 0) {
      next.quests.active = next.quests.active.filter((q) => {
        const name = typeof q === 'string' ? q : q.name;
        return !doneNames.has(name);
      });
    }
  }

  // Append world event (dedupe by description)
  if (parsed.worldEvent) {
    const prevEvents = next.worldEvents || [];
    const alreadyExists = prevEvents.some((e) => {
      const d = typeof e === 'string' ? e : e.description;
      return d === parsed.worldEvent.description;
    });
    if (!alreadyExists) {
      next.worldEvents = [...prevEvents, parsed.worldEvent];
    }
  }

  // NPC upsert by name — merge incoming NPC records into the roster
  // Also handles "Previously Known As" for when a character's real name is revealed
  if (parsed.npcUpdate && parsed.npcUpdate.npcs?.length > 0) {
    const prevNPCs = next.npcs || [];
    const incoming = parsed.npcUpdate.npcs;

    // Build set of names to remove (includes both new names and old placeholder names)
    const namesToRemove = new Set();
    incoming.forEach((n) => {
      namesToRemove.add(n.name.toLowerCase());
      if (n.previousName) namesToRemove.add(n.previousName.toLowerCase());
    });

    // Keep NPCs not affected by this update
    const retained = prevNPCs.filter((n) => !namesToRemove.has(n.name.toLowerCase()));

    // Merge each incoming NPC — try to find existing by real name OR previousName
    const merged = incoming.map((newNPC) => {
      const existing =
        prevNPCs.find((n) => n.name.toLowerCase() === newNPC.name.toLowerCase()) ||
        (newNPC.previousName
          ? prevNPCs.find((n) => n.name.toLowerCase() === newNPC.previousName.toLowerCase())
          : null);

      if (existing) {
        // Append new memory entry if provided (never overwrite memoryLog)
        const prevMemory = existing.memoryLog || [];
        const incomingMemory = newNPC.memory;
        const updatedMemoryLog = incomingMemory && !prevMemory.includes(incomingMemory)
          ? [...prevMemory, incomingMemory]
          : prevMemory;

        return {
          ...existing,
          name: newNPC.name,
          relationship: newNPC.relationship || existing.relationship,
          relationshipTier: newNPC.relationshipTier || existing.relationshipTier,
          status: newNPC.status || existing.status,
          faction: newNPC.faction || existing.faction,
          lastSeen: newNPC.lastSeen || existing.lastSeen,
          notes: newNPC.notes || existing.notes,
          isRomantic: newNPC.isRomantic !== undefined ? newNPC.isRomantic : existing.isRomantic,
          vulnerability: newNPC.vulnerability !== null ? newNPC.vulnerability : existing.vulnerability,
          personalArc: newNPC.personalArc || existing.personalArc,
          arcStage: newNPC.arcStage || existing.arcStage,
          memoryLog: updatedMemoryLog,
          lastInteraction: new Date().toISOString(),
          deathInfo: newNPC.deathInfo || existing.deathInfo,
        };
      }
      // New NPC — seed memoryLog from the one-shot memory field
      return {
        ...newNPC,
        memoryLog: newNPC.memory ? [newNPC.memory] : [],
      };
    });

    next.npcs = [...retained, ...merged];
  }

  // ── NPC Arc: update arc stage + append memory on the named NPC ───────────────
  if (parsed.npcArc && parsed.npcArc.name) {
    const arc = parsed.npcArc;
    const prevNPCs = next.npcs || [];
    const idx = prevNPCs.findIndex((n) => n.name.toLowerCase() === arc.name.toLowerCase());
    if (idx !== -1) {
      const existing = prevNPCs[idx];
      const updatedMemoryLog = existing.memoryLog
        ? [...existing.memoryLog, arc.memoryAdded].filter(Boolean)
        : arc.memoryAdded ? [arc.memoryAdded] : [];
      next.npcs = [
        ...prevNPCs.slice(0, idx),
        {
          ...existing,
          arcStage: arc.arcStage || existing.arcStage,
          personalArc: arc.event ? (arc.event) : existing.personalArc,
          memoryLog: updatedMemoryLog,
          lastInteraction: new Date().toISOString(),
        },
        ...prevNPCs.slice(idx + 1),
      ];
    }
  }

  // ── Daily Quest: new quest issuance ──────────────────────────────────────────
  if (parsed.dailyQuest) {
    const today = new Date().toISOString().split('T')[0];
    next.dailyQuests = {
      ...(next.dailyQuests || {}),
      issuedDate: today,
      tasks: parsed.dailyQuest.tasks,
      deadline: parsed.dailyQuest.deadline,
      allComplete: false,
      bonusXP: 0,
      penaltyActive: false,
      penaltyCleared: false,
    };
  }

  // ── Daily Quest Update: mark tasks complete, handle all-complete / penalty cleared ─
  if (parsed.dailyQuestUpdate && next.dailyQuests) {
    const update = parsed.dailyQuestUpdate;
    const dq = { ...next.dailyQuests };

    // Mark a specific completed task
    if (update.completedTask) {
      dq.tasks = (dq.tasks || []).map((t) =>
        t.description.toLowerCase() === update.completedTask.toLowerCase()
          ? { ...t, completed: true }
          : t
      );
    }

    if (update.allComplete) {
      dq.allComplete = true;
      dq.tasks = (dq.tasks || []).map((t) => ({ ...t, completed: true }));
      if (update.bonusXP) dq.bonusXP = update.bonusXP;
    }

    if (update.penaltyCleared) {
      dq.penaltyActive = false;
      dq.penaltyCleared = true;
      if (update.bonusXP) dq.bonusXP = update.bonusXP;
    }

    next.dailyQuests = dq;
  }

  // ── Penalty Zone activation ───────────────────────────────────────────────────
  if (parsed.penaltyZone && next.dailyQuests) {
    next.dailyQuests = {
      ...next.dailyQuests,
      penaltyActive: true,
    };
  }

  // ── Shadow Army: upsert by name ───────────────────────────────────────────────
  if (parsed.shadowArmy && parsed.shadowArmy.soldiers?.length > 0) {
    const prevArmy = next.shadowArmy || [];
    const incoming = parsed.shadowArmy.soldiers;

    const namesToRemove = new Set(incoming.map((s) => s.name.toLowerCase()));
    const retained = prevArmy.filter((s) => !namesToRemove.has(s.name.toLowerCase()));

    const merged = incoming.map((newSoldier) => {
      const existing = prevArmy.find((s) => s.name.toLowerCase() === newSoldier.name.toLowerCase());
      if (existing) return { ...existing, ...newSoldier };
      return newSoldier;
    });

    // Keep all soldiers — lost ones stay in the array with status "Lost" so the
    // ShadowArmyPanel can render the FALLEN section. Filtering them out here was
    // preventing that section from ever having content.
    next.shadowArmy = [...retained, ...merged];
  }

  // ── Shadow Protocol: fire unlock flag when STAGE = UNLOCKED ──────────────────
  if (parsed.shadowProtocol?.stage === 'unlocked' && next.playerState) {
    next.playerState = { ...next.playerState, shadowProtocolUnlocked: true };
  }

  // ── City Update: upsert zone + log overflow event ─────────────────────────────
  if (parsed.cityUpdate) {
    const cu = parsed.cityUpdate;
    const prevCity = next.cityState || { dangerLevel: 'Low', zones: [], overflowEvents: [], gateActivity: [] };
    // Update danger level if provided
    const newDanger = cu.dangerLevel || prevCity.dangerLevel;
    // Upsert the named zone
    let zones = [...(prevCity.zones || [])];
    if (cu.zone && cu.zoneStatus) {
      const zIdx = zones.findIndex((z) => z.name.toLowerCase() === cu.zone.toLowerCase());
      const zEntry = { name: cu.zone, status: cu.zoneStatus, lastEvent: cu.event };
      if (zIdx !== -1) zones[zIdx] = zEntry; else zones.push(zEntry);
    }
    // Log overflow events
    let overflowEvents = [...(prevCity.overflowEvents || [])];
    if (cu.isOverflow && cu.zone) {
      overflowEvents = [
        ...overflowEvents,
        { date: new Date().toISOString(), zone: cu.zone, damage: cu.event, casualties: null, status: 'active' },
      ];
    }
    next.cityState = { ...prevCity, dangerLevel: newDanger, zones, overflowEvents };
  }

  // ── Market Update: update price index + trend for the named rank ──────────────
  if (parsed.marketUpdate) {
    const mu = parsed.marketUpdate;
    if (mu.stone && /^[EDCBAS]$/.test(mu.stone)) {
      const prevMarket = next.market || { stonePrices: {}, priceIndex: {}, trend: {}, lastUpdated: null };
      const newPrices = { ...prevMarket.stonePrices };
      const newTrend = { ...prevMarket.trend };
      if (mu.price) newPrices[mu.stone] = mu.price;
      if (mu.direction) newTrend[mu.stone] = mu.direction.toLowerCase();
      next.market = { ...prevMarket, stonePrices: newPrices, trend: newTrend, lastUpdated: new Date().toISOString() };
    }
  }

  // ── Contract Available: add to activeContracts ───────────────────────────────
  if (parsed.contractAvailable?.name) {
    const ca = parsed.contractAvailable;
    const prevEcon = next.economy || { expenses: {}, contractHistory: [], activeContracts: [] };
    const alreadyListed = (prevEcon.activeContracts || []).some(
      (c) => c.name.toLowerCase() === ca.name.toLowerCase(),
    );
    if (!alreadyListed) {
      next.economy = {
        ...prevEcon,
        activeContracts: [
          ...(prevEcon.activeContracts || []),
          { name: ca.name, rank: ca.rank, reward: ca.reward, deadline: ca.deadline, sponsor: ca.sponsor, status: 'available' },
        ],
      };
    }
  }

  // ── Contract Result: move from active → history ──────────────────────────────
  if (parsed.contractResult?.name) {
    const cr = parsed.contractResult;
    const prevEcon = next.economy || { expenses: {}, contractHistory: [], activeContracts: [] };
    const active = (prevEcon.activeContracts || []).filter(
      (c) => c.name.toLowerCase() !== cr.name.toLowerCase(),
    );
    const histEntry = {
      name: cr.name, outcome: cr.outcome, reward: cr.reward, penalty: cr.penalty,
      completedDate: new Date().toISOString(),
    };
    next.economy = {
      ...prevEcon,
      activeContracts: active,
      contractHistory: [...(prevEcon.contractHistory || []), histEntry],
    };
  }

  // ── Rival Sighting: update the rival's NPC entry ──────────────────────────────
  if (parsed.rivalSighting?.name) {
    const rs = parsed.rivalSighting;
    const prevNPCs = next.npcs || [];
    const idx = prevNPCs.findIndex((n) => n.name.toLowerCase() === rs.name.toLowerCase());
    const rivalEntry = {
      ...(idx !== -1 ? prevNPCs[idx] : {}),
      name: rs.name,
      rank: rs.rank,
      lastSeen: rs.lastKnownLocation || rs.location,
      notes: rs.reaction || rs.context,
      relationship: 'Rival',
      status: 'Active',
    };
    if (idx !== -1) {
      next.npcs = [...prevNPCs.slice(0, idx), rivalEntry, ...prevNPCs.slice(idx + 1)];
    } else {
      next.npcs = [...prevNPCs, rivalEntry];
    }
    // Also update rivalHunter record
    next.rivalHunter = { ...(next.rivalHunter || {}), name: rs.name, rank: rs.rank, lastSeen: rs.lastKnownLocation };
  }

  // ── Rank Ceremony: bump fearIndex on public rank events ──────────────────────
  if (parsed.rankCeremony && next.playerState) {
    const bump = parsed.rankCeremony.mediaCoverage ? 8 : 4;
    next.playerState = {
      ...next.playerState,
      fearIndex: Math.min(100, (next.playerState.fearIndex || 0) + bump),
    };
  }

  // ── Hunter Registry: upsert entries ──────────────────────────────────────────
  if (parsed.hunterRegistry?.entries?.length > 0) {
    const incoming = parsed.hunterRegistry.entries;
    const prevReg = next.hunterRegistry || [];
    const names = new Set(incoming.map((e) => e.name.toLowerCase()));
    const retained = prevReg.filter((e) => !names.has(e.name.toLowerCase()));
    next.hunterRegistry = [...retained, ...incoming];
  }

  // ── Phase 5: Bestiary Update — upsert by monster name ────────────────────────
  if (parsed.bestiaryUpdate?.monster) {
    const bu = parsed.bestiaryUpdate;
    const key = bu.monster.toLowerCase();
    const prevBestiary = next.bestiary || {};
    const existing = prevBestiary[key] || {};
    next.bestiary = {
      ...prevBestiary,
      [key]: {
        name: bu.monster,
        rank: bu.rank || existing.rank || 'E',
        origin: bu.origin || existing.origin,
        biology: bu.biology || existing.biology,
        behavior: bu.behavior || existing.behavior,
        weakness: (bu.weakness && bu.weakness !== 'Unknown') ? bu.weakness : existing.weakness || 'Unknown',
        killCount: Math.max(bu.killCount || 0, existing.killCount || 0),
        firstSeen: existing.firstSeen || new Date().toISOString(),
      },
    };
  }

  // ── Phase 5: Unique Item — upsert into inventory.equipment or artifacts ───────
  if (parsed.uniqueItem?.name) {
    const ui = parsed.uniqueItem;
    const prevInv = next.inventory || { equipment: [], consumables: [], artifacts: [], currency: { cash: 0, magicStones: {} } };
    const targetList = ui.type === 'Artifact' ? 'artifacts' : 'equipment';
    const existingList = prevInv[targetList] || [];
    const alreadyHas = existingList.some((i) => (typeof i === 'string' ? i : i.name) === ui.name);
    if (!alreadyHas) {
      next.inventory = {
        ...prevInv,
        [targetList]: [...existingList, { name: ui.name, rank: ui.rank, type: ui.type, lore: ui.lore, passive: ui.passive, hook: ui.hook, set: ui.set, isUnique: true }],
      };
    }
  }

  // ── Phase 5: Set Bonus — upsert activeSetBonuses on playerState ───────────────
  if (parsed.setBonus?.setName && next.playerState) {
    const sb = parsed.setBonus;
    const prevBonuses = next.playerState.activeSetBonuses || [];
    const idx = prevBonuses.findIndex((b) => b.setName.toLowerCase() === sb.setName.toLowerCase());
    let updatedBonuses;
    if (sb.active) {
      const entry = { setName: sb.setName, bonus: sb.bonus, pieces: sb.pieces };
      if (idx !== -1) {
        updatedBonuses = [...prevBonuses.slice(0, idx), entry, ...prevBonuses.slice(idx + 1)];
      } else {
        updatedBonuses = [...prevBonuses, entry];
      }
    } else {
      updatedBonuses = prevBonuses.filter((b) => b.setName.toLowerCase() !== sb.setName.toLowerCase());
    }
    next.playerState = { ...next.playerState, activeSetBonuses: updatedBonuses };
  }

  // ── Phase 5: Gate Record — upsert gate records ────────────────────────────────
  if (parsed.gateRecord?.name) {
    const gr = parsed.gateRecord;
    const prevRecords = next.gateRecords || [];
    const idx = prevRecords.findIndex((r) => r.name.toLowerCase() === gr.name.toLowerCase());
    if (idx !== -1) {
      next.gateRecords = [...prevRecords.slice(0, idx), { ...prevRecords[idx], ...gr }, ...prevRecords.slice(idx + 1)];
    } else {
      next.gateRecords = [...prevRecords, gr];
    }
  }

  // ── Phase 5: Gear Aesthetic — update playerState.gearAesthetic ───────────────
  if (parsed.gearAesthetic?.description && next.playerState) {
    next.playerState = { ...next.playerState, gearAesthetic: parsed.gearAesthetic.description };
  }

  // ── Phase 6: Stat Milestone — append to playerState.statMilestones ───────────
  if (parsed.statMilestone?.stat && next.playerState) {
    const prevMilestones = next.playerState.statMilestones || [];
    const alreadyExists = prevMilestones.some(
      (m) => m.stat === parsed.statMilestone.stat && m.value === parsed.statMilestone.value,
    );
    if (!alreadyExists) {
      next.playerState = {
        ...next.playerState,
        statMilestones: [...prevMilestones, parsed.statMilestone],
      };
    }
  }

  // ── Phase 6: System Tier Unlock — advance playerState.systemTier ─────────────
  if (parsed.systemTierUnlock?.tier && next.playerState) {
    const currentTier = next.playerState.systemTier || 1;
    if (parsed.systemTierUnlock.tier > currentTier) {
      next.playerState = { ...next.playerState, systemTier: parsed.systemTierUnlock.tier };
    }
  }

  // ── Phase 6: Title Passive — store in playerState.titlePassives ──────────────
  // titleUnlocked already handled earlier; extract the passive if present
  if (parsed.titleUnlocked?.title && parsed.titleUnlocked?.passive && next.playerState) {
    const prevPassives = next.playerState.titlePassives || {};
    if (!prevPassives[parsed.titleUnlocked.title]) {
      next.playerState = {
        ...next.playerState,
        titlePassives: { ...prevPassives, [parsed.titleUnlocked.title]: parsed.titleUnlocked.passive },
      };
    }
  }

  // ── Phase 6: Achievement — append to achievements array ───────────────────────
  if (parsed.achievement?.title) {
    const prevAch = next.achievements || [];
    const alreadyExists = prevAch.some((a) => a.title === parsed.achievement.title);
    if (!alreadyExists) {
      next.achievements = [...prevAch, parsed.achievement];
    }
  }

  // ── Phase 4: News Feed — append unique headline ───────────────────────────────
  if (parsed.newsFeed?.headline) {
    const prevFeed = next.newsFeed || [];
    const alreadyExists = prevFeed.some((n) => n.headline === parsed.newsFeed.headline);
    if (!alreadyExists) {
      next.newsFeed = [...prevFeed, parsed.newsFeed];
    }
  }

  // ── Phase 4: Memory Fragment — append to playerState.flashbacks ───────────────
  if (parsed.memoryFragment?.content && next.playerState) {
    const prevFlashbacks = next.playerState.flashbacks || [];
    next.playerState = {
      ...next.playerState,
      flashbacks: [...prevFlashbacks, { title: parsed.memoryFragment.title, content: parsed.memoryFragment.content, timestamp: parsed.memoryFragment.timestamp }],
    };
  }

  // ── Phase 4: Belief Shift — append to playerState.beliefShifts ───────────────
  if (parsed.beliefShift?.shift && next.playerState) {
    const prevShifts = next.playerState.beliefShifts || [];
    next.playerState = {
      ...next.playerState,
      beliefShifts: [...prevShifts, { shift: parsed.beliefShift.shift, tone: parsed.beliefShift.tone, timestamp: parsed.beliefShift.timestamp }],
    };
  }

  // ── Phase 4: System Anomaly — increment truthDripCount ───────────────────────
  if (parsed.systemAnomaly && next.playerState) {
    next.playerState = {
      ...next.playerState,
      truthDripCount: (next.playerState.truthDripCount || 0) + 1,
    };
  }

  // ── Phase 4: Legend Entry — append to playerState.legendEntries ──────────────
  if (parsed.legendEntry?.entry && next.playerState) {
    const prevLegend = next.playerState.legendEntries || [];
    next.playerState = {
      ...next.playerState,
      legendEntries: [...prevLegend, { entry: parsed.legendEntry.entry, witnesses: parsed.legendEntry.witnesses, effect: parsed.legendEntry.effect, timestamp: parsed.legendEntry.timestamp }],
    };
  }

  // ── Phase 4: Lore Codex + Origin Clue — append to codex array ────────────────
  if (parsed.loreCodex?.entry) {
    const prevCodex = next.codex || [];
    next.codex = [...prevCodex, { title: parsed.loreCodex.title, entry: parsed.loreCodex.entry, category: parsed.loreCodex.category, timestamp: parsed.loreCodex.timestamp }];
  }
  if (parsed.originClue?.entry) {
    const prevCodex = next.codex || [];
    next.codex = [...prevCodex, { title: parsed.originClue.title, entry: parsed.originClue.entry, category: 'origin', timestamp: parsed.originClue.timestamp }];
  }

  // ── Shadow Extraction Result: add newly extracted shadow to army ──────────────
  // Only fires if no [ SHADOW ARMY ] block was also present (that block is authoritative).
  if (parsed.shadowExtractionResult?.success && !parsed.shadowArmy) {
    const { target, grade, personality } = parsed.shadowExtractionResult;
    if (target) {
      const prevArmy = next.shadowArmy || [];
      const alreadyExists = prevArmy.some(
        (s) => s.name.toLowerCase() === target.toLowerCase(),
      );
      if (!alreadyExists) {
        next.shadowArmy = [
          ...prevArmy,
          {
            name: target,
            grade: grade || 'Private',
            origin: target,
            status: 'active',
            extractedAt: next.playerState?.location || null,
            notes: null,
            isGeneral: false,        // caller can promote to General via nameGeneral()
            customName: null,
            deploymentState: 'standby',
            personality: personality || null,
            promotionXP: 0,
            assignedTask: null,
            extractionRank: null,
            killCount: 0,
            firstExtractedAt: new Date().toISOString(),
          },
        ];
      }
    }
  }

  return next;
}

// ─── Compute Expected XP Gain (client-side enforcement) ──────────────────────
// Called every turn to detect XP that Claude SHOULD have awarded but missed.
//
// Sources scanned:
//   - [ LOOT ] magic stones — each stone of rank R = one slain creature of rank R
//   - [ QUEST LOG ] — quests newly moved to completed/failed (cross-reference prev list)
//   - [ QUEST LOG ] active quests — newly checked-off objectives (cross-ref by quest+obj)
//
// The caller compares this expected delta against Claude's actual XP delta and
// tops up the shortfall. If Claude awarded more than expected, no top-up happens.
//
// Returns: { total: number, breakdown: { kills, quests, objectives, source[] } }
export function computeExpectedXPGain(parsed, prevState) {
  const breakdown = { kills: 0, quests: 0, objectives: 0, sources: [] };
  let total = 0;

  // ── 1. Kills via [ LOOT ] block ────────────────────────────────────────────
  // Prefer the explicit "XP Awarded:" field from the loot block — it's Claude's
  // own accounting and is more accurate than estimating from stone counts.
  // Fall back to stone-count estimation only if that field is absent.
  if (parsed?.loot) {
    if (parsed.loot.xpAwarded > 0) {
      total += parsed.loot.xpAwarded;
      breakdown.kills += parsed.loot.xpAwarded;
      breakdown.sources.push(`Loot XP Awarded: +${parsed.loot.xpAwarded} XP`);
    } else if (parsed.loot.magicStones) {
      // Fallback: estimate from stone counts (one stone ≈ one kill of that rank)
      for (const [rank, count] of Object.entries(parsed.loot.magicStones)) {
        if (count > 0 && KILL_XP_TABLE[rank]) {
          const xp = KILL_XP_TABLE[rank] * count;
          total += xp;
          breakdown.kills += xp;
          breakdown.sources.push(`${count} ${rank}-rank kill${count > 1 ? 's' : ''} (+${xp} XP)`);
        }
      }
    }
  }

  // ── 2. Quest completions / failures ────────────────────────────────────────
  if (parsed?.questLog) {
    const prevCompletedNames = new Set(
      (prevState?.quests?.completed || []).map((q) => (typeof q === 'string' ? q : q.name)),
    );
    const prevFailedNames = new Set(
      (prevState?.quests?.failed || []).map((q) => (typeof q === 'string' ? q : q.name)),
    );

    for (const q of parsed.questLog.completed || []) {
      if (!prevCompletedNames.has(q.name)) {
        total += QUEST_COMPLETION_XP;
        breakdown.quests += QUEST_COMPLETION_XP;
        breakdown.sources.push(`Quest "${q.name}" completed (+${QUEST_COMPLETION_XP} XP)`);
      }
    }
    for (const q of parsed.questLog.failed || []) {
      if (!prevFailedNames.has(q.name)) {
        total += QUEST_FAIL_XP;
        breakdown.quests += QUEST_FAIL_XP;
        breakdown.sources.push(`Quest "${q.name}" survived/failed (+${QUEST_FAIL_XP} XP)`);
      }
    }

    // ── 3. Objective completions on active quests ───────────────────────────
    // Diff incoming active quests vs prior active list (matched by name).
    // Count objectives newly flipped from incomplete → completed.
    const prevActiveByName = new Map(
      (prevState?.quests?.active || []).map((q) => [
        typeof q === 'string' ? q : q.name,
        q,
      ]),
    );
    for (const newQ of parsed.questLog.active || []) {
      const prevQ = prevActiveByName.get(newQ.name);
      if (!prevQ || typeof prevQ === 'string') continue;
      const prevDone = new Set(
        (prevQ.objectives || []).filter((o) => o.completed).map((o) => o.text),
      );
      const newlyCompleted = (newQ.objectives || []).filter(
        (o) => o.completed && !prevDone.has(o.text),
      ).length;
      if (newlyCompleted > 0) {
        const xp = newlyCompleted * OBJECTIVE_XP;
        total += xp;
        breakdown.objectives += xp;
        breakdown.sources.push(
          `${newlyCompleted} objective${newlyCompleted > 1 ? 's' : ''} cleared in "${newQ.name}" (+${xp} XP)`,
        );
      }
    }
  }

  return { total, breakdown };
}
