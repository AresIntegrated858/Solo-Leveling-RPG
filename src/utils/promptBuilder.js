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
    latestSave,
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

  lines.push('REQUIRED THIS TURN: Output [ SYSTEM STATUS WINDOW ] after any stat change. Output [ NPC UPDATE ] for EVERY named character who appears or speaks — use "Newly Met" for first encounters. Never skip NPC tracking.');
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
