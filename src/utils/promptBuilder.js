// Prompt Builder — constructs session context strings for Claude API
// Used on session resume to reconstruct game state accurately

export function buildCharacterCreationMessage(answers) {
  return `CHARACTER CREATION COMPLETE.

Hunter Profile:
Name: ${answers.q1 || '—'}
Age: ${answers.q2 || '—'}
Gender: ${answers.q3 || '—'}
Background: ${answers.q4 || '—'}
Under Pressure: ${answers.q5 || '—'}
Risk Tolerance: ${answers.q6 || '—'}
Moral Line: ${answers.q7 || '—'}
Combat Preference: ${answers.q8 || '—'}
Team/Solo: ${answers.q9 || '—'}
Short-term Goal: ${answers.q10 || '—'}
Long-term Drive: ${answers.q11 || '—'}
Greatest Strength: ${answers.q12 || '—'}
Most Dangerous Weakness: ${answers.q13 || '—'}
Real-World Home City: ${answers.q14 || '—'}

IMPORTANT — GEOGRAPHIC ANCHOR: The Hunter's simulation is grounded in ${answers.q14 || 'their home city'}. All gates, dungeon locations, guild offices, Hunter Association branches, and world events should be realistically placed in and around this city and its surrounding region. Use accurate real-world geography, landmarks, districts, and neighboring cities for this location. The Hunter Association's local branch, the first gates, early missions, and NPC encounters should all feel native to this specific place.

Generate the starting Player State Window. Set Current Location to the exact city. Assign starting rank based on background. Establish opening world context rooted in ${answers.q14 || 'the home city'}. Then begin the simulation.`;
}

export function buildSessionResumePrefix() {
  return `[SESSION RESUME]
Continuing existing Hunter simulation. All prior events, stats, injuries, and world state are canon. Resume from last checkpoint without recap. Do not restart character creation.`;
}

