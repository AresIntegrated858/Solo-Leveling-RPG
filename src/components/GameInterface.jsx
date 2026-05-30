// Game Interface — three-panel layout, Claude API integration, full game loop

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useClaudeAPI } from '../hooks/useClaudeAPI';
import { useSystemSting } from '../hooks/useSystemSting';
import { parseFullResponse, computeExpectedXPGain, xpToNextLevel } from '../utils/stateParser';
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
import DailyQuestPanel from './DailyQuestPanel';
import ShadowArmyPanel from './ShadowArmyPanel';
import ShadowNamingModal from './ShadowNamingModal';
import EconomyPanel from './EconomyPanel';
import NewsFeedPanel from './NewsFeedPanel';
import BestiaryPanel from './BestiaryPanel';
import AchievementsPanel from './AchievementsPanel';
import SkillMutationModal from './SkillMutationModal';
import MoralDecisionOverlay from './MoralDecisionOverlay';
import FloatingNotifications from './FloatingNotifications';
import ProgressionLog from './ProgressionLog';
import SettingsPanel from './SettingsPanel';

const TABS = ['SKILLS', 'INVENTORY', 'QUESTS', 'WORLD', 'NPCS', 'DAILY', 'SHADOWS', 'ECONOMY', 'NEWS', 'BESTIARY', 'ACHIEVE'];

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
  const [shadowNamingData, setShadowNamingData] = useState(null); // pending General extraction naming
  const [moralDecision, setMoralDecision] = useState(null);       // Phase 4 moral decision overlay
  const [skillMutationData, setSkillMutationData] = useState(null); // Phase 6 skill mutation fork
  const [notifications, setNotifications] = useState([]);
  const notifIdRef = useRef(0);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [autoSaveInterval] = useState(5);

  const feedRef = useRef(null);
  const inputRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const userTurnRef = useRef(0);         // counts user turns for chronicle trigger
  const isChroniclingRef = useRef(false); // prevents concurrent chronicle calls
  const dailyQuestIssuedRef = useRef(false); // prevents duplicate issuance per session
  // Ref-based indirection so the daily quest useEffect doesn't need triggerDailyQuestIssuance
  // in its dependency array (avoids TDZ crash from forward-declaration order)
  const triggerDailyQuestIssuanceRef = useRef(null);

  const { stream, isStreaming } = useClaudeAPI();
  const { playSting } = useSystemSting();

  const addNotification = useCallback((text, type = 'xp') => {
    const id = ++notifIdRef.current;
    setNotifications((prev) => [...prev, { id, text, type }]);
    // Auto-dismiss after 3s
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3000);
  }, []);

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

  // ─── Daily quest auto-issuance ──────────────────────────────────────────────
  // Uses a ref so this effect never lists triggerDailyQuestIssuance in its dependency
  // array — that function is declared later in the component body (forward reference),
  // and placing it in a dep array would trigger a TDZ ReferenceError on first render.
  useEffect(() => {
    if (!sessionInitialized) return;
    const today = new Date().toISOString().split('T')[0];
    const dq = gameState.dailyQuests;
    const needsIssuance = !dq?.issuedDate || dq.issuedDate !== today;
    if (needsIssuance && !dailyQuestIssuedRef.current) {
      // Delay slightly so the session init messages render first
      const timer = setTimeout(() => triggerDailyQuestIssuanceRef.current?.(), 2000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionInitialized, gameState.dailyQuests]);

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

    // Strip any existing SESSION RESUME messages and empty-content messages before prepending
    const cleanHistory = history.filter(
      (m) => m.content?.trim().length > 0 && !m.content.startsWith('[SESSION RESUME]')
    );

    // Build the history Claude will see: single resume context + clean prior history
    const fullHistory = [resumeMsg, ...cleanHistory];
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

    // ── STATE ANCHOR: append current sim state after the player's command ──────
    // Player command comes FIRST so the model processes it as the primary action.
    // The state anchor follows as supporting context (prevents tone/stat drift).
    // Putting text last caused GPT-4o to sometimes anchor on its prior choices
    // rather than execute the player's explicit command.
    const stateAnchor = buildStateAnchor(gameState);
    const anchoredUserMsg = {
      role: 'user',
      content: `${text}\n\n---\n\n${stateAnchor}`,
    };

    // Build API history with anchor injected on the latest user message
    // Filter out any empty-content messages — the API rejects them
    const priorHistory = gameState.conversationHistory.filter(
      (m) => m.content?.trim().length > 0
    );
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

        // Capture state snapshot before applying parsed response for diff notifications
        const prevPlayer = gameState.playerState;
        const prevQuests = gameState.quests;

        gameState.applyAPIResponse(parsed);

        // ── Missed Level-Up Detection ─────────────────────────────────────────
        // GPT-4o often updates XP in [ SYSTEM STATUS WINDOW ] past the threshold
        // but forgets to output [ LEVEL UP DETECTED ]. Catch this here using
        // the raw parsed values before React state settles.
        if (parsed.statusWindow?.xp && !parsed.levelUp) {
          const reportedXP = parsed.statusWindow.xp.current ?? 0;
          // Never allow level to go below what the player already has
          const reportedLevel = parsed.statusWindow.level
            ? Math.max(parsed.statusWindow.level, prevPlayer.level ?? 1)
            : (prevPlayer.level ?? 1);
          if (reportedXP >= xpToNextLevel(reportedLevel)) {
            const missedLevelUp = gameState.forceLevelUpFromXP(reportedXP, reportedLevel);
            if (missedLevelUp) {
              setLevelUpData(missedLevelUp);
              addNotification(`LEVEL ${missedLevelUp.fromLevel} → ${missedLevelUp.toLevel}`, 'level');
              playSting('level-up');
            }
          }
        }

        // ── XP ENFORCEMENT — client-side safety net ─────────────────────────
        // Claude is supposed to bump XP in [ SYSTEM STATUS WINDOW ] after every
        // kill, quest completion, and objective. It often forgets. We compute
        // the expected XP from the loot block and quest deltas, compare to the
        // actual delta in Claude's status window, and top up any shortfall so
        // the player NEVER has to remind the GM to award XP.
        const xpAudit = computeExpectedXPGain(parsed, { quests: prevQuests });
        if (xpAudit.total > 0) {
          const claudeXP = parsed.statusWindow?.xp?.current;
          const prevXP = prevPlayer?.xp?.current ?? 0;
          // If a level-up was issued this turn, Claude's xpOverflow reset XP — don't
          // attempt a delta calc against the pre-level value (would be misleading).
          // The level-up reward is its own thing; loot/quest XP still needs to be added.
          const claudeAwardedThisTurn = parsed.levelUp
            ? 0
            : Math.max(0, (claudeXP ?? prevXP) - prevXP);
          const shortfall = Math.max(0, xpAudit.total - claudeAwardedThisTurn);
          if (shortfall > 0) {
            const cascadedLevelUp = gameState.addXP(shortfall);
            addNotification(`+${shortfall} XP (audit)`, 'xp');
            // If the top-up itself crossed a level threshold and Claude didn't
            // already issue a level-up block, open the modal with synthetic data.
            if (cascadedLevelUp && !parsed.levelUp) {
              setLevelUpData(cascadedLevelUp);
              playSting('level-up');
            }
            // Diagnostic — helps verify the enforcement is firing during dev.
            console.info(
              `[XP Audit] Topped up ${shortfall} XP. Expected: ${xpAudit.total}, Claude awarded: ${claudeAwardedThisTurn}. Sources: ${xpAudit.breakdown.sources.join('; ')}`,
            );
          }
        }

        // ── Daily Quest Bonus XP ─────────────────────────────────────────────
        // The [ DAILY QUEST UPDATE ] block reports bonusXP but applyAPIResponse
        // only stores it as metadata in dailyQuests — it never calls addXP().
        // Apply it here so the XP bar actually updates when quests complete.
        if (parsed.dailyQuestUpdate?.bonusXP > 0) {
          const bonusXP = parsed.dailyQuestUpdate.bonusXP;
          const cascadedLevelUp = gameState.addXP(bonusXP);
          addNotification(`+${bonusXP} XP (daily)`, 'xp');
          if (cascadedLevelUp && !parsed.levelUp) {
            setLevelUpData(cascadedLevelUp);
            playSting('level-up');
          }
        }
        if (parsed.dailyQuestUpdate?.allComplete) {
          playSting('daily-complete');
        }

        // ── Fire floating notifications based on state diffs ────────────────
        if (parsed.statusWindow) {
          const sw = parsed.statusWindow;
          // XP gain
          if (sw.xp && prevPlayer?.xp) {
            const gained = sw.xp.current - (prevPlayer.xp.current || 0);
            if (gained > 0) addNotification(gained.toString(), 'xp');
          }
          // Stat increases (from level-up allocations or passive gains)
          if (sw.stats && prevPlayer?.stats) {
            Object.entries(sw.stats).forEach(([stat, val]) => {
              const prev = prevPlayer.stats?.[stat];
              if (val !== null && prev !== null && val > prev) {
                addNotification(`${stat} +${val - prev}`, 'stat');
              }
            });
          }
        }
        // Level up notification
        if (parsed.levelUp) {
          const { fromLevel, toLevel } = parsed.levelUp;
          addNotification(`LEVEL ${fromLevel} → ${toLevel}`, 'level');
        }
        // Skill gained or ranked up — fire sting once per response max
        if (parsed.skillDirectory?.skills?.length > 0) {
          let skillStingFired = false;
          parsed.skillDirectory.skills.forEach((skill) => {
            const existing = gameState.skills?.find((s) => s.name === skill.name);
            if (!existing) {
              addNotification(`${skill.name} ACQUIRED`, 'skill');
              if (!skillStingFired) { playSting('skill'); skillStingFired = true; }
            } else if (skill.rank && existing.rank && skill.rank !== existing.rank) {
              addNotification(`${skill.name} → Rank ${skill.rank}`, 'skill');
              if (!skillStingFired) { playSting('skill'); skillStingFired = true; }
            }
          });
        }
        // Loot notifications — cash and stones
        if (parsed.loot) {
          const { cash, magicStones, xpAwarded } = parsed.loot;
          if (cash > 0) {
            const fmt = cash >= 1000000 ? `${(cash/1000000).toFixed(1)}M` : cash >= 1000 ? `${(cash/1000).toFixed(0)}K` : cash.toString();
            addNotification(`+${fmt} won`, 'loot');
          }
          const stoneRanks = ['S','A','B','C','D','E'];
          for (const rank of stoneRanks) {
            const count = magicStones?.[rank] || 0;
            if (count > 0) addNotification(`${rank}-Stone ×${count}`, 'loot');
          }
          if (xpAwarded > 0) addNotification(`+${xpAwarded} XP (combat)`, 'xp');
        }

        // Shadow extracted — fire sting once per response max
        let shadowStingFired = false;

        if (parsed.shadowArmy?.soldiers?.length > 0) {
          parsed.shadowArmy.soldiers.forEach((soldier) => {
            const existing = gameState.shadowArmy?.find((s) => s.name === soldier.name);
            if (!existing) {
              addNotification(`${soldier.name} EXTRACTED`, 'shadow');
              if (!shadowStingFired) { playSting('shadow'); shadowStingFired = true; }
            }
          });
        }

        // Shadow extraction result — notification and naming modal for Generals
        if (parsed.shadowExtractionResult?.success) {
          const { target, grade, isGeneral: isGen } = parsed.shadowExtractionResult;
          if (target) {
            addNotification(`${target} EXTRACTED`, 'shadow');
            if (!shadowStingFired) { playSting('shadow'); shadowStingFired = true; }
          }
          // General-tier → show naming modal
          if (isGen && target) {
            setShadowNamingData({
              name: target,
              grade: grade || 'Knight',
              origin: target,
            });
          }
        }

        // Shadow Protocol stage messages — show cold system briefing for each arc stage
        if (parsed.shadowProtocol) {
          const { stage, status, directive } = parsed.shadowProtocol;
          if (stage === 'anomaly') {
            setMessages((prev) => [
              ...prev,
              {
                role: 'system-briefing',
                content: `[ SHADOW PROTOCOL ]\n${status || 'ANOMALOUS THRESHOLD DETECTED'}\nInterface fragment. Unrecognized process. Origin unknown.`,
              },
            ]);
          } else if (stage === 'compatibility') {
            setMessages((prev) => [
              ...prev,
              {
                role: 'system-briefing',
                content: `[ SHADOW PROTOCOL — COMPATIBILITY CONFIRMED ]\n${directive || 'Locate the gate. Eliminate the apex entity.'}`,
              },
            ]);
          } else if (stage === 'unlocked') {
            addNotification('SHADOW PROTOCOL UNLOCKED', 'shadow');
            if (!shadowStingFired) { playSting('shadow'); shadowStingFired = true; }
            setMessages((prev) => [
              ...prev,
              {
                role: 'system-briefing',
                content: `[ SHADOW PROTOCOL — SHADOW EXTRACTION UNLOCKED ]\nThe System recognizes dominion over the fallen.\nYou may now extract shadows from enemies you personally kill.`,
              },
            ]);
          }
        }

        // Trigger UI events from parsed blocks
        if (parsed.combat) {
          setCombatData(parsed.combat);
          setShowCombat(true);
        }
        if (parsed.levelUp) {
          setLevelUpData(parsed.levelUp);
          playSting('level-up');
        }
        if (parsed.titleUnlocked) {
          setTitleData(parsed.titleUnlocked);
          playSting('title');
        }

        // NPC arc turning-point notification — only fires for noteworthy arc stages
        if (parsed.npcArc?.name && parsed.npcArc?.arcStage) {
          const { name: arcName, arcStage } = parsed.npcArc;
          if (!/^stable$/i.test(arcStage)) {
            addNotification(`${arcName} — ${arcStage.toUpperCase()}`, 'npc');
          }
        }

        // Phase 3 notifications
        if (parsed.rivalSighting?.name) {
          addNotification(`RIVAL: ${parsed.rivalSighting.name}`, 'rival');
        }
        if (parsed.contractAvailable?.name) {
          addNotification(`CONTRACT: ${parsed.contractAvailable.name} [${parsed.contractAvailable.rank}]`, 'contract');
        }
        if (parsed.cityUpdate?.isOverflow) {
          addNotification('OVERFLOW EVENT', 'overflow');
          playSting('penalty');
        }
        if (parsed.rankCeremony?.newRank) {
          addNotification(`RANK ${parsed.rankCeremony.oldRank} → ${parsed.rankCeremony.newRank}`, 'level');
        }
        if (parsed.expenseNotice?.type && /overdue/i.test(parsed.expenseNotice.status || '')) {
          addNotification(`OVERDUE: ${parsed.expenseNotice.type}`, 'expense');
        }

        // Phase 4 notifications
        if (parsed.legendEntry?.entry) {
          addNotification(`LEGEND: ${parsed.legendEntry.entry.slice(0, 40)}`, 'level');
          playSting('levelUp');
        }
        if (parsed.systemAnomaly) {
          addNotification('SYSTEM ANOMALY DETECTED', 'overflow');
          playSting('penalty');
        }
        if (parsed.memoryFragment?.title) {
          addNotification(`MEMORY: ${parsed.memoryFragment.title}`, 'npc');
        }
        if (parsed.newsFeed?.headline) {
          addNotification(`NEWS: ${parsed.newsFeed.headline.slice(0, 40)}`, 'contract');
        }
        if (parsed.moralDecision?.situation) {
          setMoralDecision(parsed.moralDecision);
        }

        // Phase 5 notifications
        if (parsed.gateRecord?.isFirstClear) {
          const bonus = parsed.gateRecord.bonus ? ` +${parsed.gateRecord.bonus}` : '';
          addNotification(`FIRST CLEAR: ${parsed.gateRecord.name || 'Gate'}${bonus}`, 'level');
          playSting('levelUp');
        }
        if (parsed.uniqueItem?.name) {
          addNotification(`UNIQUE DROP: ${parsed.uniqueItem.name}`, 'loot');
          playSting('title');
        }
        if (parsed.setBonus?.active && parsed.setBonus?.setName) {
          addNotification(`SET BONUS: ${parsed.setBonus.setName}`, 'skill');
        }
        if (parsed.gearAesthetic?.description) {
          addNotification('COMBAT AESTHETIC UPDATED', 'stat');
        }

        // Phase 6 notifications
        if (parsed.statMilestone?.stat) {
          const { stat, value, title } = parsed.statMilestone;
          addNotification(`${stat} ${value}${title ? ` — ${title}` : ''}`, 'level');
          playSting('levelUp');
        }
        if (parsed.systemTierUnlock?.tier) {
          addNotification(`SYSTEM TIER ${parsed.systemTierUnlock.tier} UNLOCKED`, 'level');
          playSting('levelUp');
          setMessages((prev) => [
            ...prev,
            {
              role: 'system-briefing',
              content: `[ SYSTEM TIER ${parsed.systemTierUnlock.tier} — ${parsed.systemTierUnlock.unlockedFeature || 'NEW FEATURE'} ]\n${parsed.systemTierUnlock.message || ''}`,
            },
          ]);
        }
        if (parsed.achievement?.title) {
          addNotification(`ACHIEVEMENT: ${parsed.achievement.title}`, 'skill');
        }
        if (parsed.skillMutation?.skillName) {
          setSkillMutationData(parsed.skillMutation);
        }

        // Phase 7 — Rest scene
        if (parsed.rest?.duration) {
          addNotification(`REST — ${parsed.rest.duration}${parsed.rest.condition ? ` [${parsed.rest.condition}]` : ''}`, 'stat');
        }

        // Handle penalty zone activation
        if (parsed.penaltyZone) {
          playSting('penalty');
          setMessages((prev) => [
            ...prev,
            {
              role: 'system-error',
              content: '[ PENALTY ZONE ]\n\nYou failed to complete your daily directives.\nThe System does not forgive. The System does not forget.\nA dungeon has been assigned. Clear it.',
            },
          ]);
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
  }, [apiKey, isStreaming, gameState, stream, triggerSave, generateChronicle, addNotification, playSting]);

  // ─── Daily Quest issuance — fires once per real-world day ───────────────────
  const triggerDailyQuestIssuance = useCallback(async () => {
    if (dailyQuestIssuedRef.current) return;
    dailyQuestIssuedRef.current = true;

    // Show a system briefing in the feed so the player knows quests are incoming
    setMessages((prev) => [
      ...prev,
      {
        role: 'system-briefing',
        content: '[ SYSTEM ] Issuing daily training directives...',
      },
    ]);

    // Send a directive to Claude to issue daily quests
    const directive = `[ SYSTEM DIRECTIVE ] A new day has begun. Issue today's Daily Quest directives using the [ DAILY QUEST ] block. Scale tasks to the Hunter's current level and stats. Output the block and a single cold System notification line only — no narrative, no player reaction.`;

    await sendMessage(directive);
  }, [sendMessage]);

  // Keep the ref in sync so the daily quest useEffect can call it without a forward-ref crash
  triggerDailyQuestIssuanceRef.current = triggerDailyQuestIssuance;

  // ─── Shadow naming confirm ───────────────────────────────────────────────
  const handleShadowNameConfirm = useCallback((chosenName) => {
    if (!shadowNamingData) return;
    const { name: currentName } = shadowNamingData;
    gameState.nameGeneral(currentName, chosenName);
    setShadowNamingData(null);

    // Notify Claude of the naming so it uses it going forward
    sendMessage(
      `[ SHADOW NAMED ] I have named ${currentName} — "${chosenName}". Use this name going forward. The shadow acknowledges it.`,
    );
  }, [shadowNamingData, gameState, sendMessage]);

  const handleShadowNameCancel = useCallback(() => {
    setShadowNamingData(null);
  }, []);

  // ─── Moral Decision choice handler ──────────────────────────────────────────
  const handleMoralDecisionChoice = useCallback((choiceText) => {
    setMoralDecision(null);
    sendMessage(`[ MORAL DECISION ] I chose: ${choiceText}`);
  }, [sendMessage]);

  // ─── Skill Mutation choice handler ──────────────────────────────────────────
  const handleMutationChoice = useCallback((path) => {
    setSkillMutationData(null);
    sendMessage(
      `[ MUTATION CHOSEN ] Skill: ${skillMutationData?.skillName}. I chose path "${path.name}". ${path.description} Now advance the skill to Rank S with this mutation applied and output [ SKILL DIRECTORY ] with the updated skill.`,
    );
  }, [sendMessage, skillMutationData]);

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
            dailyQuests={gs.dailyQuests}
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

          {/* Floating notifications overlay */}
          <FloatingNotifications notifications={notifications} />

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
          {moralDecision && (
            <MoralDecisionOverlay
              decision={moralDecision}
              onChoice={handleMoralDecisionChoice}
            />
          )}
          {skillMutationData && (
            <SkillMutationModal
              mutationData={skillMutationData}
              onChoose={handleMutationChoice}
            />
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
            {activeTab === 1 && <Inventory inventory={gs.inventory} playerState={gs.playerState} />}
            {activeTab === 2 && <QuestsPanel quests={gs.quests} />}
            {activeTab === 3 && <WorldPanel playerState={gs.playerState} worldEvents={gs.worldEvents} cityState={gs.cityState} hunterRegistry={gs.hunterRegistry} />}
            {activeTab === 4 && <RelationsPanel npcs={gs.npcs} />}
            {activeTab === 5 && <DailyQuestPanel dailyQuests={gs.dailyQuests} />}
            {activeTab === 6 && <ShadowArmyPanel shadowArmy={gs.shadowArmy} playerState={gs.playerState} />}
            {activeTab === 7 && <EconomyPanel economy={gs.economy} market={gs.market} inventory={gs.inventory} />}
            {activeTab === 8 && <NewsFeedPanel newsFeed={gs.newsFeed} codex={gs.codex} />}
            {activeTab === 9 && <BestiaryPanel bestiary={gs.bestiary} gateRecords={gs.gateRecords} />}
            {activeTab === 10 && <AchievementsPanel achievements={gs.achievements} playerState={gs.playerState} />}
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
      {shadowNamingData && (
        <ShadowNamingModal
          shadow={shadowNamingData}
          onConfirm={handleShadowNameConfirm}
          onCancel={handleShadowNameCancel}
        />
      )}
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
