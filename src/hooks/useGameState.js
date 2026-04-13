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
} from '../constants/defaultState';
import { applyParsedState } from '../utils/stateParser';
import { capConversationHistory } from '../utils/promptBuilder';

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
  }), [
    playerState, skills, inventory, quests, npcs, worldState,
    sessionMeta, conversationHistory, characterAnswers,
    levelHistory, titles, worldEvents, reputation,
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
      const { fromLevel, toLevel } = parsedResponse.levelUp;
      setLevelHistory((prev) => [
        ...prev,
        {
          from: fromLevel,
          to: toLevel,
          timestamp: new Date().toISOString(),
          sessionNumber: sessionMeta.sessionNumber,
        },
      ]);
      // Update playerState.level even if no STATUS WINDOW came with this response
      if (toLevel) {
        setPlayerState((prev) => {
          if (!prev.level || prev.level < toLevel) {
            return { ...prev, level: toLevel };
          }
          return prev;
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

    // ── NPC relationships (upsert by name) ───────────────────────────────────
    if (parsedResponse.npcUpdate) {
      setNpcs((prev) => {
        const next = applyParsedState(
          { playerState: {}, skills: [], inventory: {}, npcs: prev },
          parsedResponse,
        );
        return next.npcs || prev;
      });
    }
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
  }, []);

  const updateSessionTime = useCallback((additionalMs) => {
    setSessionMeta((prev) => ({
      ...prev,
      totalPlayTime: (prev.totalPlayTime || 0) + additionalMs,
      lastSaveTime: new Date().toISOString(),
    }));
  }, []);

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

    // Actions
    getFullState,
    loadSavedState,
    applyAPIResponse,
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
  };
}
