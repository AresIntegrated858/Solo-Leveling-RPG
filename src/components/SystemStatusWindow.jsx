// Left Panel — System Status Window + Live MiniMap

import React, { useState, useEffect } from 'react';
import MiniMap from './MiniMap';

function StatBar({ value, max, color = 'bg-system-blue', label }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const isLow = pct < 25;
  const isMed = pct < 50;
  let barColor = color;
  if (isLow) barColor = 'bg-system-red';
  else if (isMed && color === 'bg-system-blue') barColor = 'bg-yellow-600';

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="font-mono text-[10px] text-system-text-dim tracking-wider">{label}</span>
        <span className={`font-mono text-[10px] ${isLow ? 'text-system-red' : 'text-system-text-dim'}`}>
          {value} <span className="text-system-muted">/ {max}</span>
        </span>
      </div>
      <div className="stat-bar-track">
        <div
          className={`stat-bar-fill ${barColor} ${isLow ? 'animate-pulse' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatRow({ label, value, highlight }) {
  return (
    <div className="flex justify-between items-center py-[2px]">
      <span className="font-mono text-[10px] text-system-text-dim">{label}</span>
      <span className={`font-mono text-xs ${highlight ? 'text-system-gold' : 'text-system-text'}`}>
        {value ?? '—'}
      </span>
    </div>
  );
}

function Badge({ text, variant = 'blue' }) {
  const colors = {
    blue: 'border-system-blue text-system-blue bg-system-blue bg-opacity-10',
    gold: 'border-system-gold text-system-gold bg-system-gold bg-opacity-10',
    red: 'border-system-red text-system-red bg-system-red bg-opacity-10',
    green: 'border-system-green text-system-green bg-system-green bg-opacity-10',
    muted: 'border-system-border text-system-text-dim',
  };
  return (
    <span className={`font-mono text-[9px] px-2 py-[2px] border ${colors[variant]} tracking-wider`}>
      {text}
    </span>
  );
}

export default function SystemStatusWindow({ playerState, sessionMeta, sessionStartTime }) {
  const p = playerState;
  const [currentCoords, setCurrentCoords] = useState(p.currentCoords || null);

  // Sync currentCoords when playerState.currentCoords is externally updated
  useEffect(() => {
    if (p.currentCoords) setCurrentCoords(p.currentCoords);
  }, [p.currentCoords]);

  // Session timer
  const [elapsed, setElapsed] = useState('00:00');
  useEffect(() => {
    if (!sessionStartTime) return;
    const update = () => {
      const ms = Date.now() - sessionStartTime;
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setElapsed(h > 0
        ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    };
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, [sessionStartTime]);

  const handleCoordsUpdate = (coords) => {
    setCurrentCoords(coords);
    // Push update back to playerState
    if (p) p.currentCoords = coords;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="system-header flex items-center justify-between flex-shrink-0">
        <span>SYSTEM STATUS</span>
        <span className="text-system-text-dim text-[9px]">WINDOW</span>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── MINIMAP ──────────────────────────────────────────────────────── */}
        <div className="border-b border-system-border">
          <div className="font-mono text-[9px] text-system-text-dim tracking-widest px-3 pt-2 pb-1">
            CURRENT LOCATION
          </div>
          <MiniMap
            location={p.location}
            hometownCoords={p.hometownCoords}
            currentCoords={currentCoords}
            onCoordsUpdate={handleCoordsUpdate}
          />
        </div>

        <div className="p-3 space-y-4">

          {/* Identity */}
          <div className="space-y-1">
            <div className="font-mono text-base text-system-text font-medium">
              {p.name || '—'}
            </div>
            <div className="flex items-center gap-2">
              <Badge
                text={`${p.rank || 'E'} RANK`}
                variant={p.rank === 'S' ? 'gold' : p.rank === 'A' ? 'blue' : 'muted'}
              />
              <span className="font-mono text-xs text-system-text-dim">
                Lv. <span className="text-system-blue">{p.level || 1}</span>
              </span>
            </div>
          </div>

          {/* Vital bars */}
          <div className="space-y-2 border-t border-system-border pt-3">
            <StatBar label="HP" value={p.hp?.current ?? 100} max={p.hp?.max ?? 100} color="bg-system-red" />
            <StatBar label="MP" value={p.mp?.current ?? 50} max={p.mp?.max ?? 50} color="bg-system-blue" />
            <StatBar label="STAMINA" value={p.stamina?.current ?? 100} max={p.stamina?.max ?? 100} color="bg-system-green" />

            {/* XP Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-system-gold tracking-wider">EXP</span>
                <span className="font-mono text-[10px] text-system-gold">
                  {p.xp?.current ?? 0}
                  <span className="text-system-muted"> / {p.xp?.toNext ?? 100}</span>
                </span>
              </div>
              <div className="stat-bar-track">
                <div
                  className="stat-bar-fill bg-system-gold"
                  style={{
                    width: `${Math.min(100, Math.max(0, ((p.xp?.current ?? 0) / (p.xp?.toNext ?? 100)) * 100))}%`,
                    transition: 'width 0.6s ease',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Core stats */}
          <div className="border-t border-system-border pt-3 space-y-[2px]">
            <div className="font-mono text-[9px] text-system-text-dim tracking-widest mb-2">CORE STATS</div>
            <div className="grid grid-cols-2 gap-x-4">
              <StatRow label="STR" value={p.stats?.STR} />
              <StatRow label="AGI" value={p.stats?.AGI} />
              <StatRow label="END" value={p.stats?.END} />
              <StatRow label="INT" value={p.stats?.INT} />
              <StatRow label="PER" value={p.stats?.PER} />
              <StatRow label="LUCK" value={p.stats?.LUCK} highlight />
            </div>
          </div>

          {/* Status Effects */}
          {p.statusEffects && p.statusEffects.length > 0 && (
            <div className="border-t border-system-border pt-3">
              <div className="font-mono text-[9px] text-system-text-dim tracking-widest mb-2">STATUS EFFECTS</div>
              <div className="flex flex-wrap gap-1">
                {p.statusEffects.map((eff, i) => <Badge key={i} text={eff} variant="red" />)}
              </div>
            </div>
          )}

          {/* Active Titles */}
          {p.titles && p.titles.length > 0 && (
            <div className="border-t border-system-border pt-3">
              <div className="font-mono text-[9px] text-system-text-dim tracking-widest mb-2">TITLES</div>
              <div className="space-y-1">
                {p.titles.slice(0, 3).map((title, i) => (
                  <div key={i} className="font-mono text-[10px] text-system-gold">「{title}」</div>
                ))}
                {p.titles.length > 3 && (
                  <div className="font-mono text-[9px] text-system-text-dim">+{p.titles.length - 3} more</div>
                )}
              </div>
            </div>
          )}

          {/* Traits */}
          {p.traits && p.traits.length > 0 && (
            <div className="border-t border-system-border pt-3">
              <div className="font-mono text-[9px] text-system-text-dim tracking-widest mb-2">TRAITS</div>
              <div className="space-y-1">
                {p.traits.map((trait, i) => (
                  <div key={i} className="font-mono text-[10px] text-system-text-dim">· {trait}</div>
                ))}
              </div>
            </div>
          )}

          {/* Reputation */}
          <div className="border-t border-system-border pt-3 space-y-1">
            <div className="font-mono text-[9px] text-system-text-dim tracking-widest mb-2">REPUTATION</div>
            <div className="font-mono text-[10px] space-y-1">
              <div className="flex justify-between">
                <span className="text-system-text-dim">Association</span>
                <span className="text-system-text text-right max-w-[100px] truncate">{p.reputation?.hunterAssociation || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-system-text-dim">Guilds</span>
                <span className="text-system-text text-right max-w-[100px] truncate">{p.reputation?.guilds || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-system-text-dim">Public</span>
                <span className="text-system-text text-right max-w-[100px] truncate">{p.reputation?.civilianPublic || '—'}</span>
              </div>
            </div>
          </div>

          {/* Session info */}
          <div className="border-t border-system-border pt-3 space-y-1">
            <div className="font-mono text-[10px] flex justify-between">
              <span className="text-system-text-dim">Session</span>
              <span className="text-system-text">{sessionMeta?.sessionNumber || 1}</span>
            </div>
            <div className="font-mono text-[10px] flex justify-between">
              <span className="text-system-text-dim">Elapsed</span>
              <span className="text-system-blue">{elapsed}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
