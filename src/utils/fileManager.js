// File Manager — all file system operations via Electron IPC
// Never uses localStorage. All persistence through Node.js fs via preload bridge.

const api = window.electronAPI;

let savesDir = null;

async function getSavesDir() {
  if (!savesDir) {
    savesDir = await api.app.getSavesDir();
  }
  return savesDir;
}

function joinPath(...parts) {
  return parts.join('/').replace(/\/+/g, '/');
}

// ─── Core Read/Write ─────────────────────────────────────────────────────────

export async function readJSON(filename) {
  const dir = await getSavesDir();
  const content = await api.fs.read(joinPath(dir, filename));
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    console.error(`fileManager: Failed to parse ${filename}`);
    return null;
  }
}

export async function writeJSON(filename, data) {
  const dir = await getSavesDir();
  const content = JSON.stringify(data, null, 2);
  return api.fs.write(joinPath(dir, filename), content);
}

export async function readRaw(filename) {
  const dir = await getSavesDir();
  return api.fs.read(joinPath(dir, filename));
}

export async function writeRaw(filename, content) {
  const dir = await getSavesDir();
  return api.fs.write(joinPath(dir, filename), content);
}

// ─── Save Files ──────────────────────────────────────────────────────────────

export async function savePlayerState(state) {
  return writeJSON('player_state.json', state);
}

export async function loadPlayerState() {
  return readJSON('player_state.json');
}

export async function saveSkills(skills) {
  return writeJSON('skills.json', skills);
}

export async function loadSkills() {
  return readJSON('skills.json') || [];
}

export async function saveInventory(inventory) {
  return writeJSON('inventory.json', inventory);
}

export async function loadInventory() {
  return readJSON('inventory.json');
}

export async function saveTitles(titles) {
  return writeJSON('titles.json', titles);
}

export async function loadTitles() {
  return readJSON('titles.json') || [];
}

export async function saveReputation(reputation) {
  return writeJSON('reputation.json', reputation);
}

export async function loadReputation() {
  return readJSON('reputation.json');
}

export async function saveWorldEvents(events) {
  return writeJSON('world_events.json', events);
}

export async function loadWorldEvents() {
  return readJSON('world_events.json') || [];
}

export async function saveQuests(quests) {
  return writeJSON('quests.json', quests);
}

export async function loadQuests() {
  return readJSON('quests.json') || { active: [], completed: [], failed: [] };
}

export async function saveNPCs(npcs) {
  return writeJSON('npcs.json', npcs);
}

export async function loadNPCs() {
  return readJSON('npcs.json') || [];
}

export async function saveLevelHistory(history) {
  return writeJSON('level_history.json', history);
}

export async function loadLevelHistory() {
  return readJSON('level_history.json') || [];
}

export async function saveSessionMeta(meta) {
  return writeJSON('session_meta.json', meta);
}

export async function loadSessionMeta() {
  return readJSON('session_meta.json');
}

export async function saveConversationHistory(history) {
  return writeJSON('conversation_history.json', history);
}

export async function loadConversationHistory() {
  return readJSON('conversation_history.json') || [];
}

export async function saveCharacterAnswers(answers) {
  return writeJSON('character_answers.json', answers);
}

export async function loadCharacterAnswers() {
  return readJSON('character_answers.json');
}

// ─── Session Log ─────────────────────────────────────────────────────────────

