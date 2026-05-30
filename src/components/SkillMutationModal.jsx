// Skill Mutation Modal — Phase 6
// Appears when a skill crosses the A→S threshold.
// Presents two permanent mutation paths. Choice is irreversible.

import React, { useState } from 'react';

export default function SkillMutationModal({ mutationData, onChoose }) {
  const [hoveredPath, setHoveredPath] = useState(null);
  const [confirmed, setConfirmed] = useState(null);

  if (!mutationData) return null;
  const { skillName, paths } = mutationData;

  function handleChoose(path) {
    if (confirmed) return;
    setConfirmed(path.name);
    setTimeout(() => onChoose(path), 800);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 90,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          fontFamily: 'monospace', fontSize: '10px',
          color: '#9b59b6', letterSpacing: '0.2em', textTransform: 'uppercase',
          marginBottom: '8px',
        }}>
          [ SKILL MUTATION — THRESHOLD REACHED ]
        </div>
        <div style={{
          fontFamily: 'monospace', fontSize: '22px',
          color: '#c47cec', fontWeight: 700, letterSpacing: '0.05em',
        }}>
          {skillName}
        </div>
        <div style={{
          fontFamily: 'monospace', fontSize: '11px', color: '#6a5a78',
          marginTop: '6px',
        }}>
          Rank A → S advancement paused. Choose a mutation path.
        </div>
        <div style={{
          fontFamily: 'monospace', fontSize: '10px', color: '#ff4444',
          marginTop: '4px', letterSpacing: '0.05em',
        }}>
          ⚠ THIS CHOICE IS PERMANENT. THE UNCHOSEN PATH IS CLOSED FOREVER.
        </div>
      </div>

      {/* Paths */}
      <div style={{ display: 'flex', gap: '24px', maxWidth: '780px', width: '100%', padding: '0 24px' }}>
        {paths.map((path, idx) => {
          const isHovered = hoveredPath === idx;
          const isChosen  = confirmed === path.name;
          const isOther   = confirmed && confirmed !== path.name;
          return (
            <button
              key={idx}
              onMouseEnter={() => !confirmed && setHoveredPath(idx)}
              onMouseLeave={() => setHoveredPath(null)}
              onClick={() => handleChoose(path)}
              disabled={!!confirmed}
              style={{
                flex: 1,
                border: `2px solid ${isChosen ? '#9b59b6' : isHovered ? '#7d3c98' : '#3a1a5a'}`,
                borderRadius: '6px',
                background: isChosen ? 'rgba(155,89,182,0.15)' : isHovered ? 'rgba(155,89,182,0.08)' : 'rgba(10,14,22,0.8)',
                padding: '20px',
                cursor: confirmed ? 'default' : 'pointer',
                opacity: isOther ? 0.25 : 1,
                transition: 'all 0.2s',
                textAlign: 'left',
              }}
            >
              <div style={{
                fontFamily: 'monospace', fontSize: '13px',
                color: isChosen ? '#c47cec' : isHovered ? '#b068dc' : '#9a7ab0',
                fontWeight: 700, marginBottom: '10px',
                letterSpacing: '0.05em',
              }}>
                PATH {idx + 1}: {path.name.toUpperCase()}
              </div>
              <div style={{
                fontFamily: 'monospace', fontSize: '11px',
                color: '#8a9ab0', lineHeight: 1.6, marginBottom: '14px',
              }}>
                {path.description}
              </div>
              {path.tradeoff && (
                <div style={{
                  fontFamily: 'monospace', fontSize: '10px',
                  color: '#8b4513', borderTop: '1px solid #3a1a1a',
                  paddingTop: '10px', lineHeight: 1.5,
                }}>
                  <span style={{ color: '#cc4444' }}>Tradeoff: </span>
                  {path.tradeoff}
                </div>
              )}
              {isChosen && (
                <div style={{
                  fontFamily: 'monospace', fontSize: '11px',
                  color: '#9b59b6', marginTop: '12px',
                  letterSpacing: '0.1em',
                }}>
                  ✓ CHOSEN
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div style={{
        fontFamily: 'monospace', fontSize: '9px', color: '#2a1a3a',
        marginTop: '24px', letterSpacing: '0.1em',
      }}>
        SYSTEM NOTE: MUTATION IS IRREVERSIBLE — NO CONFIRMATION PROMPT WILL FOLLOW
      </div>
    </div>
  );
}
