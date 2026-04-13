// Right Panel Tab 3 — Quests

import React from 'react';

function QuestCard({ quest, status }) {
  const colors = {
    active: { border: 'border-system-blue', label: 'text-system-blue', badge: 'ACTIVE' },
    completed: { border: 'border-system-green', label: 'text-system-green', badge: 'COMPLETE' },
    failed: { border: 'border-system-red', label: 'text-system-red', badge: 'FAILED' },
  };
  const c = colors[status] || colors.active;
  const name = typeof quest === 'string' ? quest : quest.name;
  const desc = typeof quest === 'object' ? quest.description : null;
  const objectives = typeof quest === 'object' ? quest.objectives : null;

  return (
    <div className={`border ${c.border} border-opacity-40 p-3 bg-system-bg space-y-1`}>
      <div className="flex justify-between items-start">
        <div className="font-mono text-xs text-system-text">{name}</div>
        <span className={`font-mono text-[9px] ${c.label}`}>{c.badge}</span>
      </div>
      {desc && <div className="font-mono text-[10px] text-system-text-dim">{desc}</div>}
      {objectives && objectives.length > 0 && (
        <div className="space-y-1 mt-2">
          {objectives.map((obj, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`font-mono text-[9px] mt-[2px] ${obj.completed ? 'text-system-green' : 'text-system-text-dim'}`}>
                {obj.completed ? '✓' : '○'}
              </span>
              <span className={`font-mono text-[10px] ${obj.completed ? 'text-system-text-dim line-through' : 'text-system-text'}`}>
                {typeof obj === 'string' ? obj : obj.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function QuestsPanel({ quests }) {
  const q = quests || {};
  const active = q.active || [];
  const completed = q.completed || [];
  const failed = q.failed || [];

  const hasAny = active.length || completed.length || failed.length;

  if (!hasAny) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="font-mono text-xs text-system-text-dim">[ NO ACTIVE OBJECTIVES ]</div>
          <div className="font-mono text-[10px] text-system-muted">
            Quest objectives will appear here as they are issued.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-4">
      {active.length > 0 && (
        <div>
          <div className="font-mono text-[9px] text-system-blue tracking-widest mb-2">ACTIVE</div>
          <div className="space-y-2">
            {active.map((q, i) => <QuestCard key={i} quest={q} status="active" />)}
          </div>
        </div>
      )}
      {completed.length > 0 && (
        <div>
          <div className="font-mono text-[9px] text-system-green tracking-widest mb-2">COMPLETED</div>
          <div className="space-y-2">
            {completed.map((q, i) => <QuestCard key={i} quest={q} status="completed" />)}
          </div>
        </div>
      )}
      {failed.length > 0 && (
        <div>
          <div className="font-mono text-[9px] text-system-red tracking-widest mb-2">FAILED</div>
          <div className="space-y-2">
            {failed.map((q, i) => <QuestCard key={i} quest={q} status="failed" />)}
          </div>
        </div>
      )}
    </div>
  );
}
