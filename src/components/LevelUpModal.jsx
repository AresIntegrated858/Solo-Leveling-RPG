// Level Up Modal — stat point allocation overlay
// Replaces Growth Paths. Player distributes points freely across all stats.

import React, { useState } from 'react';

const STAT_KEYS = ['STR', 'AGI', 'END', 'INT', 'PER', 'LUCK'];

const STAT_LABELS = {
  STR:  'Strength',
  AGI:  'Agility',
  END:  'Endurance',
  INT:  'Intelligence',
  PER:  'Perception',
  LUCK: 'Luck',
};

const STAT_COLORS = {
  STR:  'text-system-red',
  AGI:  'text-system-blue',
  END:  'text-system-green',
  INT:  'text-purple-400',
  PER:  'text-yellow-400',
  LUCK: 'text-system-gold',
};

export default function LevelUpModal({ levelUpData, currentStats, onAllocate }) {
  const [allocation, setAllocation] = useState(
    Object.fromEntries(STAT_KEYS.map((k) => [k, 0])),
  );
  const [confirming, setConfirming] = useState(false);

  if (!levelUpData) return null;

  const totalPoints = levelUpData.statPoints ?? 5;
  const used = Object.values(allocation).reduce((a, b) => a + b, 0);
  const remaining = totalPoints - used;

  const adjust = (stat, delta) => {
    if (confirming) return;
    setAllocation((prev) => {
      const next = { ...prev, [stat]: prev[stat] + delta };
      if (next[stat] < 0) return prev;
      const newUsed = Object.values(next).reduce((a, b) => a + b, 0);
      if (newUsed > totalPoints) return prev;
      return next;
    });
  };

  const handleConfirm = () => {
    if (confirming) return;
    setConfirming(true);
    setTimeout(() => onAllocate(allocation), 700);
  };

  const stats = currentStats || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      {/* Decorative borders */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-4 border border-system-gold border-opacity-20" />
        <div className="absolute inset-8 border border-system-gold border-opacity-10" />
      </div>

      <div className="w-full max-w-md mx-4 space-y-5">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="text-center space-y-2">
          <div className="font-mono text-[10px] text-system-gold tracking-[0.3em] opacity-50">
            ══════════════════════════════
          </div>
          <div className="font-mono text-2xl gold-shimmer tracking-widest">
            LEVEL UP DETECTED
          </div>
          {levelUpData.fromLevel && levelUpData.toLevel && (
            <div className="font-mono text-sm text-system-text-dim">
              Level{' '}
              <span className="text-system-text">{levelUpData.fromLevel}</span>
              {' '}→{' '}
              <span className="text-system-gold text-base font-bold">{levelUpData.toLevel}</span>
            </div>
          )}

          {/* Vital increases */}
          {(levelUpData.hpIncrease || levelUpData.mpIncrease || levelUpData.staminaIncrease) && (
            <div className="flex justify-center gap-4 pt-1">
              {levelUpData.hpIncrease && (
                <span className="font-mono text-[10px] text-system-red">HP Max +{levelUpData.hpIncrease}</span>
              )}
              {levelUpData.mpIncrease && (
                <span className="font-mono text-[10px] text-system-blue">MP Max +{levelUpData.mpIncrease}</span>
              )}
              {levelUpData.staminaIncrease && (
                <span className="font-mono text-[10px] text-system-green">Stamina Max +{levelUpData.staminaIncrease}</span>
              )}
            </div>
          )}

          <div className="font-mono text-[10px] text-system-gold tracking-[0.3em] opacity-50">
            ══════════════════════════════
          </div>
        </div>

        {/* ── Points counter ─────────────────────────────────────── */}
        <div className="text-center space-y-1">
          <div className="font-mono text-[9px] text-system-text-dim tracking-widest">
            STAT POINTS TO ALLOCATE
          </div>
          <div className={`font-mono text-4xl tracking-widest transition-colors duration-300 ${
            remaining === 0 ? 'text-system-green' : 'text-system-gold'
          }`}>
            {remaining}
          </div>
          <div className="font-mono text-[9px] text-system-muted">
            {remaining === 0 ? 'all points allocated' : `of ${totalPoints} remaining`}
          </div>
        </div>

        {/* ── Stat allocation grid ───────────────────────────────── */}
        <div className="border border-system-border bg-system-panel p-4 space-y-3">
          <div className="grid grid-cols-3 gap-x-2 font-mono text-[9px] text-system-text-dim tracking-wider border-b border-system-border pb-2 mb-1">
            <span>STAT</span>
            <span className="text-center">CURRENT</span>
            <span className="text-right">AFTER</span>
          </div>

          {STAT_KEYS.map((stat) => {
            const base = stats[stat] ?? 10;
            const added = allocation[stat];
            const after = base + added;

            return (
              <div key={stat} className="flex items-center gap-2">
                {/* Stat label */}
                <div className="w-14">
                  <div className={`font-mono text-[10px] font-medium ${STAT_COLORS[stat]}`}>{stat}</div>
                  <div className="font-mono text-[8px] text-system-muted">{STAT_LABELS[stat]}</div>
                </div>

                {/* Current value */}
                <span className="font-mono text-sm text-system-text-dim w-6 text-center">{base}</span>

                {/* Controls */}
                <button
                  onClick={() => adjust(stat, -1)}
                  disabled={added === 0 || confirming}
                  className="font-mono text-xs w-6 h-6 border border-system-border text-system-text-dim
                             hover:border-system-red hover:text-system-red
                             disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >
                  −
                </button>

                <div className="flex-1 flex justify-center">
                  {added > 0 ? (
                    <span className="font-mono text-[10px] text-system-green">+{added}</span>
                  ) : (
                    <span className="font-mono text-[10px] text-system-muted">+0</span>
                  )}
                </div>

                <button
                  onClick={() => adjust(stat, 1)}
                  disabled={remaining === 0 || confirming}
                  className="font-mono text-xs w-6 h-6 border border-system-border text-system-text-dim
                             hover:border-system-green hover:text-system-green
                             disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >
                  +
                </button>

                {/* After value */}
                <span className={`font-mono text-sm w-8 text-right ${
                  added > 0 ? STAT_COLORS[stat] : 'text-system-text'
                }`}>
                  {after}
                </span>
              </div>
            );
          })}
        </div>

        {/* System note */}
        {levelUpData.systemNote && (
          <div className="font-mono text-[10px] text-system-text-dim text-center italic border-l-2 border-system-gold border-opacity-30 pl-3">
            {levelUpData.systemNote}
          </div>
        )}

        {/* ── Confirm button ─────────────────────────────────────── */}
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="w-full btn-gold py-3 text-sm disabled:opacity-40 transition-opacity"
        >
          {confirming
            ? '[ APPLYING ALLOCATION... ]'
            : used === totalPoints
              ? `[ CONFIRM — ${used}/${totalPoints} POINTS ALLOCATED ]`
              : used > 0
                ? `[ CONFIRM — ${used}/${totalPoints} POINTS USED, ${remaining} REMAINING ]`
                : '[ CONFIRM ALLOCATION ]'
          }
        </button>

        {remaining > 0 && !confirming && (
          <div className="font-mono text-[9px] text-system-text-dim text-center">
            Unspent points are lost on confirmation.
          </div>
        )}

      </div>
    </div>
  );
}
