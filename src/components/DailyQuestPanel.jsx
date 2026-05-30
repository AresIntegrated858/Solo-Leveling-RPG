// Daily Quest Panel — Right panel tab 6
// Shows System-issued daily training directives with Solo Leveling aesthetic

import React from 'react';

function TaskRow({ task, index }) {
  const { description, completed } = task;
  return (
    <div
      className="flex items-start gap-3 py-2 px-3 border-b border-system-border border-opacity-30"
      style={{ opacity: completed ? 0.5 : 1 }}
    >
      {/* Completion indicator */}
      <div
        className="flex-shrink-0 w-4 h-4 mt-[1px] border flex items-center justify-center"
        style={{
          borderColor: completed ? '#4abe8a' : '#4A90D9',
          background: completed ? 'rgba(74,190,138,0.1)' : 'transparent',
        }}
      >
        {completed && (
          <span style={{ color: '#4abe8a', fontSize: 9, lineHeight: 1 }}>✓</span>
        )}
      </div>

      {/* Task text */}
      <div className="flex-1">
        <div
          className="font-mono text-[11px] leading-snug"
          style={{
            color: completed ? '#4abe8a' : '#c8c8d4',
            textDecoration: completed ? 'line-through' : 'none',
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
}

export default function DailyQuestPanel({ dailyQuests }) {
  // No quests issued yet
  if (!dailyQuests || !dailyQuests.tasks?.length) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div
            className="font-mono text-[9px] tracking-widest"
            style={{ color: '#4A90D9', opacity: 0.6 }}
          >
            ▶ DAILY QUEST
          </div>
          <div className="font-mono text-xs text-system-text-dim">
            [ AWAITING DIRECTIVES ]
          </div>
          <div className="font-mono text-[10px] text-system-muted max-w-[180px] leading-relaxed">
            The System will issue training directives at the start of each day.
          </div>
        </div>
      </div>
    );
  }

  const { tasks, deadline, allComplete, penaltyActive, penaltyCleared, bonusXP } = dailyQuests;
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const pct = Math.round((completedCount / totalCount) * 100);
  const allDone = allComplete || completedCount === totalCount;

  // Determine status color scheme
  const scheme = penaltyActive
    ? { primary: '#E05252', bg: 'rgba(224,82,82,0.05)', border: '#E05252', label: '⚠ PENALTY ZONE ACTIVE' }
    : penaltyCleared
    ? { primary: '#9B7FD4', bg: 'rgba(155,127,212,0.05)', border: '#9B7FD4', label: '▶ PENALTY CLEARED' }
    : allDone
    ? { primary: '#4abe8a', bg: 'rgba(74,190,138,0.05)', border: '#4abe8a', label: '✓ ALL DIRECTIVES COMPLETE' }
    : { primary: '#4A90D9', bg: 'rgba(74,144,217,0.05)', border: '#4A90D9', label: '▶ DAILY QUEST' };

  return (
    <div className="h-full overflow-y-auto flex flex-col">

      {/* Header */}
      <div
        className="flex-shrink-0 px-3 py-3 border-b"
        style={{ borderColor: scheme.border + '44', background: scheme.bg }}
      >
        <div
          className="font-mono text-[9px] tracking-[0.2em] mb-2"
          style={{ color: scheme.primary }}
        >
          {scheme.label}
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="font-mono text-[9px] text-system-text-dim">COMPLETION</span>
            <span
              className="font-mono text-[9px]"
              style={{ color: allDone ? '#4abe8a' : scheme.primary }}
            >
              {completedCount}/{totalCount}
            </span>
          </div>
          <div className="stat-bar-track">
            <div
              className="stat-bar-fill"
              style={{
                width: `${pct}%`,
                background: allDone ? '#4abe8a' : penaltyActive ? '#E05252' : '#4A90D9',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        </div>

        {/* Bonus XP */}
        {bonusXP > 0 && (
          <div className="font-mono text-[9px] mt-2" style={{ color: '#C8A951' }}>
            BONUS XP EARNED: +{bonusXP}
          </div>
        )}
      </div>

      {/* Penalty Zone warning */}
      {penaltyActive && (
        <div
          className="flex-shrink-0 px-3 py-3 border-b"
          style={{ borderColor: '#E05252' + '33', background: 'rgba(224,82,82,0.08)' }}
        >
          <div className="font-mono text-[9px] text-system-red tracking-wider mb-1">
            ⚠ PENALTY ZONE
          </div>
          <div className="font-mono text-[10px] leading-relaxed" style={{ color: '#c8c8d4bb' }}>
            Directives were not completed. The System demands compliance. Clear the dungeon or face compounding consequences.
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="flex-1">
        {tasks.map((task, i) => (
          <TaskRow key={i} task={task} index={i} />
        ))}
      </div>

      {/* Deadline footer */}
      {deadline && !allDone && !penaltyActive && (
        <div
          className="flex-shrink-0 px-3 py-2 border-t border-system-border flex items-center gap-2"
          style={{ background: 'rgba(74,144,217,0.03)' }}
        >
          <span className="font-mono text-[9px] text-system-text-dim tracking-wider">DEADLINE</span>
          <span className="font-mono text-[10px]" style={{ color: '#4A90D9' }}>{deadline}</span>
        </div>
      )}

      {allDone && !penaltyActive && (
        <div
          className="flex-shrink-0 px-3 py-3 border-t text-center"
          style={{ borderColor: '#4abe8a33' }}
        >
          <div className="font-mono text-[9px] tracking-widest" style={{ color: '#4abe8a' }}>
            ✓ SYSTEM SATISFIED
          </div>
        </div>
      )}
    </div>
  );
}