export function buildSessionContext(saveData) {
  const {
    playerState,
    skills,
    inventory,
    sessionMeta,
    worldEvents,
    quests,
    npcs,
    shadowArmy,
    economy,
    cityState,
    market,
    rivalHunter,
    hunterRegistry,
    latestSave,
    newsFeed,
    codex,
    bestiary,
    gateRecords,
    achievements,
  } = saveData;

  const lines = ['[ SESSION RESUME CONTEXT ]'];

  lines.push(`Session: ${sessionMeta?.sessionNumber || 1}`);
  lines.push(
    `Resuming from: ${latestSave?.savedAt
      ? new Date(latestSave.savedAt).toLocaleString()
      : 'Unknown'}`
  );

  lines.push('');
  lines.push('[ CURRENT PLAYER STATE ]');
  if (playerState?.rawStatusBlock) {
    lines.push(playerState.rawStatusBlock);
  } else if (playerState) {
    lines.push(`Name: ${playerState.name || '—'}`);
    lines.push(`Rank: ${playerState.rank || '—'} | Level: ${playerState.level || 1}`);
    lines.push(`HP: ${playerState.hp?.current || '—'} / ${playerState.hp?.max || '—'}`);
    lines.push(`MP: ${playerState.mp?.current || '—'} / ${playerState.mp?.max || '—'}`);
    lines.push(`Stamina: ${playerState.stamina?.current || '—'} / ${playerState.stamina?.max || '—'}`);
    if (playerState.stats) {
      const s = playerState.stats;
      lines.push(`STR: ${s.STR} | AGI: ${s.AGI} | END: ${s.END} | INT: ${s.INT} | PER: ${s.PER} | LUCK: ${s.LUCK}`);
    }
    if (playerState.titles?.length > 0) {
      lines.push(`Titles: ${playerState.titles.join(', ')}`);
    }
    if (playerState.statusEffects?.length > 0) {
      lines.push(`Status Effects: ${playerState.statusEffects.join(', ')}`);
    }
    lines.push(`Location: ${playerState.location || '—'}`);
  }

  lines.push('');
  lines.push('[ ACTIVE SKILLS ]');
  if (skills && skills.length > 0) {
    skills.forEach((skill) => {
      lines.push(`- ${skill.name} (${skill.type}, Rank: ${skill.rank}): ${skill.currentEffect || skill.description || '—'}`);
    });
  } else {
    lines.push('None on record.');
  }

  lines.push('');
  lines.push('[ INVENTORY ]');
  if (inventory) {
    if (inventory.equipment?.length > 0) {
      lines.push(`Equipment: ${inventory.equipment.map((i) => i.name || i).join(', ')}`);
    }
    if (inventory.consumables?.length > 0) {
      lines.push(`Consumables: ${inventory.consumables.map((i) => i.name || i).join(', ')}`);
    }
    if (inventory.artifacts?.length > 0) {
      lines.push(`Artifacts: ${inventory.artifacts.map((i) => i.name || i).join(', ')}`);
    }
    if (!inventory.equipment?.length && !inventory.consumables?.length && !inventory.artifacts?.length) {
      lines.push('Nothing of note.');
    }
  } else {
    lines.push('No inventory data.');
  }

  lines.push('');
  lines.push('[ ACTIVE QUESTS ]');
  if (quests?.active?.length > 0) {
    quests.active.forEach((q) => {
      lines.push(`- ${q.name || q}: ${q.description || q.objective || '—'}`);
    });
  } else {
    lines.push('No active quests on record.');
  }

  if (quests?.completed?.length > 0) {
    lines.push(`Completed: ${quests.completed.map((q) => q.name || q).join(', ')}`);
  }

  lines.push('');
  lines.push('[ NPC RELATIONSHIPS ]');
  if (npcs && npcs.length > 0) {
    npcs.forEach((npc) => {
      lines.push(`- ${npc.name} (${npc.relationship || 'Unknown'}): ${npc.notes || '—'}`);
    });
  } else {
    lines.push('No NPC records.');
  }

  lines.push('');
  lines.push('[ WORLD STATE ]');
  if (worldEvents && worldEvents.length > 0) {
    worldEvents.forEach((evt) => {
      lines.push(`- ${evt.description || evt}`);
    });
  } else {
    lines.push('No active world events on record.');
  }

  if (playerState?.reputation) {
    lines.push('');
    lines.push('Reputation:');
    lines.push(`- Hunter Association: ${playerState.reputation.hunterAssociation || '—'}`);
    lines.push(`- Guilds: ${playerState.reputation.guilds || '—'}`);
    lines.push(`- Civilian Public: ${playerState.reputation.civilianPublic || '—'}`);
  }

  // Shadow Army — include full roster in session resume
  if (shadowArmy && shadowArmy.length > 0) {
    lines.push('');
    lines.push('[ SHADOW ARMY ]');
    const unlocked = playerState?.shadowProtocolUnlocked;
    lines.push(`Protocol: ${unlocked ? 'UNLOCKED' : 'LOCKED'}`);
    const intStat = playerState?.stats?.INT || 10;
    const maxDomain = intStat >= 100 ? 25 : intStat >= 85 ? 18 : intStat >= 60 ? 13
      : intStat >= 40 ? 9 : intStat >= 25 ? 6 : intStat >= 15 ? 4 : 2;
    const activeShadows = shadowArmy.filter((s) => s.status !== 'lost');
    const lostShadows   = shadowArmy.filter((s) => s.status === 'lost');
    lines.push(`DOMAIN: ${activeShadows.filter(s => s.deploymentState !== 'standby').length} / ${maxDomain}`);
    activeShadows.forEach((s) => {
      const tierLabel = s.isGeneral ? '[GENERAL]' : '[ARMY]';
      lines.push(`- ${tierLabel} ${s.name} (${s.grade}) | ${s.deploymentState} | ${s.personality || 'personality unknown'} | Kills: ${s.killCount || 0}`);
      if (s.assignedTask) lines.push(`  Task: ${s.assignedTask}`);
    });
    if (lostShadows.length > 0) {
      lines.push(`Fallen: ${lostShadows.map(s => s.name).join(', ')}`);
    }
  }

  // Phase 3 — Economy
  if (economy) {
    lines.push('');
    lines.push('[ ECONOMY ]');
    const cash = inventory?.currency?.cash ?? 0;
    lines.push(`Cash on hand: ${cash.toLocaleString()} won`);
    const exp = economy.expenses || {};
    const parts = [];
    if (exp.rent) parts.push(`Rent: ${exp.rent.toLocaleString()}/month`);
    if (exp.associationLicense) parts.push(`License: ${exp.associationLicense.toLocaleString()}/month`);
    if (parts.length > 0) lines.push(`Expenses: ${parts.join(', ')}`);
    if (economy.activeContracts?.length > 0) {
      lines.push(`Active Contracts: ${economy.activeContracts.map((c) => `${c.name}(${c.rank})`).join(', ')}`);
    }
  }

  // Phase 3 — City State
  if (cityState) {
    lines.push('');
    lines.push('[ CITY STATE ]');
    lines.push(`Danger Level: ${cityState.dangerLevel || 'Low'}`);
    if (cityState.zones?.length > 0) {
      cityState.zones.forEach((z) => lines.push(`- Zone ${z.name}: ${z.status}`));
    }
    const activeOverflow = (cityState.overflowEvents || []).filter((e) => e.status === 'active');
    if (activeOverflow.length > 0) {
      lines.push(`Active Overflow Events: ${activeOverflow.map((e) => e.zone).join(', ')}`);
    }
  }

  // Phase 3 — Market
  if (market?.stonePrices) {
    lines.push('');
    lines.push('[ MARKET PRICES ]');
    const trends = market.trend || {};
    ['E','D','C','B','A','S'].forEach((rank) => {
      const price = market.stonePrices[rank];
      const trend = trends[rank] || 'stable';
      if (price) lines.push(`- ${rank}-rank stone: ~${price.toLocaleString()} won (${trend})`);
    });
  }

  // Phase 3 — Rival Hunter
  if (rivalHunter?.name) {
    lines.push('');
    lines.push('[ RIVAL HUNTER ]');
    lines.push(`Name: ${rivalHunter.name} | Rank: ${rivalHunter.rank || '?'} | Last Seen: ${rivalHunter.lastSeen || 'Unknown'}`);
  }

  // Phase 4 — Recent News Feed
  if (newsFeed && newsFeed.length > 0) {
    lines.push('');
    lines.push('[ RECENT NEWS ]');
    newsFeed.slice(-5).forEach((n) => {
      lines.push(`- [${n.source}] ${n.headline}`);
    });
  }

  // Phase 4 — Codex (last 5 entries)
  if (codex && codex.length > 0) {
    lines.push('');
    lines.push('[ CODEX ENTRIES ]');
    codex.slice(-5).forEach((c) => {
      lines.push(`- [${c.category.toUpperCase()}] ${c.title}: ${c.entry}`);
    });
  }

  // Phase 4 — Player Legend
  const legendEntries = playerState?.legendEntries || [];
  if (legendEntries.length > 0) {
    lines.push('');
    lines.push('[ PLAYER LEGEND ]');
    legendEntries.slice(-3).forEach((l) => {
      lines.push(`- ${l.entry}`);
    });
  }

  // Phase 4 — Belief Shifts
  const beliefShifts = playerState?.beliefShifts || [];
  if (beliefShifts.length > 0) {
    lines.push('');
    lines.push('[ BELIEF SHIFTS ]');
    beliefShifts.slice(-3).forEach((b) => {
      lines.push(`- ${b.shift}${b.tone ? ` [${b.tone}]` : ''}`);
    });
  }

  // Phase 5 — Gate Records (first clears)
  const firstClears = (gateRecords || []).filter((r) => r.isFirstClear && r.clearedBy === 'player');
  if (firstClears.length > 0) {
    lines.push('');
    lines.push('[ GATE RECORDS — FIRST CLEARS ]');
    firstClears.slice(-5).forEach((r) => {
      lines.push(`- ${r.name} (${r.rank}-rank) — ${r.location}${r.bonus ? ` | Bonus: ${r.bonus}` : ''}`);
    });
  }

  // Phase 5 — Bestiary Summary
  const bestiaryObj = bestiary || {};
  const knownTypes = Object.keys(bestiaryObj).length;
  if (knownTypes > 0) {
    lines.push('');
    lines.push('[ BESTIARY ]');
    lines.push(`${knownTypes} monster type${knownTypes === 1 ? '' : 's'} catalogued.`);
    const sorted = Object.values(bestiaryObj).sort((a, b) => (b.killCount || 0) - (a.killCount || 0));
    sorted.slice(0, 3).forEach((m) => {
      if (m.killCount > 0) {
        lines.push(`- ${m.name} (${m.rank}-rank): ${m.killCount} kills${m.weaknesses ? ` | Weak: ${m.weaknesses}` : ''}`);
      }
    });
  }

  // Phase 6 — Achievements (last 5)
  const recentAchievements = (achievements || []).slice(-5);
  if (recentAchievements.length > 0) {
    lines.push('');
    lines.push('[ ACHIEVEMENTS ]');
    recentAchievements.forEach((a) => {
      lines.push(`- [${(a.category || 'unique').toUpperCase()}] ${a.title}: ${a.description}`);
    });
  }

  // Phase 6 — System Tier
  const resumeTier = playerState?.systemTier || 1;
  if (resumeTier > 1) {
    lines.push('');
    lines.push(`[ SYSTEM TIER: ${resumeTier} ]`);
    lines.push(`System is operating at Tier ${resumeTier}. Do not output [ SYSTEM TIER UNLOCK ] for tiers ≤ ${resumeTier}.`);
  }

  lines.push('');
  lines.push('[ LAST KNOWN NARRATIVE POSITION ]');
  lines.push(latestSave?.narrativeSummary || 'No summary available. Resume from last known state.');

  lines.push('');
  lines.push('Resume the simulation from this exact state.');
  lines.push('The Player is about to take their next action.');

  return lines.join('\n');
}

