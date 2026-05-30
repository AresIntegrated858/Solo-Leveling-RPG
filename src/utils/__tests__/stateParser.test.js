/**
 * Tests for the XP math path in stateParser.js.
 *
 * Covers:
 *   - xpToNextLevel  — XP curve shape and key level checkpoints
 *   - getSkillRankFromUses — all rank boundaries
 *   - computeExpectedXPGain — all three signal sources and their combinations
 *
 * stateParser.js has no imports so no mocking is needed.
 */

import {
  xpToNextLevel,
  getSkillRankFromUses,
  KILL_XP_TABLE,
  QUEST_COMPLETION_XP,
  QUEST_FAIL_XP,
  OBJECTIVE_XP,
  SKILL_RANK_THRESHOLDS,
  computeExpectedXPGain,
} from '../stateParser';

// ─── xpToNextLevel ────────────────────────────────────────────────────────────

describe('xpToNextLevel', () => {
  test('level 1 → 100 XP (base threshold)', () => {
    expect(xpToNextLevel(1)).toBe(100);
  });

  test('grows monotonically', () => {
    for (let lvl = 1; lvl < 30; lvl++) {
      expect(xpToNextLevel(lvl + 1)).toBeGreaterThan(xpToNextLevel(lvl));
    }
  });

  test('returns integer (Math.floor applied)', () => {
    for (let lvl = 1; lvl <= 20; lvl++) {
      expect(Number.isInteger(xpToNextLevel(lvl))).toBe(true);
    }
  });

  test('key checkpoints match 100×1.25^(level-1) formula', () => {
    // Lv1→2: 100, Lv5→6: 244, Lv10→11: 745
    expect(xpToNextLevel(1)).toBe(100);
    expect(xpToNextLevel(2)).toBe(125);
    expect(xpToNextLevel(5)).toBe(244);
    expect(xpToNextLevel(10)).toBe(745);
    expect(xpToNextLevel(20)).toBe(Math.floor(100 * Math.pow(1.25, 19)));
  });

  test('never returns 0 or negative', () => {
    for (let lvl = 1; lvl <= 50; lvl++) {
      expect(xpToNextLevel(lvl)).toBeGreaterThan(0);
    }
  });
});

// ─── getSkillRankFromUses ─────────────────────────────────────────────────────

describe('getSkillRankFromUses', () => {
  test('0 uses → rank E', () => {
    expect(getSkillRankFromUses(0)).toBe('E');
  });

  test('boundary E→D: 7 uses → E, 8 uses → D', () => {
    expect(getSkillRankFromUses(SKILL_RANK_THRESHOLDS.E - 1)).toBe('E');
    expect(getSkillRankFromUses(SKILL_RANK_THRESHOLDS.E)).toBe('D');
  });

  test('boundary D→C: 19 uses → D, 20 uses → C', () => {
    expect(getSkillRankFromUses(SKILL_RANK_THRESHOLDS.D - 1)).toBe('D');
    expect(getSkillRankFromUses(SKILL_RANK_THRESHOLDS.D)).toBe('C');
  });

  test('boundary C→B: 44 uses → C, 45 uses → B', () => {
    expect(getSkillRankFromUses(SKILL_RANK_THRESHOLDS.C - 1)).toBe('C');
    expect(getSkillRankFromUses(SKILL_RANK_THRESHOLDS.C)).toBe('B');
  });

  test('boundary B→A: 89 uses → B, 90 uses → A', () => {
    expect(getSkillRankFromUses(SKILL_RANK_THRESHOLDS.B - 1)).toBe('B');
    expect(getSkillRankFromUses(SKILL_RANK_THRESHOLDS.B)).toBe('A');
  });

  test('boundary A→S: 179 uses → A, 180 uses → S', () => {
    expect(getSkillRankFromUses(SKILL_RANK_THRESHOLDS.A - 1)).toBe('A');
    expect(getSkillRankFromUses(SKILL_RANK_THRESHOLDS.A)).toBe('S');
  });

  test('very high uses → S', () => {
    expect(getSkillRankFromUses(9999)).toBe('S');
  });
});

// ─── computeExpectedXPGain ────────────────────────────────────────────────────

