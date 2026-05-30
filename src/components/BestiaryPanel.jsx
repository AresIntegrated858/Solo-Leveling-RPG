import React, { useState } from 'react';

const RANK_COLORS = {
  S: { border: '#ff4444', text: '#ff6666', bg: 'rgba(255,68,68,0.08)' },
  A: { border: '#ff8c00', text: '#ffaa44', bg: 'rgba(255,140,0,0.08)' },
  B: { border: '#9b59b6', text: '#c47cec', bg: 'rgba(155,89,182,0.08)' },
  C: { border: '#3498db', text: '#5dade2', bg: 'rgba(52,152,219,0.08)' },
  D: { border: '#27ae60', text: '#52be80', bg: 'rgba(39,174,96,0.08)' },
  E: { border: '#7f8c8d', text: '#95a5a6', bg: 'rgba(127,140,141,0.08)' },
};

function getRankColors(rank) {
  return RANK_COLORS[rank] || RANK_COLORS.E;
}

function MonsterCard({ monster }) {
  const [expanded, setExpanded] = useState(false);
  const colors = getRankColors(monster.rank);

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderLeft: `3px solid ${colors.border}`,
        background: colors.bg,
        marginBottom: '6px',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          width: '100%',
          padding: '8px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              padding: '1px 5px',
              borderRadius: '3px',
              letterSpacing: '0.05em',
            }}
          >
            {monster.rank || 'E'}
          </span>
          <span style={{ color: '#c8d0d8', fontSize: '13px', fontWeight: 600 }}>
            {monster.name}
          </span>
          {monster.killCount > 0 && (
            <span style={{ color: '#666e78', fontSize: '11px' }}>
              ×{monster.killCount} killed
            </span>
          )}
        </div>
        <span style={{ color: '#4a5260', fontSize: '11px' }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={{ padding: '4px 10px 10px', borderTop: `1px solid ${colors.border}22` }}>
          {monster.origin && (
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: '#4a5260', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Origin</span>
              <p style={{ color: '#8a9ab0', fontSize: '12px', margin: '2px 0 0' }}>{monster.origin}</p>
            </div>
          )}
          {monster.biology && (
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: '#4a5260', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Biology</span>
              <p style={{ color: '#8a9ab0', fontSize: '12px', margin: '2px 0 0' }}>{monster.biology}</p>
            </div>
          )}
          {monster.behavior && (
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: '#4a5260', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Combat Behavior</span>
              <p style={{ color: '#8a9ab0', fontSize: '12px', margin: '2px 0 0' }}>{monster.behavior}</p>
            </div>
          )}
          {monster.weaknesses && (
            <div style={{ marginBottom: '4px' }}>
              <span style={{ color: '#4a5260', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Weaknesses</span>
              <p style={{ color: '#e8a878', fontSize: '12px', margin: '2px 0 0' }}>{monster.weaknesses}</p>
            </div>
          )}
          {monster.firstSeen && (
            <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: `1px solid ${colors.border}22` }}>
              <span style={{ color: '#3a4250', fontSize: '11px' }}>
                First encountered: {new Date(monster.firstSeen).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BestiaryPanel({ bestiary = {}, gateRecords = [] }) {
  const [filter, setFilter] = useState('ALL');
  const RANKS = ['ALL', 'S', 'A', 'B', 'C', 'D', 'E'];

  const monsters = Object.values(bestiary);
  const filtered = filter === 'ALL' ? monsters : monsters.filter((m) => m.rank === filter);

  // Sort by rank (S first) then name
  const rankOrder = { S: 0, A: 1, B: 2, C: 3, D: 4, E: 5 };
  const sorted = [...filtered].sort((a, b) => {
    const ra = rankOrder[a.rank] ?? 6;
    const rb = rankOrder[b.rank] ?? 6;
    if (ra !== rb) return ra - rb;
    return (a.name || '').localeCompare(b.name || '');
  });

  const firstClears = gateRecords.filter((r) => r.isFirstClear);

  const totalKills = monsters.reduce((sum, m) => sum + (m.killCount || 0), 0);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid #1e2530' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ color: '#c8d0d8', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em' }}>
            BESTIARY
          </span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span style={{ color: '#4a5260', fontSize: '11px' }}>
              <span style={{ color: '#8a9ab0' }}>{monsters.length}</span> types
            </span>
            <span style={{ color: '#4a5260', fontSize: '11px' }}>
              <span style={{ color: '#8a9ab0' }}>{totalKills}</span> kills
            </span>
          </div>
        </div>

        {/* Rank filter */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {RANKS.map((r) => {
            const colors = r === 'ALL' ? { border: '#3a4250', text: '#8a9ab0' } : getRankColors(r);
            const active = filter === r;
            return (
              <button
                key={r}
                onClick={() => setFilter(r)}
                style={{
                  fontSize: '10px',
                  padding: '2px 7px',
                  border: `1px solid ${active ? colors.border : '#2a3040'}`,
                  background: active ? `${colors.border}22` : 'transparent',
                  color: active ? colors.text : '#4a5260',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontWeight: active ? 700 : 400,
                }}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      {/* Monster list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {sorted.length === 0 ? (
          <div style={{ color: '#3a4250', fontSize: '12px', textAlign: 'center', marginTop: '24px' }}>
            {monsters.length === 0 ? 'No monsters catalogued yet.' : 'No monsters in this rank.'}
          </div>
        ) : (
          sorted.map((m) => <MonsterCard key={m.name} monster={m} />)
        )}

        {/* Gate Records — First Clears */}
        {firstClears.length > 0 && (
          <>
            <div style={{
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid #1e2530',
              marginBottom: '8px',
            }}>
              <span style={{ color: '#c8a84a', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em' }}>
                GATE RECORDS — FIRST CLEARS
              </span>
            </div>
            {firstClears.slice().reverse().map((r, idx) => {
              const colors = getRankColors(r.rank);
              return (
                <div
                  key={idx}
                  style={{
                    border: `1px solid ${colors.border}55`,
                    borderLeft: `3px solid ${colors.border}`,
                    background: colors.bg,
                    borderRadius: '4px',
                    padding: '7px 10px',
                    marginBottom: '5px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: colors.text, border: `1px solid ${colors.border}`, padding: '1px 5px', borderRadius: '3px' }}>
                        {r.rank || 'E'}
                      </span>
                      <span style={{ color: '#c8a84a', fontSize: '12px', fontWeight: 600 }}>{r.name}</span>
                    </div>
                    <span style={{ color: '#c8a84a', fontSize: '10px', opacity: 0.7 }}>★ FIRST CLEAR</span>
                  </div>
                  {r.location && (
                    <div style={{ color: '#6a7a8a', fontSize: '11px', marginTop: '3px' }}>{r.location}</div>
                  )}
                  {r.bonus && (
                    <div style={{ color: '#8a9ab0', fontSize: '11px', marginTop: '2px' }}>Bonus: {r.bonus}</div>
                  )}
                  {r.registryNote && (
                    <div style={{ color: '#5a6a7a', fontSize: '11px', marginTop: '2px', fontStyle: 'italic' }}>{r.registryNote}</div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