// ─── State Anchor ─────────────────────────────────────────────────────────────
// Injected before EVERY API call to prevent narrative/tone drift in long sessions.
// NOT stored in conversation history — only sent to the API.

export function buildStateAnchor(gameState) {
  const p = gameState.playerState || {};
  const lines = [];

  lines.push('[ SIMULATION STATE ANCHOR — CONTINUITY LOCK ]');
  lines.push(`Hunter: ${p.name || '—'} | Rank: ${p.rank || 'E'} | Level: ${p.level || 1}`);

  const hp = p.hp ? `${p.hp.current ?? '—'}/${p.hp.max ?? '—'}` : '—/—';
  const mp = p.mp ? `${p.mp.current ?? '—'}/${p.mp.max ?? '—'}` : '—/—';
  const st = p.stamina ? `${p.stamina.current ?? '—'}/${p.stamina.max ?? '—'}` : '—/—';
  lines.push(`HP: ${hp} | MP: ${mp} | Stamina: ${st}`);

  if (p.xp) {
    lines.push(`XP: ${p.xp.current ?? 0}/${p.xp.toNext ?? 100}`);
  }

  if (p.stats) {
    const s = p.stats;
    lines.push(`STR:${s.STR ?? '—'} AGI:${s.AGI ?? '—'} END:${s.END ?? '—'} INT:${s.INT ?? '—'} PER:${s.PER ?? '—'} LUCK:${s.LUCK ?? '—'}`);
  }

  if (p.location) lines.push(`Location: ${p.location}`);

  if (gameState.skills?.length > 0) {
    const skillNames = gameState.skills.map((s) => `${s.name}(${s.rank || 'E'})`).join(', ');
    lines.push(`Skills: ${skillNames}`);
  }

  const inv = gameState.inventory;
  if (inv) {
    const equip = (inv.equipment || []).map((i) => i.name || i);
    const cons = (inv.consumables || []).map((i) => i.name || i);
    const all = [...equip, ...cons];
    if (all.length > 0) lines.push(`Inventory: ${all.join(', ')}`);
  }

  if (p.titles?.length > 0) lines.push(`Titles: ${p.titles.join(', ')}`);
  if (p.statusEffects?.length > 0) lines.push(`Status Effects: ${p.statusEffects.join(', ')}`);

  if (gameState.quests?.active?.length > 0) {
    lines.push(`Active Quests: ${gameState.quests.active.map((q) => q.name || q).slice(0, 3).join(', ')}`);
  }

  if (gameState.npcs?.length > 0) {
    const knownNPCs = gameState.npcs.slice(0, 5).map((n) => `${n.name}(${n.relationship || '?'})`).join(', ');
    lines.push(`Known NPCs: ${knownNPCs}`);
  }

  // ── Shadow Army — full DOMAIN + deployment state anchor ─────────────────────
  const allShadows = gameState.shadowArmy || [];
  const activeShadows = allShadows.filter((s) => s.status !== 'lost');
  const lostShadows   = allShadows.filter((s) => s.status === 'lost');

  if (allShadows.length > 0 || gameState.playerState?.shadowProtocolUnlocked) {
    const intStat = gameState.playerState?.stats?.INT || 10;
    // Compute max capacity inline (mirrors shadowCapacityFromINT)
    const maxDomain = intStat >= 100 ? 25 : intStat >= 85 ? 18 : intStat >= 60 ? 13
      : intStat >= 40 ? 9 : intStat >= 25 ? 6 : intStat >= 15 ? 4 : 2;
    const deployedCount = activeShadows.filter(
      (s) => s.deploymentState === 'deployed' || s.deploymentState === 'assigned',
    ).length;

    lines.push(`SHADOW DOMAIN: ${deployedCount} / ${maxDomain}  |  Protocol: ${gameState.playerState?.shadowProtocolUnlocked ? 'UNLOCKED' : 'LOCKED'}`);

    // GENERALS — full detail line per General
    const generals = activeShadows.filter((s) => s.isGeneral);
    if (generals.length > 0) {
      lines.push('Generals:');
      generals.forEach((s) => {
        const pers = s.personality ? ` [${s.personality}]` : '';
        const task = s.deploymentState === 'assigned' ? ` → Task: ${s.assignedTask}` : '';
        const deploy = s.deploymentState !== 'standby' ? ` (${s.deploymentState})` : '';
        lines.push(`  ${s.name}(${s.grade})${pers}${deploy}${task}`);
      });
    }

    // ARMY — compact by type, grouped
    const armyUnits = activeShadows.filter((s) => !s.isGeneral);
    if (armyUnits.length > 0) {
      // Group by name/type
      const grouped = {};
      armyUnits.forEach((s) => {
        const key = `${s.name}|${s.grade}|${s.deploymentState}`;
        if (!grouped[key]) grouped[key] = { name: s.name, grade: s.grade, deploymentState: s.deploymentState, count: 0 };
        grouped[key].count += s.armyCount || 1;
      });
      const armyLine = Object.values(grouped)
        .map((g) => `${g.name}×${g.count}(${g.grade}${g.deploymentState !== 'standby' ? ','+g.deploymentState : ''})`)
        .join(', ');
      lines.push(`Army: ${armyLine}`);
    }

    // FALLEN — brief count
    if (lostShadows.length > 0) {
      lines.push(`Fallen: ${lostShadows.map((s) => s.name).join(', ')}`);
    }

    if (activeShadows.length === 0) {
      lines.push('No active shadows.');
    }

    // Extraction instructions reminder
    if (gameState.playerState?.shadowProtocolUnlocked) {
      lines.push('Shadow protocol ACTIVE — output [ SHADOW EXTRACTION AVAILABLE ] after every personal kill. One attempt per entity. Output [ SHADOW COMMAND RESULT ] when commanded.');
    }
  }

  // ── Phase 3 — Economy ────────────────────────────────────────────────────────
  const economy = gameState.economy;
  if (economy) {
    const inv = gameState.inventory;
    const cash = inv?.currency?.cash ?? 0;
    const cashFmt = cash >= 1000000
      ? `${(cash / 1000000).toFixed(1)}M won`
      : cash >= 1000
        ? `${(cash / 1000).toFixed(0)}K won`
        : `${cash} won`;
    lines.push(`Cash on hand: ${cashFmt}`);
    const exp = economy.expenses || {};
    const monthlyBurn = (exp.rent || 0) + (exp.associationLicense || 0);
    if (monthlyBurn > 0) {
      lines.push(`Monthly expenses: ~${(monthlyBurn / 1000).toFixed(0)}K won (rent + license)`);
    }
    if (economy.activeContracts?.length > 0) {
      const names = economy.activeContracts.slice(0, 2).map((c) => `${c.name}(${c.rank}, ${c.reward ? `${(c.reward/1000).toFixed(0)}K won` : '?'})`).join(', ');
      lines.push(`Active contracts: ${names}`);
    }
  }

  // ── Phase 3 — City State ──────────────────────────────────────────────────────
  const cityState = gameState.cityState;
  if (cityState && (cityState.dangerLevel !== 'Low' || cityState.zones?.length > 0)) {
    lines.push(`City danger: ${cityState.dangerLevel || 'Low'}`);
    if (cityState.zones?.length > 0) {
      const disrupted = cityState.zones.filter((z) => z.status !== 'Safe');
      if (disrupted.length > 0) {
        lines.push(`Disrupted zones: ${disrupted.map((z) => `${z.name}(${z.status})`).join(', ')}`);
      }
    }
    if (cityState.overflowEvents?.some((e) => e.status === 'active')) {
      lines.push('⚠ ACTIVE OVERFLOW EVENT in city — civilians at risk.');
    }
  }

  // ── Phase 3 — Market ──────────────────────────────────────────────────────────
  const market = gameState.market;
  if (market) {
    const trends = market.trend || {};
    const moving = Object.entries(trends)
      .filter(([, t]) => t !== 'stable')
      .map(([rank, t]) => `${rank}:${t === 'rising' ? '↑' : '↓'}`);
    if (moving.length > 0) {
      lines.push(`Stone market: ${moving.join(' ')}`);
    }
  }

  // ── Phase 3 — Rival Hunter ────────────────────────────────────────────────────
  const rival = gameState.rivalHunter;
  if (rival?.name) {
    lines.push(`Rival: ${rival.name} (Rank ${rival.rank || '?'}) — last seen: ${rival.lastSeen || 'unknown'}`);
  }

  // ── Phase 3 — Fear Index reminder (hidden — drives NPC behavior) ─────────────
  const fearIdx = gameState.playerState?.fearIndex || 0;
  if (fearIdx > 20) {
    lines.push(`Fear Index: ${fearIdx}/100 — adjust NPC wariness accordingly.`);
  }

  // ── Phase 4 — Story Architecture ─────────────────────────────────────────────
  const answers = gameState.characterAnswers || {};
  if (answers.q4 || answers.q10 || answers.q7) {
    lines.push('[ HUNTER PROFILE ]');
    if (answers.q4) lines.push(`Background: ${answers.q4}`);
    if (answers.q7) lines.push(`Moral line: ${answers.q7}`);
    if (answers.q10) lines.push(`Short-term drive: ${answers.q10}`);
    if (answers.q11) lines.push(`Long-term goal: ${answers.q11}`);
  }

  const legendEntries = gameState.playerState?.legendEntries || [];
  if (legendEntries.length > 0) {
    const recent = legendEntries.slice(-2).map((e) => e.entry).join(' / ');
    lines.push(`Legend: ${recent}`);
  }

  const truthDrip = gameState.playerState?.truthDripCount || 0;
  if (truthDrip > 0) {
    lines.push(`Truth Drips fired: ${truthDrip} — do NOT repeat observations already revealed.`);
  }

  // ── Phase 6 — System Tier ────────────────────────────────────────────────────
  const systemTier = gameState.playerState?.systemTier || 1;
  if (systemTier > 1) {
    lines.push(`System Tier: ${systemTier}`);
  }

  // ── Phase 6 — Stat Milestones (already achieved — do not repeat) ─────────────
  const statMilestones = gameState.playerState?.statMilestones || [];
  if (statMilestones.length > 0) {
    const milestoneList = statMilestones.map((m) => `${m.stat}≥${m.value}`).join(', ');
    lines.push(`Achieved stat milestones: ${milestoneList} — DO NOT fire [ STAT MILESTONE ] for these again.`);
  }

  // ── Phase 6 — Title Passives ──────────────────────────────────────────────────
  const titlePassives = gameState.playerState?.titlePassives || {};
  const passiveEntries = Object.entries(titlePassives);
  if (passiveEntries.length > 0) {
    const passiveStr = passiveEntries.map(([t, p]) => `"${t}": ${p}`).join(' | ');
    lines.push(`Title passives active: ${passiveStr}`);
  }

  // ── Phase 5 — Gear Aesthetic ─────────────────────────────────────────────────
  const gearAesthetic = gameState.playerState?.gearAesthetic;
  if (gearAesthetic) {
    lines.push(`Combat Aesthetic: ${gearAesthetic}`);
  }

  // ── Phase 5 — Active Set Bonuses ─────────────────────────────────────────────
  const activeSets = gameState.playerState?.activeSetBonuses || [];
  if (activeSets.length > 0) {
    lines.push(`Active Set Bonuses: ${activeSets.map((s) => `${s.setName}(${s.bonus})`).join(', ')}`);
  }

  // ── Phase 5 — Bestiary (known count) ─────────────────────────────────────────
  const knownMonsterCount = Object.keys(gameState.bestiary || {}).length;
  if (knownMonsterCount > 0) {
    lines.push(`Bestiary: ${knownMonsterCount} monster type${knownMonsterCount === 1 ? '' : 's'} catalogued.`);
  }

  lines.push('REQUIRED EVERY TURN: [ SYSTEM STATUS WINDOW ] with current HP/MP/Stamina/XP/stats/inventory/currency — the panels read state ONLY from this block, never skip it. Output [ LOOT ] after any combat or scavenge. Output [ QUEST LOG ] when objectives shift. Output [ NPC UPDATE ] when a named character first appears or a relationship changes. Output [ CITY UPDATE ] when city zones or danger level change. Output [ RIVAL SIGHTING ] when the rival appears. Keep narrative to 2–3 short paragraphs. Keep choices to 2–3 short options. No padding.');
  lines.push('Maintain established tone, lore, character voice, and all canon facts.');

  return lines.join('\n');
}

