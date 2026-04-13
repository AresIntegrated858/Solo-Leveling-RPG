// Right Panel Tab 4 — World State (Reputation, Events, NPC Flags)

import React from 'react';

export default function WorldPanel({ playerState, worldEvents }) {
  const rep = playerState?.reputation || {};
  const events = worldEvents || [];

  const reputationLevel = (value) => {
    if (!value) return { label: '—', color: 'text-system-text-dim' };
    const v = value.toLowerCase();
    if (v.includes('hostile') || v.includes('enemy')) return { label: value, color: 'text-system-red' };
    if (v.includes('wary') || v.includes('suspicious')) return { label: value, color: 'text-yellow-500' };
    if (v.includes('neutral') || v.includes('unknown')) return { label: value, color: 'text-system-text-dim' };
    if (v.includes('friendly') || v.includes('positive')) return { label: value, color: 'text-system-green' };
    if (v.includes('allied') || v.includes('trusted')) return { label: value, color: 'text-system-blue' };
    if (v.includes('revered') || v.includes('legend')) return { label: value, color: 'text-system-gold' };
    return { label: value, color: 'text-system-text' };
  };

  return (
    <div className="h-full overflow-y-auto p-3 space-y-4">

      {/* Reputation */}
      <div>
        <div className="font-mono text-[9px] text-system-text-dim tracking-widest mb-2">REPUTATION</div>
        <div className="system-window p-3 space-y-2">
          {[
            { label: 'Hunter Association', value: rep.hunterAssociation },
            { label: 'Guilds', value: rep.guilds },
            { label: 'Civilian Public', value: rep.civilianPublic },
          ].map(({ label, value }) => {
            const { label: displayVal, color } = reputationLevel(value);
            return (
              <div key={label} className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-system-text-dim">{label}</span>
                <span className={`font-mono text-[10px] ${color} text-right max-w-[140px] truncate`}>
                  {displayVal}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* World Events */}
      <div>
        <div className="font-mono text-[9px] text-system-text-dim tracking-widest mb-2">WORLD EVENTS</div>
        {events.length > 0 ? (
          <div className="space-y-2">
            {events.map((evt, i) => (
              <div key={i} className="border border-system-border p-2 bg-system-bg">
                <div className="font-mono text-[10px] text-system-text leading-relaxed">
                  {typeof evt === 'string' ? evt : evt.description || '—'}
                </div>
                {typeof evt === 'object' && evt.timestamp && (
                  <div className="font-mono text-[9px] text-system-text-dim mt-1">
                    {new Date(evt.timestamp).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="font-mono text-[10px] text-system-muted py-2">
            No active world events recorded.
          </div>
        )}
      </div>

      {/* Location */}
      {playerState?.location && (
        <div>
          <div className="font-mono text-[9px] text-system-text-dim tracking-widest mb-2">CURRENT LOCATION</div>
          <div className="font-mono text-xs text-system-text">{playerState.location}</div>
          {playerState.currentTime && (
            <div className="font-mono text-[10px] text-system-text-dim mt-1">{playerState.currentTime}</div>
          )}
        </div>
      )}

    </div>
  );
}
