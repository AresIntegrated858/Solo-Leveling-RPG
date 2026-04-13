// Game Interface — three-panel layout, Claude API integration, full game loop

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useClaudeAPI } from '../hooks/useClaudeAPI';
import { parseFullResponse } from '../utils/stateParser';
import { buildSessionContext, buildSessionResumePrefix, buildStateAnchor, buildChroniclePrompt } from '../utils/promptBuilder';
import { saveAll } from '../utils/fileManager';

import SystemStatusWindow from './SystemStatusWindow';
import SystemMessage from './SystemMessage';
import CombatHUD from './CombatHUD';
import LevelUpModal from './LevelUpModal';
import TitleNotification from './TitleNotification';
import SkillDirectory from './SkillDirectory';
import Inventory from './Inventory';
import QuestsPanel from './QuestsPanel';
import WorldPanel from './WorldPanel';
import RelationsPanel from './RelationsPanel';
import ProgressionLog from './ProgressionLog';
import SettingsPanel from './SettingsPanel';

const TABS = ['SKILLS', 'INVENTORY', 'QUESTS', 'WORLD', 'NPCS'];

export default function GameInterface({
  apiKey,
  gameState,
  saveStatus,
  onSave,
  doSave,
  onNewCampaign,
  isResuming,
  resumeData,
  sessionStartTime,
}) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [streamingText, setStreamingText] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [combatData, setCombatData] = useState(null);
  const [showCombat, setShowCombat] = useState(false);
  const [levelUpData, setLevelUpData] = useState(null);
  const [titleData, setTitleData] = useState(null);
  const [showProgressionLog, setShowProgressionLog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [autoSaveInterval] = useState(5);

  const feedRef = useRef(null);
  const inputRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const userTurnRef = useRef(0);         // counts user turns for chronicle trigger
  const isChroniclingRef = useRef(false); // prevents concurrent chronicle calls

  const { stream, isStreaming } = useClaudeAPI();

  // ─── Core save helper used everywhere ──────────────────────────────────────
  const triggerSave = useCallback(async (narrativeSummary = '') => {
    try {
      await saveAll({ ...gameState.getFullState(), narrativeSummary });
    } catch (err) {
      console.error('GameInterface: save error', err);
    }
  }, [gameState]);

  // ─── Auto-save every N minutes ─────────────────────────────────────────────
  useEffect(() => {
    autoSaveTimerRef.current = setInterval(() => {
      triggerSave('Auto-save checkpoint.');
    }, autoSaveInterval * 60 * 1000);
    return () => clearInterval(autoSaveTimerRef.current);
  }, [triggerSave, autoSaveInterval]);

  // ─── Session timer ───────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => gameState.updateSessionTime(60000), 60000);
    return () => clearInterval(timer);
  }, [gameState]);

  // ─── Session initialization ──────────────────────────────────────────────
  useEffect(() => {
    if (sessionInitialized) return;
    setSessionInitialized(true);

    if (isResuming && resumeData) {
      initializeResumeSession(resumeData);
    } else {
      // New game — show the initial Claude response that was generated during character creation
      const history = gameState.conversationHistory;
      const initialResponse = history.find((m) => m.role === 'assistant');
      if (initialResponse) {
        setMessages([{ role: 'assistant', content: initialResponse.content }]);
        // Parse and apply the initial status window so the left panel reflects
        // the actual starting stats Claude assigned, not the defaults
        const parsed = parseFullResponse(initialResponse.content);
        if (parsed) gameState.applyAPIResponse(parsed);
      }
      // Save immediately so name/state is on disk
      setTimeout(() => triggerSave('Game started.'), 500);
    }

    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const initializeResumeSession = useCallback(async (saved) => {
    // Show last few exchanges from history so player can orient
    const history = saved.conversationHistory || [];
    const recent = history.slice(-6); // last 3 exchanges

    if (recent.length > 0) {
      setMessages([
        {
          role: 'system-briefing',
          content: `[ SESSION ${saved.sessionMeta?.sessionNumber || 1} — RESUMED ]\nReconstructing simulation state...\nLast save: ${saved.latestSave?.savedAt ? new Date(saved.latestSave.savedAt).toLocaleString() : 'Unknown'}`,
        },
        ...recent,
      ]);
    } else {
      // No prior history — show briefing only
      const briefing = buildSessionContext(saved);
      setMessages([{
        role: 'system-briefing',
        content: `[ SESSION RESUMED ]\n\n${briefing}`,
      }]);
    }

    // Prepend resume context to conversation history for Claude
    const resumePrefix = buildSessionResumePrefix();
    const briefing = buildSessionContext(saved);
    const resumeMsg = { role: 'user', content: `${resumePrefix}\n\n${briefing}` };

    // Build the history Claude will see: resume context + all prior history
    const fullHistory = [resumeMsg, ...history];
    gameState.setConversationHistory(fullHistory);
    gameState.incrementSession();
  }, [gameState]);

  // ─── Auto-scroll ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  // ─── Auto-Chronicle: compress old messages every 25 user turns ──────────────
  const generateChronicle = useCallback(async (currentGameState) => {
    const history = currentGameState.conversationHistory;
    const COMPRESS_AFTER = 2;   // keep first N messages (setup)
    const COMPRESS_COUNT = 20;  // compress this many old messages

    if (history.length < COMPRESS_AFTER + COMPRESS_COUNT + 4) return; // not enough to bother
    if (isChroniclingRef.current) return;

    isChroniclingRef.current = true;

    const setupMessages    = history.slice(0, COMPRESS_AFTER);
    const messagesToPack   = history.slice(COMPRESS_AFTER, COMPRESS_AFTER + COMPRESS_COUNT);
    const remainingMessages = history.slice(COMPRESS_AFTER + COMPRESS_COUNT);

    const chroniclePrompt = buildChroniclePrompt(messagesToPack);
    const chronicleHistory = [{ role: 'user', content: chroniclePrompt }];

    let chronicleText = '';

    await stream({
      apiKey,
      messages: chronicleHistory,
      onChunk: (_, accumulated) => { chronicleText = accumulated; },
      onComplete: (finalText) => {
        // Replace the old messages with a single compressed chronicle exchange
        const chronicleEntry = `[ SESSION CHRONICLE — AUTO-COMPRESSED ]\n\n${finalText.trim()}`;
        const compressedHistory = [
          ...setupMessages,
          { role: 'user', content: '[ TIMELINE REVIEW — Reviewing prior session events for continuity ]' },
          { role: 'assistant', content: chronicleEntry },
          ...remainingMessages,
        ];
        currentGameState.setConversationHistory(compressedHistory);
        isChroniclingRef.current = false;

        // Brief system notification in the feed
        setMessages((prev) => [
          ...prev,
          {
            role: 'system-briefing',
            content: `[ CHRONICLE COMPRESSED ]\nSession memory consolidated — ${messagesToPack.length} exchanges archived into chronicle for continuity.`,
          },
        ]);
      },
      onError: (err) => {
        console.warn('Chronicle compression failed:', err);
        isChroniclingRef.current = false;
      },
    });
  }, [apiKey, stream]);

  // ─── Send message to Claude ──────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isStreaming) return;

    // Track user turns (used to trigger auto-chronicle)
    userTurnRef.current += 1;
    const currentTurn = userTurnRef.current;

    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    gameState.addMessage('user', text);
    setInput('');
    setStreamingText('');

    // ── STATE ANCHOR: prepend current sim state to API call only (not stored) ──
    // This prevents tone/stat drift in long sessions by grounding every call.
    const stateAnchor = buildStateAnchor(gameState);
    const anchoredUserMsg = {
      role: 'user',
      content: `${stateAnchor}\n\n---\n${text}`,
    };

    // Build API history with anchor injected on the latest user message
    const priorHistory = gameState.conversationHistory; // does NOT yet contain userMsg
    const historyForAPI = [...priorHistory, anchoredUserMsg];

    await stream({
      apiKey,
      messages: historyForAPI,
      onChunk: (chunk, accumulated) => {
        setStreamingText(accumulated);
      },
      onComplete: async (finalText) => {
        setStreamingText('');
        setMessages((prev) => [...prev, { role: 'assistant', content: finalText }]);
        gameState.addMessage('assistant', finalText);

        // Parse response for all system blocks
        const parsed = parseFullResponse(finalText);
        gameState.applyAPIResponse(parsed);

        // Trigger UI events from parsed blocks
        if (parsed.combat) {
          setCombatData(parsed.combat);
          setShowCombat(true);
        }
        if (parsed.levelUp) {
          setLevelUpData(parsed.levelUp);
        }
        if (parsed.titleUnlocked) {
          setTitleData(parsed.titleUnlocked);
        }

        // Auto-save after EVERY response
        const snippet = finalText.slice(0, 300).replace(/\n/g, ' ');
        await triggerSave(snippet);

        // ── Auto-chronicle every 25 user turns ──────────────────────────────
        if (currentTurn % 25 === 0) {
          // Run after a short delay to not block UI
          setTimeout(() => generateChronicle(gameState), 2000);
        }
      },
      onError: (err) => {
        setStreamingText('');
        setMessages((prev) => [...prev, {
          role: 'system-error',
          content: `[ SYSTEM ERROR ]\n\n${err}\n\nThe simulation encountered an interruption. Progress preserved.`,
        }]);
      },
    });
  }, [apiKey, isStreaming, gameState, stream, triggerSave, generateChronicle]);

  // ─── Level up path selection ─────────────────────────────────────────────
  const handleStatAllocation = useCallback((allocation) => {
    setLevelUpData(null);

    // Optimistically apply the allocated stats to the UI immediately
    // Use gameState directly — 'gs' alias is declared later in the component body
    gameState.setPlayerState((prev) => {
      const updatedStats = { ...prev.stats };
      Object.entries(allocation).forEach(([stat, pts]) => {
        if (pts > 0) updatedStats[stat] = (updatedStats[stat] || 10) + pts;
      });
      return { ...prev, stats: updatedStats };
    });

    // Build readable breakdown for Claude
    const breakdown = Object.entries(allocation)
      .filter(([, pts]) => pts > 0)
      .map(([stat, pts]) => `${stat} +${pts}`)
      .join(', ');

    const allocationMsg = breakdown
      ? `[ STAT ALLOCATION ] I distributed my stat points: ${breakdown}. Please output an updated [ SYSTEM STATUS WINDOW ] reflecting these new values alongside any changes from the level-up, then continue the simulation.`
      : `[ STAT ALLOCATION ] I saved my stat points unspent. Please output an updated [ SYSTEM STATUS WINDOW ] reflecting the level-up changes and continue the simulation.`;

    sendMessage(allocationMsg);
  }, [sendMessage, gameState]);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    sendMessage(input);
  }, [input, sendMessage]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // ─── Save status display ─────────────────────────────────────────────────
  const saveStatusLabel = {
    saved: { text: 'Saved', color: 'text-system-green' },
    saving: { text: 'Saving...', color: 'text-system-blue processing-pulse' },
    unsaved: { text: 'Unsaved', color: 'text-yellow-500' },
    error: { text: 'Save Error', color: 'text-system-red' },
  }[saveStatus] || { text: '—', color: 'text-system-text-dim' };

  const gs = gameState;

  return (
    <div className="flex flex-col w-screen h-screen bg-system-bg overflow-hidden">
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL ──────────────────────────────────────────────────── */}
        <div className="system-window flex-shrink-0 overflow-hidden flex flex-col"
          style={{ width: '280px', borderRight: '1px solid #1e1e2e' }}>
          <SystemStatusWindow
            playerState={gs.playerState}
            sessionMeta={gs.sessionMeta}
            sessionStartTime={sessionStartTime}
          />
        </div>

        {/* ── CENTER PANEL ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden relative">

          {/* Narrative feed */}
          <div ref={feedRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-1"
            style={{ scrollBehavior: 'smooth' }}>

            {messages.length === 0 && !isStreaming && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                  <div className="font-mono text-xs text-system-text-dim tracking-widest">
                    [ SIMULATION READY ]
                  </div>
                  <div className="font-mono text-[10px] text-system-muted max-w-xs">
                    Enter your first command to begin.
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
              if (msg.role === 'system-briefing') {
                return (
                  <div key={i} className="system-block system-block-gold mb-4">
                    <div className="font-mono text-xs text-system-gold whitespace-pre-line">
                      {msg.content}
                    </div>
                  </div>
                );
              }
              if (msg.role === 'system-error') {
                return (
                  <div key={i} className="system-block system-block-red my-2">
                    <div className="font-mono text-xs text-system-red whitespace-pre-line">
                      {msg.content}
                    </div>
                  </div>
                );
              }
              return (
                <SystemMessage key={i} content={msg.content} role={msg.role} isStreaming={false} />
              );
            })}

            {isStreaming && streamingText && (
              <SystemMessage content={streamingText} role="assistant" isStreaming={true} />
            )}

            {isStreaming && !streamingText && (
              <div className="py-3">
                <div className="font-mono text-xs text-system-blue processing-pulse">
                  [ SYSTEM PROCESSING... ]
                </div>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="flex-shrink-0 border-t border-system-border" style={{ background: '#0a0a0f' }}>
            <form onSubmit={handleSubmit} className="flex items-end gap-0">
              <div className="flex-shrink-0 font-mono text-system-blue text-sm px-4 py-3 border-r border-system-border">
                &gt;
              </div>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStreaming || !!levelUpData}
                placeholder={
                  levelUpData ? 'Select a growth path above...'
                  : isStreaming ? 'System processing...'
                  : 'Enter command...'
                }
                className="game-input flex-1 px-4 py-3 min-h-[48px] max-h-[120px]"
                rows={1}
                style={{ resize: 'none', lineHeight: '1.5' }}
              />
              <button
                type="submit"
                disabled={isStreaming || !input.trim() || !!levelUpData}
                className="flex-shrink-0 btn-primary px-5 h-[48px] self-end disabled:opacity-30"
              >
                SEND
              </button>
            </form>
          </div>

          {showCombat && combatData && (
            <CombatHUD combatData={combatData} onClose={() => setShowCombat(false)} />
          )}
        </div>

        {/* ── RIGHT PANEL ──────────────────────────────────────────────────── */}
        <div className="system-window flex-shrink-0 flex flex-col overflow-hidden"
          style={{ width: '260px', borderLeft: '1px solid #1e1e2e' }}>
          <div className="flex border-b border-system-border flex-shrink-0">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`flex-1 font-mono text-[9px] tracking-wider py-2 transition-colors ${
                  activeTab === i ? 'tab-active bg-system-blue bg-opacity-5' : 'text-system-text-dim hover:text-system-text'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {activeTab === 0 && <SkillDirectory skills={gs.skills} />}
            {activeTab === 1 && <Inventory inventory={gs.inventory} />}
            {activeTab === 2 && <QuestsPanel quests={gs.quests} />}
            {activeTab === 3 && <WorldPanel playerState={gs.playerState} worldEvents={gs.worldEvents} />}
            {activeTab === 4 && <RelationsPanel npcs={gs.npcs} />}
          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-t border-system-border"
        style={{ background: '#08080f', height: '36px' }}>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] text-system-text-dim">
            {gs.playerState?.name || 'Hunter'} &nbsp;·&nbsp; Lv.{gs.playerState?.level || 1} {gs.playerState?.rank || 'E'} Rank
          </span>
          <span className="font-mono text-[10px] text-system-muted">
            Session {gs.sessionMeta?.sessionNumber || 1}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-mono text-[10px] ${saveStatusLabel.color}`}>
            {saveStatusLabel.text}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onSave} className="btn-system text-[10px] px-3 py-1">SAVE</button>
          <button onClick={() => setShowProgressionLog(true)} className="btn-system text-[10px] px-3 py-1">PROGRESSION</button>
          <button onClick={() => setShowSettings(true)} className="btn-system text-[10px] px-3 py-1">SETTINGS</button>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {levelUpData && (
        <LevelUpModal
          levelUpData={levelUpData}
          currentStats={gs.playerState?.stats}
          onAllocate={handleStatAllocation}
        />
      )}
      {titleData && <TitleNotification titleData={titleData} onDismiss={() => setTitleData(null)} />}
      {showProgressionLog && <ProgressionLog gameState={gs} onClose={() => setShowProgressionLog(false)} />}
      {showSettings && (
        <SettingsPanel
          apiKey={apiKey}
          autoSaveInterval={autoSaveInterval}
          onAutoSaveIntervalChange={() => {}}
          onNewCampaign={onNewCampaign}
          conversationHistory={gs.conversationHistory}
          playerState={gs.playerState}
          sessionMeta={gs.sessionMeta}
          onClose={() => setShowSettings(false)}
          onAPIKeyUpdate={async (newKey) => {
            await window.electronAPI.store.set('apiKey', newKey);
          }}
        />
      )}
    </div>
  );
}
