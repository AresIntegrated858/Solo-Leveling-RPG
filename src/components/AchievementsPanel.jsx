// Achievements Panel — Phase 6
// Running record of notable firsts, milestone events, System acknowledgments.

import React, { useState } from 'react';

const CATEGORY_STYLES = {
  system:      { color: '#5dade2', border: '#1a3a5a', bg: 'rgba(52,152,219,0.06)', label: 'SYSTEM' },
  combat:      { color: '#e74c3c', border: '#4a1a1a', bg: 'rgba(231,76,60,0.06)',  label: 'COMBAT' },
  social:      { color: '#52be80', border: '#1a3a28', bg: 'rgba(82,190,128,0.06)', label: 'SOCIAL' },
  exploration: { color: '#d4a017', border: '#4a3a10', bg: 'rgba(212,160,23,0.06)', label: 'EXPLORE' },
  unique:      { color: '#c47cec', border: '#3a1a5a', bg: 'rgba(196,124,236,0.06)',label: 'UNIQUE' },
};

function getStyle(category) {
  return CATEGORY_STYLES[(category || 'unique').toLowerCase()] || CATEGORY_STYLES.unique;
}

function AchievementCard({ achievement }) {
  const [expanded, setExpanded] = useState(false);
  const s = getStyle(achievement.category);

  return (
    <div
      style={{
        border: `1px solid ${s.border}`,
        borderLeft: `3px solid ${s.color}`,
        background: s.bg,
        borderRadius: '4px',
        marginBottom: '6px',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          width: '100%', padding: '8px 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: '9px', fontWeight: 700, color: s.color,
            border: `1px solid ${s.border}`, padding: '1px 5px', borderRadius: '3px',
            letterSpacing: '0.06em', flexShrink: 0,
          }}>
            {s.label}
          </span>
          <span style={{
            color: '#c8d0d8', fontSize: '12px', fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {achievement.title}
          </span>
        </div>
        <span style={{ color: '#3a4250', fontSize: '10px', marginLeft: '8px', flexShrink: 0 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && achievement.description && (
        <div style={{ padding: '4px 10px 10px', borderTop: `1px solid ${s.border}33` }}>
          <p style={{ color: '#8a9ab0', fontSize: '11px', lineHeight: 1.6, margin: 0 }}>
            {achievement.description}
          </p>
          {achievement.timestamp && (
            <div style={{ color: '#3a4250', fontSize: '10px', marginTop: '6px' }}>
              {new Date(achievement.timestamp).toLocaleDateString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AchievementsPanel({ achievements = [], playerState }) {
  const [filter, setFilter] = useState('ALL');
  const FILTERS = ['ALL', 'SYSTEM', 'COMBAT', 'SOCIAL', 'EXPLORE', 'UNIQUE'];

  const filtered = filter === 'ALL'
    ? achievements
    : achievements.filter((a) => {
        const s = getStyle(a.category);
        return s.label === filter;
      });

  // Reverse: newest first
  const sorted = [...filtered].reverse();

  const systemTier = playerState?.systemTier || 1;
  const statMilestones = playerState?.statMilestones || [];
  const titlePassives = Object.entries(playerState?.titlePassives || {});

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid #1e2530' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ color: '#c8d0d8', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em' }}>
            ACHIEVEMENTS
          </span>
          <span style={{ color: '#4a5260', fontSize: '11px' }}>
            <span style={{ color: '#8a9ab0' }}>{achievements.length}</span> total
          </span>
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
          {FILTERS.map((f) => {
            const s = f === 'ALL' ? { color: '#8a9ab0', border: '#3a4250' } : getStyle(f.toLowerCase() === 'explore' ? 'exploration' : f.toLowerCase());
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  fontSize: '9px', padding: '2px 6px',
                  border: `1px solid ${active ? s.color : '#2a3040'}`,
                  background: active ? `${s.color}22` : 'transparent',
                  color: active ? s.color : '#4a5260',
                  borderRadius: '3px', cursor: 'pointer',
                  fontWeight: active ? 700 : 400,
                }}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {/* Achievement list */}
        {sorted.length === 0 ? (
          <div style={{ color: '#3a4250', fontSize: '12px', textAlign: 'center', marginTop: '24px' }}>
            {achievements.length === 0 ? 'No achievements yet.' : 'None in this category.'}
          </div>
        ) : (
          sorted.map((a, i) => <AchievementCard key={i} achievement={a} />)
        )}

        {/* System Tier indicator */}
        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1e2530' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#4a5260', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>
            SYSTEM STATUS
          </div>
          <div style={{
            border: '1px solid #1a3a5a', borderLeft: '3px solid #5dade2',
            background: 'rgba(52,152,219,0.05)', borderRadius: '4px', padding: '7px 10px',
            marginBottom: '8px',
          }}>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#5dade2' }}>
              System Tier {systemTier}
              {systemTier === 5 && <span style={{ color: '#ff4444', marginLeft: '8px' }}>[APEX]</span>}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#4a5260', marginTop: '2px' }}>
              {systemTier === 1 && 'Basic leveling, combat, skills, daily quests'}
              {systemTier === 2 && 'Shadow Protocol unlocked'}
              {systemTier === 3 && 'Gate classification + first-clear registry'}
              {systemTier === 4 && 'Hunter Registry + rival tracking'}
              {systemTier === 5 && '[ REDACTED ]'}
            </div>
          </div>

          {/* Stat Milestones */}
          {statMilestones.length > 0 && (
            <>
              <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#4a5260', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '5px' }}>
                STAT MILESTONES
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                {statMilestones.map((m, i) => (
                  <div key={i} style={{
                    fontFamily: 'monospace', fontSize: '10px',
                    border: '1px solid #2a3a4a', background: 'rgba(10,14,22,0.6)',
                    padding: '2px 7px', borderRadius: '3px',
                    color: '#8a9ab0',
                  }}>
                    {m.stat} {m.value}
                    {m.title && <span style={{ color: '#c8a951', marginLeft: '4px' }}>"{m.title}"</span>}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Title Passives */}
          {titlePassives.length > 0 && (
            <>
              <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#4a5260', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '5px' }}>
                TITLE PASSIVES
              </div>
              {titlePassives.map(([title, passive], i) => (
                <div key={i} style={{
                  border: '1px solid #2a3a28', borderLeft: '3px solid #52be80',
                  background: 'rgba(82,190,128,0.04)', borderRadius: '4px',
                  padding: '5px 8px', marginBottom: '4px',
                }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#52be80' }}>{title}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#5a7a5a', marginTop: '2px' }}>{passive}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