export async function appendSessionLog(entry) {
  const dir = await getSavesDir();
  const logDir = joinPath(dir, 'session_log');
  await api.fs.mkdir(logDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await api.fs.write(joinPath(logDir, `${timestamp}.json`), JSON.stringify(entry, null, 2));
}

export async function listSessionLogs() {
  const dir = await getSavesDir();
  const logDir = joinPath(dir, 'session_log');
  return api.fs.list(logDir);
}

// ─── Latest Save ─────────────────────────────────────────────────────────────

export async function saveLatestSave(summary) {
  return writeJSON('latest_save.json', {
    ...summary,
    savedAt: new Date().toISOString(),
  });
}

export async function loadLatestSave() {
  return readJSON('latest_save.json');
}

// ─── Full Save Bundle ─────────────────────────────────────────────────────────

export async function saveAll(gameState) {
  const {
    playerState,
    skills,
    inventory,
    titles,
    reputation,
    worldEvents,
    levelHistory,
    sessionMeta,
    conversationHistory,
    characterAnswers,
    quests,
    npcs,
    narrativeSummary,
  } = gameState;

  await Promise.all([
    playerState && savePlayerState(playerState),
    skills && saveSkills(skills),
    inventory && saveInventory(inventory),
    titles && saveTitles(titles),
    reputation && saveReputation(reputation),
    worldEvents && saveWorldEvents(worldEvents),
    levelHistory && saveLevelHistory(levelHistory),
    sessionMeta && saveSessionMeta(sessionMeta),
    conversationHistory && saveConversationHistory(conversationHistory),
    characterAnswers && saveCharacterAnswers(characterAnswers),
    quests && saveQuests(quests),
    npcs && saveNPCs(npcs),
  ].filter(Boolean));

  await saveLatestSave({
    playerName: playerState?.name,
    level: playerState?.level,
    rank: playerState?.rank,
    sessionNumber: sessionMeta?.sessionNumber,
    narrativeSummary: narrativeSummary || '',
  });

  await appendSessionLog({
    savedAt: new Date().toISOString(),
    sessionNumber: sessionMeta?.sessionNumber,
    level: playerState?.level,
    rank: playerState?.rank,
    narrativeSummary: narrativeSummary || '',
  });
}

export async function loadAll() {
  const [
    playerState,
    skills,
    inventory,
    titles,
    reputation,
    worldEvents,
    levelHistory,
    sessionMeta,
    conversationHistory,
    characterAnswers,
    quests,
    npcs,
    latestSave,
  ] = await Promise.all([
    loadPlayerState(),
    loadSkills(),
    loadInventory(),
    loadTitles(),
    loadReputation(),
    loadWorldEvents(),
    loadLevelHistory(),
    loadSessionMeta(),
    loadConversationHistory(),
    loadCharacterAnswers(),
    loadQuests(),
    loadNPCs(),
    loadLatestSave(),
  ]);

  return {
    playerState,
    skills,
    inventory,
    titles,
    reputation,
    worldEvents,
    levelHistory,
    sessionMeta,
    conversationHistory,
    characterAnswers,
    quests,
    npcs,
    latestSave,
  };
}

// ─── Archive / New Campaign ──────────────────────────────────────────────────

export async function archiveCurrentSave(label) {
  const dir = await getSavesDir();
  const archiveBaseDir = await api.app.getArchiveDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveDir = joinPath(archiveBaseDir, label || timestamp);
  await api.fs.mkdir(archiveDir);

  const files = await api.fs.list(dir);
  for (const file of files) {
    if (file === 'session_log') continue;
    const src = joinPath(dir, file);
    const content = await api.fs.read(src);
    if (content) {
      await api.fs.write(joinPath(archiveDir, file), content);
    }
  }
  return archiveDir;
}

export async function clearSaveData() {
  const dir = await getSavesDir();
  const files = [
    'player_state.json',
    'skills.json',
    'inventory.json',
    'titles.json',
    'reputation.json',
    'world_events.json',
    'level_history.json',
    'session_meta.json',
    'conversation_history.json',
    'character_answers.json',
    'quests.json',
    'npcs.json',
    'latest_save.json',
  ];
  await Promise.all(files.map((f) => api.fs.delete(joinPath(dir, f))));
}

// ─── Export ──────────────────────────────────────────────────────────────────

export async function exportCampaignLog(conversationHistory, playerState, sessionMeta) {
  const result = await api.app.exportDialog(
    `campaign-${playerState?.name || 'hunter'}-session-${sessionMeta?.sessionNumber || 1}.txt`
  );

  if (result.canceled || !result.filePath) return false;

  const lines = ['SOLO LEVELING RPG — CAMPAIGN LOG', '═'.repeat(60), ''];
  lines.push(`Hunter: ${playerState?.name || 'Unknown'}`);
  lines.push(`Rank: ${playerState?.rank || 'E'} | Level: ${playerState?.level || 1}`);
  lines.push(`Sessions: ${sessionMeta?.sessionNumber || 1}`);
  lines.push(`Exported: ${new Date().toLocaleString()}`);
  lines.push('', '═'.repeat(60), '', 'NARRATIVE TRANSCRIPT', '─'.repeat(60), '');

  for (const msg of conversationHistory) {
    if (msg.role === 'user') {
      lines.push(`> ${msg.content}`);
    } else {
      lines.push(msg.content);
    }
    lines.push('');
  }

  await api.fs.write(result.filePath, lines.join('\n'));
  return true;
}
