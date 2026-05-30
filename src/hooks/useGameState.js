// useGameState — central game state management
// Manages all game data and state transitions

import { useState, useCallback } from 'react';
import {
  DEFAULT_PLAYER_STATE,
  DEFAULT_SKILLS,
  DEFAULT_INVENTORY,
  DEFAULT_QUESTS,
  DEFAULT_NPCS,
  DEFAULT_WORLD_STATE,
  DEFAULT_SESSION_META,
  DEFAULT_DAILY_QUESTS,
  DEFAULT_SHADOW_ARMY,
  DEFAULT_ECONOMY,
  DEFAULT_CITY_STATE,
  DEFAULT_MARKET,
  DEFAULT_RIVAL,
  DEFAULT_HUNTER_REGISTRY,
  DEFAULT_NEWS_FEED,
  DEFAULT_CODEX,
  DEFAULT_BESTIARY,
  DEFAULT_GATE_RECORDS,
  DEFAULT_ACHIEVEMENTS,
  shadowCapacityFromINT,
} from '../constants/defaultState';
import { applyParsedState, xpToNextLevel } from '../utils/stateParser';
import { capConversationHistory } from '../utils/promptBuilder';

// Shadow grade order for promotion checks
const SHADOW_GRADE_ORDER = [
  'Private', 'Soldier', 'Elite', 'Knight', 'Commander', 'General', 'Marshal', 'Sovereign',
];

// Derive whether deployment pattern should trigger a grade promotion.
// Returns the new grade (or the same grade if no promotion yet).
// Each pattern has its own XP channel — uses promotionXP as a shared counter here
// since the personality already encodes the dominant pattern.
function deriveGradeFromPattern(currentGrade, personality, promotionXP) {
  // Simple threshold: every 10 deployments = one grade up (capped at Commander)
  const maxAutoGrade = 'Commander';
  const maxIdx = SHADOW_GRADE_ORDER.indexOf(maxAutoGrade);
  const curIdx = SHADOW_GRADE_ORDER.indexOf(currentGrade);
  if (curIdx < 0 || curIdx >= maxIdx) return currentGrade;
  const threshold = (curIdx + 1) * 10;
  if (promotionXP >= threshold) {
    return SHADOW_GRADE_ORDER[curIdx + 1];
  }
  return currentGrade;
}

