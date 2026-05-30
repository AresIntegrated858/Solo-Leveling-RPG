// Hunter ID Card — portrait + identity bar shown at top of the System Status panel
// Renders the DALL-E 3 generated portrait alongside the Hunter's name, rank, and level.
// Falls back to a placeholder silhouette for saves that have no portrait yet.

import React from 'react';

const PLACEHOLDER_PORTRAIT = `      ░▒▓████▓▒░
    ░▓████████████▓░
   ▓██▀  ▒▒▒▒  ▀██▓
   ██  ░▓████▓░  ██
   █  ▒██████████▒  █
   █  ░▒▓██████▓▒░  █
   ▓█  ░  ░──░  ░  █▓
    ▒█    ░──░    █▒
     ▓▄  ░    ░  ▄▓
      ░▀▄░░░░░░▄▀░
        ░▒▒▒▒▒▒░
   ░▒▓████████████▓▒░
  ▓█████████████████▓
 ████████████████████
████████████████████▓
░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░ `;

export default function HunterIDCard({ playerState }) {
  const p = playerState || {};
  const portrait = (p.portrait && p.portrait.trim().length > 0) ? p.portrait : null;
  const isImage = portrait && portrait.startsWith('data:');

  const rankColor =
    p.rank === 'S' ? 'text-system-gold border-system-gold' :
    p.rank === 'A' ? 'text-system-blue border-system-blue' :
    'text-system-text-dim border-system-border';

  return (
    <div className="border-b border-system-border" style={{ background: '#06060c' }}>
      {/* Card header */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="font-mono text-[9px] text-system-text-dim tracking-widest">
          HUNTER ID
        </span>
        <span className="font-mono text-[9px] text-system-text-dim tracking-widest">
          ░▒▓ SYSTEM ▓▒░
        </span>
      </div>

      {/* Portrait */}
      <div className="px-3 pb-2">
        <div
          className="border border-system-border overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(10,12,22,1) 0%, rgba(4,4,10,1) 100%)',
            boxShadow: 'inset 0 0 28px rgba(74,144,217,0.08)',
          }}
        >
          {isImage ? (
            <img
              src={portrait}
              alt={`${p.name || 'Hunter'} portrait`}
              style={{
                width: '100%',
                aspectRatio: '3 / 4',
                objectFit: 'cover',
                objectPosition: 'center top',
                display: 'block',
                filter: 'saturate(1.1) contrast(1.05)',
              }}
            />
          ) : (
            <div className="p-2 flex items-center justify-center">
              <pre
                className="font-mono text-[7px] leading-[8px] text-system-blue m-0 select-none"
                style={{
                  textShadow: '0 0 6px rgba(74,144,217,0.45)',
                  whiteSpace: 'pre',
                }}
              >
                {portrait || PLACEHOLDER_PORTRAIT}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Identity strip */}
      <div className="px-3 pb-3 space-y-1">
        <div className="font-mono text-[13px] text-system-text font-medium tracking-wide truncate">
          {p.name || 'UNREGISTERED'}
        </div>
        <div className="flex items-center justify-between">
          <span className={`font-mono text-[9px] px-2 py-[1px] border tracking-widest ${rankColor}`}>
            {p.rank || 'E'} RANK
          </span>
          <span className="font-mono text-[10px] text-system-text-dim">
            Lv. <span className="text-system-blue">{p.level || 1}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