// ─── Chronicle Prompt ────────────────────────────────────────────────────────
// Used to compress old conversation turns into a compact chronicle entry.

export function buildChroniclePrompt(messagesToSummarize) {
  const formatted = messagesToSummarize.map((m) => {
    const role = m.role === 'user' ? 'HUNTER ACTION' : 'SIMULATION';
    // Trim very long messages to save context
    const content = m.content.length > 800 ? m.content.slice(0, 800) + '...[truncated]' : m.content;
    return `${role}:\n${content}`;
  }).join('\n\n---\n\n');

  return `[ CHRONICLE COMPRESSION REQUEST ]

The following are the oldest exchanges from the current simulation session. Write a concise CHRONICLE ENTRY (max 350 words) that captures:
- All key story events and hunter decisions
- Combat outcomes and enemies defeated
- Items acquired, used, or lost
- NPCs encountered and relationship context
- World events and lore revealed
- Any rank-ups, level-ups, or skill unlocks

Write in second person ("You entered...", "You defeated..."). Preserve every lore-critical detail. Do NOT include system blocks, stat tables, or UI formatting in your output — write flowing prose only.

EXCHANGES:

${formatted}

CHRONICLE ENTRY:`;
}

export function capConversationHistory(history, maxMessages = 60) {
  if (history.length <= maxMessages) return history;
  // Keep first 2 messages (system setup) and trim oldest pairs from the middle
  const excess = history.length - maxMessages;
  // Remove pairs from the front (after index 0 and 1 if they're setup messages)
  const setupMessages = history.slice(0, 1);
  const rest = history.slice(1);
  const trimmed = rest.slice(excess % 2 === 0 ? excess : excess + 1);
  return [...setupMessages, ...trimmed];
}