describe('computeExpectedXPGain', () => {
  const emptyPrev = { quests: { completed: [], failed: [], active: [] } };

  // ── No signals → zero ────────────────────────────────────────────────────

  test('returns zero when parsed has no loot or questLog', () => {
    const result = computeExpectedXPGain({}, emptyPrev);
    expect(result.total).toBe(0);
    expect(result.breakdown.sources).toHaveLength(0);
  });

  test('returns zero with empty loot block (no stones, no xpAwarded)', () => {
    const parsed = { loot: { cash: 500, magicStones: {}, xpAwarded: 0 } };
    const result = computeExpectedXPGain(parsed, emptyPrev);
    expect(result.total).toBe(0);
  });

  // ── Loot: explicit xpAwarded field ────────────────────────────────────────

  test('uses explicit xpAwarded from loot block', () => {
    const parsed = {
      loot: {
        xpAwarded: 180,
        magicStones: { E: 3 }, // should be IGNORED when xpAwarded > 0
      },
    };
    const result = computeExpectedXPGain(parsed, emptyPrev);
    expect(result.total).toBe(180);
    expect(result.breakdown.kills).toBe(180);
    // Must not double-count stones when xpAwarded is present
    expect(result.total).not.toBe(180 + 3 * KILL_XP_TABLE.E);
  });

  // ── Loot: magic stone fallback ────────────────────────────────────────────

  test('estimates XP from magic stones when xpAwarded is absent/zero', () => {
    const parsed = {
      loot: {
        xpAwarded: 0,
        magicStones: { E: 2, D: 1 },
      },
    };
    const expected = 2 * KILL_XP_TABLE.E + 1 * KILL_XP_TABLE.D;
    const result = computeExpectedXPGain(parsed, emptyPrev);
    expect(result.total).toBe(expected);
    expect(result.breakdown.kills).toBe(expected);
    expect(result.breakdown.sources).toHaveLength(2);
  });

  test('single S-rank stone awards S-rank XP (1800)', () => {
    const parsed = { loot: { xpAwarded: 0, magicStones: { S: 1 } } };
    const result = computeExpectedXPGain(parsed, emptyPrev);
    expect(result.total).toBe(KILL_XP_TABLE.S); // 1800
  });

  test('ignores stones of unknown rank', () => {
    const parsed = { loot: { xpAwarded: 0, magicStones: { X: 5 } } };
    const result = computeExpectedXPGain(parsed, emptyPrev);
    expect(result.total).toBe(0);
  });

  // ── Quest completions ────────────────────────────────────────────────────

  test('awards QUEST_COMPLETION_XP for newly completed quest', () => {
    const parsed = {
      questLog: {
        completed: [{ name: 'Gate: Tunnel B3' }],
        failed: [],
        active: [],
      },
    };
    const result = computeExpectedXPGain(parsed, emptyPrev);
    expect(result.total).toBe(QUEST_COMPLETION_XP);
    expect(result.breakdown.quests).toBe(QUEST_COMPLETION_XP);
  });

  test('does NOT re-award XP for already-completed quest', () => {
    const parsed = {
      questLog: {
        completed: [{ name: 'Gate: Tunnel B3' }],
        failed: [],
        active: [],
      },
    };
    const prevWithCompleted = {
      quests: {
        completed: [{ name: 'Gate: Tunnel B3' }],
        failed: [],
        active: [],
      },
    };
    const result = computeExpectedXPGain(parsed, prevWithCompleted);
    expect(result.total).toBe(0);
  });

  test('awards QUEST_FAIL_XP for newly failed quest', () => {
    const parsed = {
      questLog: {
        completed: [],
        failed: [{ name: 'Dungeon: Core Fracture' }],
        active: [],
      },
    };
    const result = computeExpectedXPGain(parsed, emptyPrev);
    expect(result.total).toBe(QUEST_FAIL_XP);
    expect(result.breakdown.quests).toBe(QUEST_FAIL_XP);
  });

  test('does NOT re-award for already-failed quest', () => {
    const parsed = {
      questLog: {
        completed: [],
        failed: [{ name: 'Dungeon: Core Fracture' }],
        active: [],
      },
    };
    const prevWithFailed = {
      quests: { completed: [], failed: [{ name: 'Dungeon: Core Fracture' }], active: [] },
    };
    const result = computeExpectedXPGain(parsed, prevWithFailed);
    expect(result.total).toBe(0);
  });

  // ── Objective completions ─────────────────────────────────────────────────

  test('awards OBJECTIVE_XP for each newly completed objective', () => {
    const questName = 'Track the Gate';
    const prev = {
      quests: {
        completed: [],
        failed: [],
        active: [{
          name: questName,
          objectives: [
            { text: 'Find the gate location', completed: false },
            { text: 'Scout the perimeter', completed: false },
          ],
        }],
      },
    };
    const parsed = {
      questLog: {
        active: [{
          name: questName,
          objectives: [
            { text: 'Find the gate location', completed: true },  // newly done
            { text: 'Scout the perimeter', completed: false },    // still pending
          ],
        }],
        completed: [],
        failed: [],
      },
    };
    const result = computeExpectedXPGain(parsed, prev);
    expect(result.total).toBe(OBJECTIVE_XP);
    expect(result.breakdown.objectives).toBe(OBJECTIVE_XP);
  });

  test('does not re-award already-completed objectives', () => {
    const questName = 'Track the Gate';
    const prev = {
      quests: {
        completed: [],
        failed: [],
        active: [{
          name: questName,
          objectives: [
            { text: 'Find the gate location', completed: true }, // already done
          ],
        }],
      },
    };
    const parsed = {
      questLog: {
        active: [{
          name: questName,
          objectives: [{ text: 'Find the gate location', completed: true }],
        }],
        completed: [],
        failed: [],
      },
    };
    const result = computeExpectedXPGain(parsed, prev);
    expect(result.total).toBe(0);
  });

  // ── Combined sources ──────────────────────────────────────────────────────

  test('sums kills + quest completion + objectives', () => {
    const questName = 'Clear the Gate';
    const prev = {
      quests: {
        completed: [],
        failed: [],
        active: [{
          name: questName,
          objectives: [{ text: 'Kill boss', completed: false }],
        }],
      },
    };
    const parsed = {
      loot: { xpAwarded: 0, magicStones: { E: 1 } },
      questLog: {
        active: [{ name: questName, objectives: [{ text: 'Kill boss', completed: true }] }],
        completed: [{ name: questName }],
        failed: [],
      },
    };
    const expected = KILL_XP_TABLE.E + QUEST_COMPLETION_XP + OBJECTIVE_XP;
    const result = computeExpectedXPGain(parsed, prev);
    expect(result.total).toBe(expected);
    expect(result.breakdown.kills).toBe(KILL_XP_TABLE.E);
    expect(result.breakdown.quests).toBe(QUEST_COMPLETION_XP);
    expect(result.breakdown.objectives).toBe(OBJECTIVE_XP);
  });

  // ── Breakdown.sources populated ───────────────────────────────────────────

  test('breakdown.sources lists each contributing event', () => {
    const parsed = {
      loot: { xpAwarded: 0, magicStones: { B: 1 } },
      questLog: {
        completed: [{ name: 'Gate Raid' }],
        failed: [],
        active: [],
      },
    };
    const result = computeExpectedXPGain(parsed, emptyPrev);
    expect(result.breakdown.sources.length).toBeGreaterThanOrEqual(2);
    expect(result.breakdown.sources.some((s) => /B-rank/i.test(s))).toBe(true);
    expect(result.breakdown.sources.some((s) => /Gate Raid/i.test(s))).toBe(true);
  });
});

// ─── XP table sanity checks ───────────────────────────────────────────────────

describe('KILL_XP_TABLE', () => {
  test('all ranks defined', () => {
    ['E', 'D', 'C', 'B', 'A', 'S'].forEach((rank) => {
      expect(typeof KILL_XP_TABLE[rank]).toBe('number');
      expect(KILL_XP_TABLE[rank]).toBeGreaterThan(0);
    });
  });

  test('XP scales upward E → S', () => {
    expect(KILL_XP_TABLE.E).toBeLessThan(KILL_XP_TABLE.D);
    expect(KILL_XP_TABLE.D).toBeLessThan(KILL_XP_TABLE.C);
    expect(KILL_XP_TABLE.C).toBeLessThan(KILL_XP_TABLE.B);
    expect(KILL_XP_TABLE.B).toBeLessThan(KILL_XP_TABLE.A);
    expect(KILL_XP_TABLE.A).toBeLessThan(KILL_XP_TABLE.S);
  });
});