export function useGameState() {
  const [playerState, setPlayerState] = useState(DEFAULT_PLAYER_STATE);
  const [skills, setSkills] = useState(DEFAULT_SKILLS);
  const [inventory, setInventory] = useState(DEFAULT_INVENTORY);
  const [quests, setQuests] = useState(DEFAULT_QUESTS);
  const [npcs, setNpcs] = useState(DEFAULT_NPCS);
  const [worldState, setWorldState] = useState(DEFAULT_WORLD_STATE);
  const [sessionMeta, setSessionMeta] = useState(DEFAULT_SESSION_META);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [characterAnswers, setCharacterAnswers] = useState({});
  const [levelHistory, setLevelHistory] = useState([]);
  const [titles, setTitles] = useState([]);
  const [worldEvents, setWorldEvents] = useState([]);
  const [reputation, setReputation] = useState({});
  const [dailyQuests, setDailyQuests] = useState(DEFAULT_DAILY_QUESTS);
  const [shadowArmy, setShadowArmy] = useState(DEFAULT_SHADOW_ARMY);
  const [economy, setEconomy] = useState(DEFAULT_ECONOMY);
  const [cityState, setCityState] = useState(DEFAULT_CITY_STATE);
  const [market, setMarket] = useState(DEFAULT_MARKET);
  const [rivalHunter, setRivalHunter] = useState(DEFAULT_RIVAL);
  const [hunterRegistry, setHunterRegistry] = useState(DEFAULT_HUNTER_REGISTRY);
  // Phase 4 — Story Architecture
  const [newsFeed, setNewsFeed] = useState(DEFAULT_NEWS_FEED);
  const [codex, setCodex] = useState(DEFAULT_CODEX);
  // Phase 5 — Loot, Gear & Combat Depth
  const [bestiary, setBestiary] = useState(DEFAULT_BESTIARY);
  const [gateRecords, setGateRecords] = useState(DEFAULT_GATE_RECORDS);
  // Phase 6 — Progression & System Depth
  const [achievements, setAchievements] = useState(DEFAULT_ACHIEVEMENTS);

  const getFullState = useCallback(() => ({
    playerState,
    skills,
    inventory,
    quests,
    npcs,
    worldState,
    sessionMeta,
    conversationHistory,
    characterAnswers,
    levelHistory,
    titles,
    worldEvents,
    reputation,
    dailyQuests,
    shadowArmy,
    economy,
    cityState,
    market,
    rivalHunter,
    hunterRegistry,
    newsFeed,
    codex,
    bestiary,
    gateRecords,
    achievements,
  }), [
    playerState, skills, inventory, quests, npcs, worldState,
    sessionMeta, conversationHistory, characterAnswers,
    levelHistory, titles, worldEvents, reputation, dailyQuests, shadowArmy,
    economy, cityState, market, rivalHunter, hunterRegistry,
    newsFeed, codex, bestiary, gateRecords, achievements,
  ]);

  const loadSavedState = useCallback((saved) => {
    if (saved.playerState) setPlayerState(saved.playerState);
    if (saved.skills) setSkills(saved.skills);
    if (saved.inventory) setInventory(saved.inventory);
    if (saved.sessionMeta) setSessionMeta(saved.sessionMeta);
    if (saved.characterAnswers) setCharacterAnswers(saved.characterAnswers);
    if (saved.levelHistory) setLevelHistory(saved.levelHistory);
    if (saved.titles) setTitles(saved.titles);
    if (saved.worldEvents) setWorldEvents(saved.worldEvents);
    if (saved.npcs) setNpcs(saved.npcs);
    if (saved.reputation) setReputation(saved.reputation);
    if (saved.dailyQuests) setDailyQuests(saved.dailyQuests);
    if (saved.shadowArmy) setShadowArmy(saved.shadowArmy);
    if (saved.economy) setEconomy(saved.economy);
    if (saved.cityState) setCityState(saved.cityState);
    if (saved.market) setMarket(saved.market);
    if (saved.rivalHunter !== undefined) setRivalHunter(saved.rivalHunter);
    if (saved.hunterRegistry) setHunterRegistry(saved.hunterRegistry);
    if (saved.newsFeed) setNewsFeed(saved.newsFeed);
    if (saved.codex) setCodex(saved.codex);
    if (saved.bestiary) setBestiary(saved.bestiary);
    if (saved.gateRecords) setGateRecords(saved.gateRecords);
    if (saved.achievements) setAchievements(saved.achievements);
    if (saved.conversationHistory) {
      setConversationHistory(capConversationHistory(saved.conversationHistory, 60));
    }
  }, []);

  const applyAPIResponse = useCallback((parsedResponse) => {
    if (!parsedResponse) return;

    // ── Player state (functional setter — always operates on latest value) ────
    setPlayerState((prevPlayer) => {
      const next = applyParsedState({ playerState: prevPlayer, skills: [], inventory: {} }, parsedResponse);
      return next.playerState !== prevPlayer ? next.playerState : prevPlayer;
    });

    // ── Skills (upsert by name) ───────────────────────────────────────────────
    setSkills((prevSkills) => {
      const next = applyParsedState({ playerState: {}, skills: prevSkills, inventory: {} }, parsedResponse);
      return next.skills !== prevSkills ? next.skills : prevSkills;
    });

    // ── Inventory ─────────────────────────────────────────────────────────────
    setInventory((prevInv) => {
      const next = applyParsedState({ playerState: {}, skills: [], inventory: prevInv }, parsedResponse);
      return next.inventory !== prevInv ? next.inventory : prevInv;
    });

    // ── Level up ─────────────────────────────────────────────────────────────
    if (parsedResponse.levelUp) {
      const { fromLevel, toLevel, xpOverflow, hpIncrease, mpIncrease, staminaIncrease } = parsedResponse.levelUp;
      setLevelHistory((prev) => [
        ...prev,
        {
          from: fromLevel,
          to: toLevel,
          timestamp: new Date().toISOString(),
          sessionNumber: sessionMeta.sessionNumber,
        },
      ]);
      // Apply level-up immediately so the XP bar refreshes BEFORE the post-allocation
      // status window arrives. This fixes the bug where the bar lingered at "125/100"
      // after passing the threshold instead of jumping to "25/150".
      if (toLevel) {
        setPlayerState((prev) => {
          if (prev.level && prev.level >= toLevel) return prev;
          const newToNext = xpToNextLevel(toLevel);
          // Overflow XP carries forward — Claude provides it via XP Overflow field
          const newCurrentXP = (xpOverflow !== null && xpOverflow !== undefined && !isNaN(xpOverflow))
            ? xpOverflow
            : 0;
          // Update max HP/MP/Stamina from per-level increases (auto formula matches masterPrompt)
          const prevHP = prev.hp || { current: 0, max: 0 };
          const prevMP = prev.mp || { current: 0, max: 0 };
          const prevSt = prev.stamina || { current: 0, max: 0 };
          const hpInc = hpIncrease ?? (10 + Math.floor((prev.stats?.END || 10) / 5));
          const mpInc = mpIncrease ?? (5 + Math.floor((prev.stats?.INT || 10) / 6));
          const stInc = staminaIncrease ?? (8 + Math.floor((prev.stats?.END || 10) / 6));
          return {
            ...prev,
            level: toLevel,
            xp: { current: newCurrentXP, toNext: newToNext },
            hp: { current: prevHP.max + hpInc, max: prevHP.max + hpInc },
            mp: { current: prevMP.max + mpInc, max: prevMP.max + mpInc },
            stamina: { current: prevSt.max + stInc, max: prevSt.max + stInc },
          };
        });
      }
    }

    // ── Title unlock ──────────────────────────────────────────────────────────
    if (parsedResponse.titleUnlocked?.title) {
      const newTitle = parsedResponse.titleUnlocked.title;
      setTitles((prev) => (prev.includes(newTitle) ? prev : [...prev, newTitle]));
      setPlayerState((prev) => ({
        ...prev,
        titles: prev.titles?.includes(newTitle) ? prev.titles : [...(prev.titles || []), newTitle],
      }));
    }

    // ── Quest log (upsert active, append completed/failed) ────────────────────
    if (parsedResponse.questLog) {
      setQuests((prevQ) => {
        const next = applyParsedState(
          { playerState: {}, skills: [], inventory: {}, quests: prevQ },
          parsedResponse,
        );
        return next.quests || prevQ;
      });
    }

    // ── World events (append unique) ──────────────────────────────────────────
    if (parsedResponse.worldEvent) {
      setWorldEvents((prev) => {
        const next = applyParsedState(
          { playerState: {}, skills: [], inventory: {}, worldEvents: prev },
          parsedResponse,
        );
        return next.worldEvents || prev;
      });
    }

    // ── NPC relationships (upsert by name) + NPC arc (stage/memory update) ─────
    if (parsedResponse.npcUpdate || parsedResponse.npcArc) {
      setNpcs((prev) => {
        const next = applyParsedState(
          { playerState: {}, skills: [], inventory: {}, npcs: prev },
          parsedResponse,
        );
        return next.npcs || prev;
      });
    }

    // ── Daily quests ─────────────────────────────────────────────────────────
    if (parsedResponse.dailyQuest || parsedResponse.dailyQuestUpdate || parsedResponse.penaltyZone) {
      setDailyQuests((prev) => {
        const next = applyParsedState({ dailyQuests: prev }, parsedResponse);
        return next.dailyQuests || prev;
      });
    }

    // ── Shadow Army (upsert by name) ──────────────────────────────────────────
    if (parsedResponse.shadowArmy) {
      setShadowArmy((prev) => {
        const next = applyParsedState({ shadowArmy: prev }, parsedResponse);
        return next.shadowArmy || prev;
      });
    }

    // ── Shadow Protocol: unlock flag ──────────────────────────────────────────
    if (parsedResponse.shadowProtocol?.stage === 'unlocked') {
      setPlayerState((prev) => ({ ...prev, shadowProtocolUnlocked: true }));
    }

    // ── Phase 3: City / Market / Economy / Rival / Registry ──────────────────
    if (parsedResponse.cityUpdate) {
      setCityState((prev) => {
        const next = applyParsedState({ cityState: prev }, parsedResponse);
        return next.cityState || prev;
      });
    }

    if (parsedResponse.marketUpdate) {
      setMarket((prev) => {
        const next = applyParsedState({ market: prev }, parsedResponse);
        return next.market || prev;
      });
    }

    if (parsedResponse.contractAvailable || parsedResponse.contractResult) {
      setEconomy((prev) => {
        const next = applyParsedState({ economy: prev }, parsedResponse);
        return next.economy || prev;
      });
    }

    if (parsedResponse.rivalSighting) {
      setNpcs((prev) => {
        const next = applyParsedState({ playerState: {}, skills: [], inventory: {}, npcs: prev }, parsedResponse);
        return next.npcs || prev;
      });
      setRivalHunter((prev) => {
        const next = applyParsedState({ rivalHunter: prev }, parsedResponse);
        return next.rivalHunter !== undefined ? next.rivalHunter : prev;
      });
    }

    if (parsedResponse.rankCeremony) {
      setPlayerState((prev) => {
        const next = applyParsedState({ playerState: prev }, parsedResponse);
        return next.playerState !== prev ? next.playerState : prev;
      });
    }

    if (parsedResponse.hunterRegistry) {
      setHunterRegistry((prev) => {
        const next = applyParsedState({ hunterRegistry: prev }, parsedResponse);
        return next.hunterRegistry || prev;
      });
    }

    // ── Phase 4: News Feed ────────────────────────────────────────────────────
    if (parsedResponse.newsFeed) {
      setNewsFeed((prev) => {
        const next = applyParsedState({ newsFeed: prev }, parsedResponse);
        return next.newsFeed || prev;
      });
    }

    // ── Phase 4: Lore Codex + Origin Clue ────────────────────────────────────
    if (parsedResponse.loreCodex || parsedResponse.originClue) {
      setCodex((prev) => {
        const next = applyParsedState({ codex: prev }, parsedResponse);
        return next.codex || prev;
      });
    }

    // ── Phase 4: Memory Fragment, Belief Shift, System Anomaly, Legend Entry ──
    if (
      parsedResponse.memoryFragment ||
      parsedResponse.beliefShift ||
      parsedResponse.systemAnomaly ||
      parsedResponse.legendEntry
    ) {
      setPlayerState((prev) => {
        const next = applyParsedState({ playerState: prev }, parsedResponse);
        return next.playerState !== prev ? next.playerState : prev;
      });
    }

    // ── Phase 5: Bestiary Update ──────────────────────────────────────────────
    if (parsedResponse.bestiaryUpdate) {
      setBestiary((prev) => {
        const next = applyParsedState({ bestiary: prev }, parsedResponse);
        return next.bestiary || prev;
      });
    }

    // ── Phase 5: Unique Item — upsert into inventory ──────────────────────────
    if (parsedResponse.uniqueItem) {
      setInventory((prev) => {
        const next = applyParsedState({ playerState: {}, skills: [], inventory: prev }, parsedResponse);
        return next.inventory !== prev ? next.inventory : prev;
      });
    }

    // ── Phase 5: Set Bonus + Gear Aesthetic ───────────────────────────────────
    if (parsedResponse.setBonus || parsedResponse.gearAesthetic) {
      setPlayerState((prev) => {
        const next = applyParsedState({ playerState: prev }, parsedResponse);
        return next.playerState !== prev ? next.playerState : prev;
      });
    }

    // ── Phase 5: Gate Record ──────────────────────────────────────────────────
    if (parsedResponse.gateRecord) {
      setGateRecords((prev) => {
        const next = applyParsedState({ gateRecords: prev }, parsedResponse);
        return next.gateRecords || prev;
      });
    }

    // ── Phase 6: Stat Milestone ───────────────────────────────────────────────
    if (parsedResponse.statMilestone) {
      setPlayerState((prev) => {
        const next = applyParsedState({ playerState: prev }, parsedResponse);
        return next.playerState !== prev ? next.playerState : prev;
      });
    }

    // ── Phase 6: System Tier Unlock ───────────────────────────────────────────
    if (parsedResponse.systemTierUnlock) {
      setPlayerState((prev) => {
        const next = applyParsedState({ playerState: prev }, parsedResponse);
        return next.playerState !== prev ? next.playerState : prev;
      });
    }

    // ── Phase 6: Title Passive (stored in playerState.titlePassives) ──────────
    if (parsedResponse.titleUnlocked?.passive) {
      setPlayerState((prev) => {
        const next = applyParsedState({ playerState: prev }, parsedResponse);
        return next.playerState !== prev ? next.playerState : prev;
      });
    }

    // ── Phase 6: Achievement ──────────────────────────────────────────────────
    if (parsedResponse.achievement) {
      setAchievements((prev) => {
        const next = applyParsedState({ achievements: prev }, parsedResponse);
        return next.achievements || prev;
      });
    }

    // ── Shadow Extraction Result: add new shadow if no SHADOW ARMY block ──────
    if (parsedResponse.shadowExtractionResult?.success && !parsedResponse.shadowArmy) {
      const { target, grade, personality } = parsedResponse.shadowExtractionResult;
      if (target) {
        setShadowArmy((prev) => {
          const alreadyExists = prev.some(
            (s) => s.name.toLowerCase() === target.toLowerCase(),
          );
          if (alreadyExists) return prev;
          return [
            ...prev,
            {
              name: target,
              grade: grade || 'Private',
              origin: target,
              status: 'active',
              extractedAt: null,
              notes: null,
              isGeneral: false,
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
        });
      }
    }
  }, [sessionMeta]);

  // ── XP top-up (client-side enforcement) ──────────────────────────────────
  // Adds `amount` XP to the player. Cascades level-ups if the new total crosses
  // one or more thresholds (rare — usually a single level). Returns synthetic
  // levelUp info matching the parsed.levelUp shape so callers can open the
  // LevelUpModal exactly the same way as a Claude-issued level-up. This is the
  // safety net for when Claude forgets to bump XP in [ SYSTEM STATUS WINDOW ]
  // after a kill, quest completion, or objective.
  const addXP = useCallback((amount) => {
    if (!amount || amount <= 0) return null;
    let levelUpInfo = null;
    let levelLogEntry = null;

    setPlayerState((prev) => {
      const startXP = prev.xp?.current || 0;
      let curXP = startXP + amount;
      let newLevel = prev.level || 1;
      let toNext = prev.xp?.toNext || xpToNextLevel(newLevel);
      let levelsGained = 0;

      while (curXP >= toNext) {
        curXP -= toNext;
        newLevel += 1;
        toNext = xpToNextLevel(newLevel);
        levelsGained += 1;
      }

      const updated = { ...prev, xp: { current: curXP, toNext } };

      if (levelsGained > 0) {
        const endStat = prev.stats?.END || 10;
        const intStat = prev.stats?.INT || 10;
        const hpInc = levelsGained * (10 + Math.floor(endStat / 5));
        const mpInc = levelsGained * (5 + Math.floor(intStat / 6));
        const stInc = levelsGained * (8 + Math.floor(endStat / 6));
        const prevHP = prev.hp || { current: 0, max: 0 };
        const prevMP = prev.mp || { current: 0, max: 0 };
        const prevSt = prev.stamina || { current: 0, max: 0 };

        updated.level = newLevel;
        updated.hp = { current: prevHP.max + hpInc, max: prevHP.max + hpInc };
        updated.mp = { current: prevMP.max + mpInc, max: prevMP.max + mpInc };
        updated.stamina = { current: prevSt.max + stInc, max: prevSt.max + stInc };

        levelUpInfo = {
          fromLevel: prev.level || 1,
          toLevel: newLevel,
          statPoints: 5 * levelsGained,
          xpOverflow: curXP,
          hpIncrease: hpInc,
          mpIncrease: mpInc,
          staminaIncrease: stInc,
          systemNote: 'Threshold crossed during XP audit. Allocate stat points.',
          paths: [],
        };
        levelLogEntry = {
          from: prev.level || 1,
          to: newLevel,
          timestamp: new Date().toISOString(),
          sessionNumber: sessionMeta.sessionNumber,
        };
      }

      return updated;
    });

    if (levelLogEntry) {
      setLevelHistory((prev) => [...prev, levelLogEntry]);
    }

    return levelUpInfo;
  }, [sessionMeta]);

  // ── Force level-up when Claude reported XP >= threshold but skipped the block ──
  // Called by GameInterface after detecting a missed [ LEVEL UP DETECTED ].
  // Same return-value pattern as addXP (computes synchronously inside the setter).
  const forceLevelUpFromXP = useCallback((xpCurrent, atLevel) => {
    let levelUpInfo = null;
    let levelLogEntry = null;

    setPlayerState((prev) => {
      const effectiveLevel = Math.max(atLevel || 1, prev.level || 1);
      const threshold = xpToNextLevel(effectiveLevel);
      if (xpCurrent < threshold) return prev; // nothing to do

      let curXP = xpCurrent;
      let newLevel = effectiveLevel;
      let levelsGained = 0;

      while (curXP >= xpToNextLevel(newLevel)) {
        curXP -= xpToNextLevel(newLevel);
        newLevel += 1;
        levelsGained += 1;
      }

      const toNext = xpToNextLevel(newLevel);
      const endStat = prev.stats?.END || 10;
      const intStat = prev.stats?.INT || 10;
      const hpInc = levelsGained * (10 + Math.floor(endStat / 5));
      const mpInc = levelsGained * (5 + Math.floor(intStat / 6));
      const stInc = levelsGained * (8 + Math.floor(endStat / 6));
      const prevHP = prev.hp || { current: 0, max: 0 };
      const prevMP = prev.mp || { current: 0, max: 0 };
      const prevSt = prev.stamina || { current: 0, max: 0 };

      levelUpInfo = {
        fromLevel: effectiveLevel,
        toLevel: newLevel,
        statPoints: 5 * levelsGained,
        xpOverflow: curXP,
        hpIncrease: hpInc,
        mpIncrease: mpInc,
        staminaIncrease: stInc,
        systemNote: 'XP threshold crossed. Stat allocation required.',
        paths: [],
      };
      levelLogEntry = {
        from: effectiveLevel,
        to: newLevel,
        timestamp: new Date().toISOString(),
        sessionNumber: sessionMeta.sessionNumber,
      };

      return {
        ...prev,
        level: newLevel,
        xp: { current: curXP, toNext },
        hp: { current: prevHP.max + hpInc, max: prevHP.max + hpInc },
        mp: { current: prevMP.max + mpInc, max: prevMP.max + mpInc },
        stamina: { current: prevSt.max + stInc, max: prevSt.max + stInc },
      };
    });

    if (levelLogEntry) {
      setLevelHistory((prev) => [...prev, levelLogEntry]);
    }
    return levelUpInfo;
  }, [sessionMeta]);

  const addMessage = useCallback((role, content) => {
    setConversationHistory((prev) => {
      const next = [...prev, { role, content }];
      return capConversationHistory(next, 60);
    });
  }, []);

  const setCharacterData = useCallback((answers) => {
    setCharacterAnswers(answers);
    setPlayerState((prev) => ({ ...prev, name: answers.q1 || prev.name }));
  }, []);

  const incrementSession = useCallback(() => {
    setSessionMeta((prev) => ({
      ...prev,
      sessionNumber: (prev.sessionNumber || 1) + 1,
      lastSaveTime: new Date().toISOString(),
    }));
  }, []);

  const resetState = useCallback(() => {
    setPlayerState(DEFAULT_PLAYER_STATE);
    setSkills(DEFAULT_SKILLS);
    setInventory(DEFAULT_INVENTORY);
    setQuests(DEFAULT_QUESTS);
    setWorldState(DEFAULT_WORLD_STATE);
    setSessionMeta(DEFAULT_SESSION_META);
    setConversationHistory([]);
    setCharacterAnswers({});
    setLevelHistory([]);
    setTitles([]);
    setWorldEvents([]);
    setNpcs(DEFAULT_NPCS);
    setReputation({});
    setDailyQuests(DEFAULT_DAILY_QUESTS);
    setShadowArmy(DEFAULT_SHADOW_ARMY);
    setEconomy(DEFAULT_ECONOMY);
    setCityState(DEFAULT_CITY_STATE);
    setMarket(DEFAULT_MARKET);
    setRivalHunter(DEFAULT_RIVAL);
    setHunterRegistry(DEFAULT_HUNTER_REGISTRY);
    setNewsFeed(DEFAULT_NEWS_FEED);
    setCodex(DEFAULT_CODEX);
    setBestiary(DEFAULT_BESTIARY);
    setGateRecords(DEFAULT_GATE_RECORDS);
    setAchievements(DEFAULT_ACHIEVEMENTS);
  }, []);

  const updateSessionTime = useCallback((additionalMs) => {
    setSessionMeta((prev) => ({
      ...prev,
      totalPlayTime: (prev.totalPlayTime || 0) + additionalMs,
      lastSaveTime: new Date().toISOString(),
    }));
  }, []);

  // ── Shadow Army — action methods ──────────────────────────────────────────

  // nameGeneral: promote a shadow to General tier and assign a player-chosen name.
  // Called from ShadowNamingModal after a successful boss extraction.
  const nameGeneral = useCallback((currentName, chosenName) => {
    setShadowArmy((prev) =>
      prev.map((s) =>
        s.name.toLowerCase() === currentName.toLowerCase()
          ? {
              ...s,
              isGeneral: true,
              customName: chosenName,
              name: chosenName,   // customName is displayed; name is the lookup key
            }
          : s,
      ),
    );
  }, []);

  // commandShadow: dispatch a command to a shadow. Increments promotionXP.
  // deploymentState: 'deployed' | 'standby' | 'assigned'
  const commandShadow = useCallback((shadowName, command, deploymentState = 'deployed') => {
    setShadowArmy((prev) =>
      prev.map((s) => {
        if (s.name.toLowerCase() !== shadowName.toLowerCase()) return s;
        const newPromotionXP = (s.promotionXP || 0) + 1;
        return {
          ...s,
          deploymentState,
          promotionXP: newPromotionXP,
          // Check if this deployment pattern triggers a promotion
          grade: deriveGradeFromPattern(s.grade, s.personality, newPromotionXP),
        };
      }),
    );
  }, []);

  // assignShadow: send a shadow on an intelligence assignment between sessions.
  const assignShadow = useCallback((shadowName, task) => {
    setShadowArmy((prev) =>
      prev.map((s) =>
        s.name.toLowerCase() === shadowName.toLowerCase()
          ? {
              ...s,
              deploymentState: task ? 'assigned' : 'standby',
              assignedTask: task || null,
            }
          : s,
      ),
    );
  }, []);

  // recallShadow: return a shadow from assignment back to standby.
  const recallShadow = useCallback((shadowName) => {
    setShadowArmy((prev) =>
      prev.map((s) =>
        s.name.toLowerCase() === shadowName.toLowerCase()
          ? { ...s, deploymentState: 'standby', assignedTask: null }
          : s,
      ),
    );
  }, []);

  // getShadowCapacity: computes max domain slots from current INT stat.
  const getShadowCapacity = useCallback(() => {
    const int = playerState?.stats?.INT || 10;
    return shadowCapacityFromINT(int);
  }, [playerState]);

  // getShadowDomain: returns { active, max } counts for the DOMAIN display.
  const getShadowDomain = useCallback(() => {
    const active = (shadowArmy || []).filter(
      (s) => s.status !== 'lost' && s.deploymentState !== 'standby',
    ).length;
    const max = shadowCapacityFromINT(playerState?.stats?.INT || 10);
    return { active, max };
  }, [shadowArmy, playerState]);

  return {
    // State
    playerState,
    skills,
    inventory,
    quests,
    npcs,
    worldState,
    sessionMeta,
    conversationHistory,
    characterAnswers,
    levelHistory,
    titles,
    worldEvents,
    reputation,
    dailyQuests,
    shadowArmy,
    economy,
    cityState,
    market,
    rivalHunter,
    hunterRegistry,
    newsFeed,
    codex,
    bestiary,
    gateRecords,
    achievements,

    // Actions
    getFullState,
    loadSavedState,
    applyAPIResponse,
    addXP,
    forceLevelUpFromXP,
    addMessage,
    setCharacterData,
    incrementSession,
    resetState,
    updateSessionTime,
    setPlayerState,
    setSkills,
    setInventory,
    setConversationHistory,
    setSessionMeta,
    setDailyQuests,
    setShadowArmy,
    setEconomy,
    setCityState,
    setMarket,
    setRivalHunter,
    setHunterRegistry,
    setNewsFeed,
    setCodex,
    setBestiary,
    setGateRecords,
    // Phase 6
    achievements,
    setAchievements,

    // Shadow army actions
    nameGeneral,
    commandShadow,
    assignShadow,
    recallShadow,
    getShadowCapacity,
    getShadowDomain,
  };
}
