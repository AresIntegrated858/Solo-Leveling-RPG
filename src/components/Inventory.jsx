// Right Panel Tab 2 — Inventory with Solo Leveling style economy

import React, { useState } from 'react';

const STONE_COLORS = {
  E: { text: '#6a8aaa', border: '#2a3a5a' },
  D: { text: '#6a9a6a', border: '#2a4a2a' },
  C: { text: '#9a7ab0', border: '#3a2a5a' },
  B: { text: '#b0a050', border: '#4a4a1a' },
  A: { text: '#d0a060', border: '#5a3a1a' },
  S: { text: '#C8A951', border: '#6a5a1a' },
};

const RARITY_COLORS = {
  Common:    { text: '#7a8a98', border: '#2a3040' },
  Uncommon:  { text: '#52be80', border: '#1a3a28' },
  Rare:      { text: '#5dade2', border: '#1a2a4a' },
  Epic:      { text: '#c47cec', border: '#3a1a5a' },
  Legendary: { text: '#C8A951', border: '#4a3a18' },
};

function formatCash(amount) {
  if (!amount) return '0';
  if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
  if (amount >= 1000000)    return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000)       return `${(amount / 1000).toFixed(0)}K`;
  return amount.toLocaleString();
}

function ItemCard({ item }) {
  const [expanded, setExpanded] = useState(false);

  const name    = typeof item === 'string' ? item : (item.name || '—');
  const desc    = typeof item === 'object' ? item.description : null;
  const rarity  = typeof item === 'object' ? item.rarity : null;

  // Phase 5 fields
  const isUnique = typeof item === 'object' && item.isUnique;
  const lore     = typeof item === 'object' ? item.lore : null;
  const passive  = typeof item === 'object' ? item.passive : null;
  const hook     = typeof item === 'object' ? item.hook : null;
  const setName  = typeof item === 'object' ? item.set : null;

  const rc = RARITY_COLORS[rarity] || { text: '#c8d0d8', border: '#2a3040' };
  const hasExtra = lore || passive || hook || setName;

  return (
    <div
      style={{
        border: `1px solid ${isUnique ? '#c8a951' : rc.border}`,
        borderLeft: `3px solid ${isUnique ? '#c8a951' : rc.border}`,
        background: isUnique ? 'rgba(200,169,81,0.05)' : 'rgba(10,14,22,0.6)',
        borderRadius: '4px',
        marginBottom: '5px',
        overflow: 'hidden',
      }}
    >
      {/* Main row */}
      <div
        style={{
          padding: '7px 10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          cursor: hasExtra ? 'pointer' : 'default',
        }}
        onClick={() => hasExtra && setExpanded((e) => !e)}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ color: isUnique ? '#c8a951' : rc.text, fontSize: '12px', fontWeight: isUnique ? 700 : 500 }}>
              {name}
            </span>
            {isUnique && (
              <span style={{
                fontSize: '9px', fontWeight: 700, color: '#c8a951',
                border: '1px solid #c8a951', padding: '1px 4px', borderRadius: '3px',
                letterSpacing: '0.08em',
              }}>
                UNIQUE
              </span>
            )}
            {setName && (
              <span style={{
                fontSize: '9px', color: '#9b59b6',
                border: '1px solid #3a1a5a', padding: '1px 4px', borderRadius: '3px',
                letterSpacing: '0.05em',
              }}>
                {setName}
              </span>
            )}
            {hook && (
              <span style={{ fontSize: '11px', color: '#e67e22' }} title="Story hook attached">⚡</span>
            )}
          </div>
          {desc && (
            <div style={{ color: '#6a7a88', fontSize: '11px', marginTop: '2px' }}>{desc}</div>
          )}
          {passive && !expanded && (
            <div style={{ color: '#5dade2', fontSize: '10px', marginTop: '2px', fontStyle: 'italic' }}>
              ◈ {passive}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', marginLeft: '8px', flexShrink: 0 }}>
          {rarity && (
            <span style={{ fontSize: '9px', color: rc.text, opacity: 0.8 }}>{rarity}</span>
          )}
          {hasExtra && (
            <span style={{ fontSize: '10px', color: '#3a4250' }}>{expanded ? '▲' : '▼'}</span>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && hasExtra && (
        <div style={{ padding: '4px 10px 10px', borderTop: '1px solid #1e2530' }}>
          {passive && (
            <div style={{ marginBottom: '6px' }}>
              <span style={{ fontSize: '10px', color: '#4a5260', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Passive</span>
              <div style={{ color: '#5dade2', fontSize: '11px', marginTop: '2px' }}>{passive}</div>
            </div>
          )}
          {lore && (
            <div style={{ marginBottom: '6px' }}>
              <span style={{ fontSize: '10px', color: '#4a5260', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Lore</span>
              <div style={{ color: '#8a7a60', fontSize: '11px', marginTop: '2px', fontStyle: 'italic', lineHeight: 1.5 }}>{lore}</div>
            </div>
          )}
          {hook && (
            <div style={{ marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', color: '#4a5260', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Story Hook</span>
              <div style={{ color: '#e67e22', fontSize: '11px', marginTop: '2px' }}>⚡ {hook}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, items, emptyText }) {
  return (
    <div>
      <div style={{
        fontFamily: 'monospace', fontSize: '9px', color: '#4a5260',
        letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px',
      }}>
        {title}
      </div>
      {items && items.length > 0
        ? items.map((item, i) => <ItemCard key={i} item={item} />)
        : <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#2a3040', padding: '2px 0' }}>{emptyText}</div>
      }
    </div>
  );
}

export default function Inventory({ inventory, playerState }) {
  const inv = inventory || {};
  const cur = inv.currency || {};
  const stones = cur.magicStones || { E: 0, D: 0, C: 0, B: 0, A: 0, S: 0 };
  const cash = cur.cash || cur.gold || 0;

  const stoneRanks = ['E', 'D', 'C', 'B', 'A', 'S'];
  const activeStones = stoneRanks.filter((r) => (stones[r] || 0) > 0);

  // Phase 5 — active set bonuses
  const activeSets = playerState?.activeSetBonuses || [];

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '10px 10px' }}>

      {/* ── Funds ── */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#4a5260', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>
          FUNDS
        </div>
        <div style={{ border: '1px solid #1e2530', background: 'rgba(10,14,22,0.6)', padding: '8px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#4a5260', width: '56px' }}>Cash:</span>
            <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#C8A951', fontWeight: 700 }}>
              ₩{formatCash(cash)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#4a5260', width: '56px', paddingTop: '1px' }}>Stones:</span>
            {activeStones.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {activeStones.map((rank) => (
                  <span key={rank} style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: STONE_COLORS[rank].text }}>
                    {rank}:{stones[rank]}
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#2a3040' }}>—</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Phase 5 — Active Set Bonuses ── */}
      {activeSets.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#4a5260', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>
            SET BONUSES ACTIVE
          </div>
          {activeSets.map((s, i) => (
            <div key={i} style={{
              border: '1px solid #3a1a5a', borderLeft: '3px solid #9b59b6',
              background: 'rgba(155,89,182,0.06)', borderRadius: '4px',
              padding: '6px 10px', marginBottom: '5px',
            }}>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#c47cec', fontWeight: 600 }}>{s.setName}</div>
              {s.pieces && (
                <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6a5a78', marginTop: '2px' }}>
                  {s.pieces.join(' + ')}
                </div>
              )}
              {s.bonus && (
                <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#9b59b6', marginTop: '3px' }}>◈ {s.bonus}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Gear Aesthetic ── */}
      {playerState?.gearAesthetic && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#4a5260', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>
            COMBAT AESTHETIC
          </div>
          <div style={{ border: '1px solid #2a3040', borderLeft: '3px solid #4a5260', background: 'rgba(10,14,22,0.6)', borderRadius: '4px', padding: '7px 10px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#8a9ab0', fontStyle: 'italic', lineHeight: 1.5 }}>
              {playerState.gearAesthetic}
            </div>
          </div>
        </div>
      )}

      {/* ── Item Sections ── */}
      <div style={{ marginBottom: '14px' }}>
        <Section title="EQUIPMENT"   items={inv.equipment}   emptyText="No equipment." />
      </div>
      <div style={{ marginBottom: '14px' }}>
        <Section title="CONSUMABLES" items={inv.consumables} emptyText="No consumables." />
      </div>
      <div style={{ marginBottom: '14px' }}>
        <Section title="ARTIFACTS"   items={inv.artifacts}   emptyText="No artifacts." />
      </div>
    </div>
  );
}
