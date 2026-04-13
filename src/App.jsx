// Root App — screen routing and top-level state orchestration

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { loadAll, archiveCurrentSave, clearSaveData, saveAll } from './utils/fileManager';
import { useGameState } from './hooks/useGameState';
import { useClaudeAPI } from './hooks/useClaudeAPI';
import { parseFullResponse } from './utils/stateParser';

import SetupScreen from './components/SetupScreen';
import CharacterCreation from './components/CharacterCreation';
import GameInterface from './components/GameInterface';
import LoadingScreen from './components/LoadingScreen';

const SCREEN = {
  LOADING: 'loading',
  SETUP: 'setup',
  RESUME: 'resume',
  CHARACTER: 'character',
  GAME: 'game',
};

export default function App() {
  const [screen, setScreen] = useState(SCREEN.LOADING);
  const [apiKey, setApiKey] = useState('');
  const [saveData, setSaveData] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');
  const sessionStartRef = useRef(Date.now());

  const gameState = useGameState();
  const { validateKeyStrict } = useClaudeAPI();

  // ─── Boot sequence ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function boot() {
      const storedKey = await window.electronAPI.store.get('apiKey');
      if (!storedKey) {
        setScreen(SCREEN.SETUP);
        return;
      }
      setApiKey(storedKey);

      const saved = await loadAll();
      // FIX: only need characterAnswers.q1 to confirm a save exists
      // playerState.name may be empty if user quit before first API response
      const hasSave = !!(saved?.characterAnswers?.q1);

      if (hasSave) {
        setSaveData(saved);
        setScreen(SCREEN.RESUME);
      } else {
        setScreen(SCREEN.CHARACTER);
      }
    }
    boot();
  }, []);

  // ─── Save before app close ─────────────────────────────────────────────────
  useEffect(() => {
    const handleBeforeClose = async () => {
      if (screen === SCREEN.GAME) {
        await doSave('Session ended — application closed.');
      }
    };
    window.electronAPI?.app.onBeforeClose(handleBeforeClose);
    return () => window.electronAPI?.app.removeBeforeClose(handleBeforeClose);
  }, [screen, gameState]);

  // ─── Core save function (used everywhere) ─────────────────────────────────
  const doSave = useCallback(async (narrativeSummary = '') => {
    setSaveStatus('saving');
    try {
      await saveAll({ ...gameState.getFullState(), narrativeSummary });
      setSaveStatus('saved');
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('error');
    }
  }, [gameState]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleAPIKeySubmit = useCallback(async (key) => {
    const { valid, error } = await validateKeyStrict(key);
    if (!valid) return { success: false, error };

    await window.electronAPI.store.set('apiKey', key);
    setApiKey(key);

    const saved = await loadAll();
    const hasSave = !!(saved?.characterAnswers?.q1);
    if (hasSave) {
      setSaveData(saved);
      setScreen(SCREEN.RESUME);
    } else {
      setScreen(SCREEN.CHARACTER);
    }
    return { success: true };
  }, [validateKeyStrict]);

  const handleResumeGame = useCallback(() => {
    if (saveData) {
      gameState.loadSavedState(saveData);
      sessionStartRef.current = Date.now();
      setScreen(SCREEN.GAME);
    }
  }, [saveData, gameState]);

  const handleNewCampaign = useCallback(async () => {
    if (saveData?.characterAnswers?.q1) {
      const label = `${saveData.characterAnswers.q1 || 'hunter'}-session${saveData.sessionMeta?.sessionNumber || 1}`;
      await archiveCurrentSave(label);
    }
    await clearSaveData();
    gameState.resetState();
    setSaveData(null);
    sessionStartRef.current = Date.now();
    setScreen(SCREEN.CHARACTER);
  }, [saveData, gameState]);

  // Receive completed character data and load full saved state (including hometownCoords)
  const handleCharacterCreationComplete = useCallback(async (answers, initialHistory, initialResponse) => {
    gameState.setCharacterData(answers);

    // Load the initial Claude exchange into conversation history
    if (initialHistory && initialHistory.length > 0) {
      gameState.setConversationHistory(initialHistory);
    }

    // ── CRITICAL: parse the initial Claude response and apply stats to left panel ──
    // Without this, the status window shown in the feed never updates the stat bars.
    if (initialResponse) {
      const parsed = parseFullResponse(initialResponse);
      if (parsed) gameState.applyAPIResponse(parsed);
    }

    // Re-load the full saved playerState from disk so hometownCoords (geocoded
    // during character creation) makes it into the live game state.
    // Merge onto the already-updated playerState so we don't overwrite parsed stats.
    try {
      const saved = await loadAll();
      if (saved?.playerState?.hometownCoords) {
        gameState.setPlayerState((prev) => ({
          ...prev,
          hometownCoords: saved.playerState.hometownCoords,
          currentCoords: saved.playerState.hometownCoords,
        }));
      }
    } catch (e) {
      // Non-fatal — map will wait for first Claude location update
    }

    sessionStartRef.current = Date.now();
    setScreen(SCREEN.GAME);
  }, [gameState]);

  const handleSaveRequest = useCallback(async () => {
    await doSave('Manual save.');
  }, [doSave]);

  // ─── Screens ───────────────────────────────────────────────────────────────

  if (screen === SCREEN.LOADING) return <LoadingScreen />;

  if (screen === SCREEN.SETUP) {
    return <SetupScreen onSubmit={handleAPIKeySubmit} />;
  }

  if (screen === SCREEN.RESUME) {
    return (
      <ResumeScreen
        saveData={saveData}
        onResume={handleResumeGame}
        onNewCampaign={handleNewCampaign}
      />
    );
  }

  if (screen === SCREEN.CHARACTER) {
    return (
      <CharacterCreation
        apiKey={apiKey}
        onComplete={handleCharacterCreationComplete}
      />
    );
  }

  if (screen === SCREEN.GAME) {
    return (
      <GameInterface
        apiKey={apiKey}
        gameState={gameState}
        saveStatus={saveStatus}
        onSave={handleSaveRequest}
        doSave={doSave}
        onNewCampaign={handleNewCampaign}
        isResuming={!!(saveData?.conversationHistory?.length)}
        resumeData={saveData}
        sessionStartTime={sessionStartRef.current}
      />
    );
  }

  return null;
}

