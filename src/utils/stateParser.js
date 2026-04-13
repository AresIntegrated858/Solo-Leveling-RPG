// State Parser — scans Claude API responses for System UI blocks
// Returns structured diff objects. Never crashes on malformed input.

// ─── XP Curve ────────────────────────────────────────────────────────────────
// Returns XP needed to advance FROM the given level (e.g. xpToNextLevel(1) = 100)
export function xpToNextLevel(level) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

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
  };
}

// ─── Extract Block Content ───────────────────────────────────────────────────

function extractBlock(text, startPattern) {
  try {
    const startRe = new RegExp(startPattern, 'i');
    const startIdx = text.search(startRe);
    if (startIdx === -1) return null;

    const afterStart = text.slice(startIdx);

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
  const re = new RegExp(`^${key}:\\s*(.+)`, 'im');
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
  // Match "Key:\n- item1\n- item2" OR "Key: item1, item2"
  const sectionRe = new RegExp(`${key}:\\s*\\n((?:[^\\n]+\\n?)+?)(?=\\n[A-Z]|\\n\\n|$)`, 'im');
  const m = block.match(sectionRe);
  if (m) {
    return m[1]
      .split('\n')
      .map((l) => l.replace(/^[\s\-–•·]+/, '').trim())
      .filter((l) => l && l !== '—' && l !== '-' && l !== 'None');
  }
  // Fallback: "Key: value on same line"
  const inline = new RegExp(`${key}:\\s*(.+)`, 'im');
  const im = block.match(inline);
  if (im) {
    const val = im[1].trim();
    if (val === '—' || val === '-') return [];
    return [val];
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

    // Reputation — look for sub-fields (handles parenthetical branch names like "Hunter Association (Tampa Bay): Neutral")
    const repAssocMatch = block.match(/Hunter\s+Association(?:\s*\([^)]*\))?\s*:\s*(.+)/i);
    const repGuildsMatch = block.match(/Guilds?(?:\s*\([^)]*\))?\s*:\s*(.+)/i);
    const repCivilianMatch = block.match(/Civilian\s+(?:Public|Population)(?:\s*\([^)]*\))?\s*:\s*(.+)/i);

    const levelVal = getField(block, 'Level');

    // ── Active Skills ── parse "- Skill Name (Type)" entries
    const rawActiveSkills = getListField(block, 'Active Skills');
    const activeSkills = rawActiveSkills
      .filter((s) => s && s !== 'None' && s !== '—')
      .map((s) => {
        const typeMatch = s.match(/^(.+?)\s*\((\w+)\)\s*$/);
        if (typeMatch) {
          return { name: typeMatch[1].trim(), type: typeMatch[2].trim() };
        }
        return { name: s.trim(), type: 'Unknown' };
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

    // Currency: detect "$XX cash" or "XX gold" in equipment list
    let currency = null;
    const allItems = [...equipment, ...consumables];
    const cashItem = allItems.find((i) => /\$\d+|\bcash\b|\bgold\b|\bcrystals?\b/i.test(i.name));
    if (cashItem) {
      const goldMatch = cashItem.name.match(/\$?(\d+)/);
      if (goldMatch) currency = { gold: parseInt(goldMatch[1], 10), crystals: 0 };
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
      currency,
      location: getField(block, 'Current Location'),
      currentTime: getField(block, 'Current Time'),
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

    const parseQuestList = (sectionText) => {
      if (!sectionText) return [];
      const quests = [];
      const lines = sectionText.split('\n').map((l) => l.trim()).filter(Boolean);
      let current = null;
      for (const line of lines) {
        // Quest bullet: "- Name: description" or "- Name"
        if (/^[-–•]\s+/.test(line)) {
          if (current) quests.push(current);
          const raw = line.replace(/^[-–•]\s+/, '').trim();
          const colonIdx = raw.indexOf(':');
          if (colonIdx > 0 && colonIdx < 50) {
            current = { name: raw.slice(0, colonIdx).trim(), description: raw.slice(colonIdx + 1).trim(), objectives: [] };
          } else {
            current = { name: raw, description: '', objectives: [] };
          }
          continue;
        }
        // Objective line: "[ ] text" or "[x] text" or "  - text"
        if (current && /\[\s*[xX✓ ]\s*\]/.test(line)) {
          const completed = /\[[xX✓]\]/.test(line);
          const objText = line.replace(/\[\s*[xX✓ ]\s*\]/, '').replace(/^[-–•\s]+/, '').trim();
          if (objText) current.objectives.push({ text: objText, completed });
          continue;
        }
        // Continuation / sub-description attached to current quest
        if (current && !/^[A-Z]/.test(line)) {
          current.description = (current.description ? current.description + ' ' : '') + line;
        }
      }
      if (current) quests.push(current);
      return quests;
    };

    // Extract named sections from the block
    const getSectionText = (header) => {
      const re = new RegExp(`${header}\\s*:?\\s*\\n([\\s\\S]*?)(?=\\n[A-Z][a-zA-Z ]+:|$)`, 'i');
      const m = block.match(re);
      return m ? m[1] : null;
    };

    const activeText = getSectionText('Active(?:\\s+Quests?)?') || getSectionText('Active');
    const completedText = getSectionText('Completed(?:\\s+Quests?)?') || getSectionText('Completed');
    const failedText = getSectionText('Failed(?:\\s+Quests?)?') || getSectionText('Failed');

    // Fallback: if no sections found, treat entire block as active quests
    const hasAnySections = activeText || completedText || failedText;
    const fallbackText = !hasAnySections ? block : null;

    return {
      rawBlock: block,
      active: parseQuestList(activeText || fallbackText || ''),
      completed: parseQuestList(completedText || ''),
      failed: parseQuestList(failedText || ''),
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

        if (!name) continue;
        // Deduplicate by name — last entry wins if the same name appears multiple times
        const existingIdx = allNPCs.findIndex((n) => n.name.toLowerCase() === name.toLowerCase());
        const entry = { name, relationship, status, faction, lastSeen, notes };
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
      level: sw.level !== null ? sw.level : prev.level,
      // HP/MP/Stamina: use parsed value if it has valid numbers, else keep prev
      hp: (sw.hp && !isNaN(sw.hp.current)) ? sw.hp : prev.hp,
      mp: (sw.mp && !isNaN(sw.mp.current)) ? sw.mp : prev.mp,
      stamina: (sw.stamina && !isNaN(sw.stamina.current)) ? sw.stamina : prev.stamina,
      stats: updatedStats,
      titles: sw.titles && sw.titles.length > 0 ? sw.titles : prev.titles,
      traits: sw.traits && sw.traits.length > 0 ? sw.traits : prev.traits,
      // Guard empty array — only replace if Claude actually listed effects
      statusEffects: sw.statusEffects && sw.statusEffects.length > 0 ? sw.statusEffects : prev.statusEffects || [],
      xp: (sw.xp && !isNaN(sw.xp.current)) ? sw.xp : prev.xp,
      location: sw.location || prev.location,
      currentTime: sw.currentTime || prev.currentTime,
      reputation: {
        hunterAssociation: sw.reputationHunterAssociation || prev.reputation?.hunterAssociation,
        guilds: sw.reputationGuilds || prev.reputation?.guilds,
        civilianPublic: sw.reputationCivilian || prev.reputation?.civilianPublic,
      },
      rawStatusBlock: sw.rawBlock || prev.rawStatusBlock,
    };
  }

  // ── Skills: two-pass upsert ──────────────────────────────────────────────────
  // Pass 1: STATUS WINDOW activeSkills → lightweight entries for newly-seen skills only
  // Pass 2: SKILL DIRECTORY → rich detail entries, always overwrite by name

  let skillsWorking = Array.isArray(next.skills) ? [...next.skills] : [];

  if (parsed.statusWindow?.activeSkills?.length > 0) {
    const existingNames = new Set(skillsWorking.map((s) => (typeof s === 'string' ? s : s.name)));
    const toAdd = parsed.statusWindow.activeSkills
      .filter((s) => s.name && !existingNames.has(s.name))
      .map((s) => ({
        name: s.name,
        type: s.type || 'Unknown',
        rank: '—',
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
        currency: sw.currency || prevInv.currency || { gold: 0, crystals: 0 },
      };
    }
  }

  // ── itemAcquired: merge newly acquired items (additive, for any [ ITEM ACQUIRED ] blocks)
  if (parsed.itemAcquired && parsed.itemAcquired.items?.length > 0) {
    const prevInv = next.inventory || { equipment: [], consumables: [], artifacts: [], currency: { gold: 0, crystals: 0 } };
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
  if (parsed.npcUpdate && parsed.npcUpdate.npcs?.length > 0) {
    const prevNPCs = next.npcs || [];
    const incoming = parsed.npcUpdate.npcs;
    const incomingNames = new Set(incoming.map((n) => n.name.toLowerCase()));
    // Keep existing NPCs not mentioned in this update (their data doesn't change)
    const retained = prevNPCs.filter((n) => !incomingNames.has(n.name.toLowerCase()));
    // Merge: for each incoming NPC, if they already existed, merge fields
    const merged = incoming.map((newNPC) => {
      const existing = prevNPCs.find((n) => n.name.toLowerCase() === newNPC.name.toLowerCase());
      if (existing) {
        // Prefer new data for changed fields, keep old data for unchanged (null) fields
        return {
          ...existing,
          relationship: newNPC.relationship || existing.relationship,
          status: newNPC.status || existing.status,
          faction: newNPC.faction || existing.faction,
          lastSeen: newNPC.lastSeen || existing.lastSeen,
          notes: newNPC.notes || existing.notes,
        };
      }
      return newNPC;
    });
    next.npcs = [...retained, ...merged];
  }

  return next;
}
