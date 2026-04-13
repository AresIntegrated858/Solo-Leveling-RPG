// Right Panel Tab 5 — NPC Relationships

import React, { useState } from 'react';

// Returns { text color class, border color class } based on relationship type
function getRelStyles(relationship) {
  if (!relationship) return { text: 'text-system-text-dim', border: 'border-system-border' };
  const r = relationship.toLowerCase();

  if (/love\s*interest|romantic|partner|crush|devoted/.test(r))
    return { text: 'text-rose-400', border: 'border-rose-400' };
  if (/family|brother|sister|sibling|kin|mother|father|parent|uncle|aunt|cousin/.test(r))
    return { text: 'text-system-blue', border: 'border-system-blue' };
  if (/mentor|master|teacher|sensei/.test(r))
    return { text: 'text-system-gold', border: 'border-system-gold' };
  if (/trusted|best friend|close friend|comrade|sworn|brother-in-arms/.test(r))
    return { text: 'text-system-green', border: 'border-system-green' };
  if (/friend|ally|partner|protégé|student|protege/.test(r))
    return { text: 'text-emerald-400', border: 'border-emerald-400' };
  if (/rival/.test(r))
    return { text: 'text-yellow-400', border: 'border-yellow-400' };
  if (/wary|suspicious|uneasy|tense/.test(r))
    return { text: 'text-yellow-600', border: 'border-yellow-600' };
  if (/enemy|hostile|nemesis|betrayed|marked|hunted|threat/.test(r))
    return { text: 'text-system-red', border: 'border-system-red' };
  if (/deceased|dead|killed/.test(r))
    return { text: 'text-system-text-dim', border: 'border-system-border' };

  return { text: 'text-system-text-dim', border: 'border-system-border' };
}

function getStatusStyle(status) {
  if (!status || status === 'Active') return null;
  const s = status.toLowerCase();
  if (/deceased|dead|killed/.test(s)) return 'text-system-red';
  if (/missing|unknown|whereabouts/.test(s)) return 'text-yellow-500';
  if (/injured|wounded/.test(s)) return 'text-orange-400';
  return 'text-system-text-dim';
}

function NPCCard({ npc }) {
  const [expanded, setExpanded] = useState(false);
  const { text: textColor, border: borderColor } = getRelStyles(npc.relationship);
  const statusStyle = getStatusStyle(npc.status);

  return (
    <div
      className={`border ${borderColor} border-opacity-30 bg-system-bg cursor-pointer hover:border-opacity-60 transition-all duration-150`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header row — always visible */}
      <div className="p-3 space-y-1">
        <div className="flex justify-between items-start gap-2">
          <div className="font-mono text-xs text-system-text font-medium leading-tight truncate">
            {npc.name || '—'}
          </div>
          <span className={`font-mono text-[9px] ${textColor} flex-shrink-0 tracking-wide`}>
            {npc.relationship || 'Unknown'}
          </span>
        </div>

        {/* Preview line when collapsed */}
        {!expanded && (
          <div className="font-mono text-[10px] text-system-text-dim leading-relaxed line-clamp-1 opacity-70">
            {npc.notes || (npc.faction ? npc.faction : '—')}
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-system-border px-3 pb-3 pt-2 space-y-2 bg-system-panel">

          {npc.faction && (
            <div className="flex justify-between items-center">
              <span className="font-mono text-[9px] text-system-text-dim tracking-wider">FACTION</span>
              <span className="font-mono text-[10px] text-system-text">{npc.faction}</span>
            </div>
          )}

          {statusStyle && npc.status && (
            <div className="flex justify-between items-center">
              <span className="font-mono text-[9px] text-system-text-dim tracking-wider">STATUS</span>
              <span className={`font-mono text-[10px] ${statusStyle}`}>{npc.status}</span>
            </div>
          )}

          {npc.notes && (
            <div>
              <div className="font-mono text-[9px] text-system-text-dim tracking-wider mb-1">NOTES</div>
              <div className="font-mono text-[10px] text-system-text leading-relaxed">{npc.notes}</div>
            </div>
          )}

          {npc.lastSeen && (
            <div className="flex justify-between items-start gap-2">
              <span className="font-mono text-[9px] text-system-text-dim tracking-wider flex-shrink-0">LAST SEEN</span>
              <span className="font-mono text-[10px] text-system-text-dim text-right">{npc.lastSeen}</span>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function groupNPCs(npcs) {
  const groups = {
    hostile: [],
    rival:   [],
    romantic:[],
    family:  [],
    positive:[],
    neutral: [],
  };

  for (const npc of npcs) {
    const r = (npc.relationship || '').toLowerCase();
    const s = (npc.status || '').toLowerCase();
    const isDeceased = /deceased|dead|killed/.test(s) || /deceased|dead|killed/.test(r);

    if (isDeceased) {
      // Put deceased under their relationship group but mark them
      groups.neutral.push(npc);
    } else if (/love\s*interest|romantic|partner|crush|devoted/.test(r)) {
      groups.romantic.push(npc);
    } else if (/family|brother|sister|sibling|kin|mother|father|parent|uncle|aunt|cousin/.test(r)) {
      groups.family.push(npc);
    } else if (/mentor|master|teacher|sensei|trusted|best friend|close friend|comrade|sworn|brother-in-arms/.test(r)) {
      groups.positive.push(npc);
    } else if (/friend|ally|partner|protégé|student|protege/.test(r)) {
      groups.positive.push(npc);
    } else if (/rival|wary|suspicious|uneasy|tense/.test(r)) {
      groups.rival.push(npc);
    } else if (/enemy|hostile|nemesis|betrayed|marked|hunted|threat/.test(r)) {
      groups.hostile.push(npc);
    } else {
      groups.neutral.push(npc);
    }
  }

  return [
    { key: 'hostile',  label: 'HOSTILE',   color: 'text-system-red',      list: groups.hostile },
    { key: 'rival',    label: 'RIVALS',     color: 'text-yellow-400',      list: groups.rival },
    { key: 'romantic', label: 'PERSONAL',   color: 'text-rose-400',        list: groups.romantic },
    { key: 'family',   label: 'FAMILY',     color: 'text-system-blue',     list: groups.family },
    { key: 'positive', label: 'ALLIES',     color: 'text-system-green',    list: groups.positive },
    { key: 'neutral',  label: 'CONTACTS',   color: 'text-system-text-dim', list: groups.neutral },
  ].filter((g) => g.list.length > 0);
}

export default function RelationsPanel({ npcs }) {
  if (!npcs || npcs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="font-mono text-xs text-system-text-dim">[ NO CONTACTS ON RECORD ]</div>
          <div className="font-mono text-[10px] text-system-muted">
            People encountered in the field will be logged here.
          </div>
        </div>
      </div>
    );
  }

  const sections = groupNPCs(npcs);

  return (
    <div className="h-full overflow-y-auto p-3 space-y-4">
      {sections.map(({ key, label, color, list }) => (
        <div key={key}>
          <div className={`font-mono text-[9px] ${color} tracking-widest mb-2`}>{label}</div>
          <div className="space-y-2">
            {list.map((npc, i) => (
              <NPCCard key={`${npc.name}-${i}`} npc={npc} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