// ─── Resume Screen ─────────────────────────────────────────────────────────

function ResumeScreen({ saveData, onResume, onNewCampaign }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  const savedAt = saveData?.latestSave?.savedAt
    ? new Date(saveData.latestSave.savedAt).toLocaleString()
    : 'Unknown';

  const hunterName = saveData?.characterAnswers?.q1
    || saveData?.playerState?.name
    || 'Unknown Hunter';

  return (
    <div className="flex items-center justify-center w-screen h-screen bg-system-bg">
      <div className="w-full max-w-md space-y-6 p-8">
        <div className="text-center space-y-2">
          <div className="font-mono text-[10px] tracking-widest text-system-text-dim uppercase">
            ══════ SYSTEM ══════
          </div>
          <h1 className="font-mono text-2xl text-system-gold tracking-wider">
            SOLO LEVELING SYSTEM
          </h1>
          <div className="font-mono text-[10px] tracking-widest text-system-text-dim uppercase">
            Hunter Data Detected
          </div>
        </div>

        <div className="system-window p-4 space-y-3">
          <div className="system-header -mx-4 -mt-4 mb-3">HUNTER RECORD</div>
          <div className="font-mono text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-system-text-dim">Hunter</span>
              <span className="text-system-text">{hunterName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-system-text-dim">Rank / Level</span>
              <span className="text-system-blue">
                {saveData?.playerState?.rank || 'E'} Rank &nbsp;·&nbsp; Level {saveData?.playerState?.level || 1}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-system-text-dim">Session</span>
              <span className="text-system-text">{saveData?.sessionMeta?.sessionNumber || 1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-system-text-dim">Last Active</span>
              <span className="text-system-text-dim text-xs">{savedAt}</span>
            </div>
          </div>
        </div>

        {!showConfirm ? (
          <div className="space-y-3">
            <button onClick={onResume} className="w-full btn-primary py-3 text-sm">
              RESUME SIMULATION
            </button>
            <button onClick={() => setShowConfirm(true)} className="w-full btn-danger py-2 text-xs">
              NEW CAMPAIGN
            </button>
          </div>
        ) : (
          <div className="system-window system-block-red p-4 space-y-3">
            <div className="font-mono text-xs text-system-red">
              [ WARNING ] This will permanently archive your current campaign.
            </div>
            <div className="font-mono text-xs text-system-text-dim">
              Type CONFIRM to proceed:
            </div>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value.toUpperCase())}
              className="w-full bg-transparent border border-system-border font-mono text-sm text-system-text outline-none px-3 py-2"
              placeholder="CONFIRM"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => confirmInput === 'CONFIRM' && onNewCampaign()}
                disabled={confirmInput !== 'CONFIRM'}
                className="flex-1 btn-danger py-2 text-xs disabled:opacity-30"
              >
                ARCHIVE & START NEW
              </button>
              <button
                onClick={() => { setShowConfirm(false); setConfirmInput(''); }}
                className="flex-1 btn-system py-2 text-xs"
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
