// Right Panel Tab 5 — NPC Relationships

import React, { useState } from 'react';

const TIER_ORDER = ['Stranger', 'Contact', 'Acquaintance', 'Trusted', 'Loyal', 'Bound'];

function getTierIndex(tier) {
  if (!tier) return -1;
  return TIER_ORDER.findIndex((t) => t.toLowerCase() === tier.trim().toLowerCase());
}

function TierBar({ tier }) {
  const idx = getTierIndex(tier);
  if (idx < 0) return null;
  return (
    <div className="flex items-center gap-1">
      {TIER_ORDER.map((t, i) => (
        <div
          key={t}
          title={t}
          className={`h-[3px] flex-1 rounded-sm transition-colors ${
            i <= idx ? 'bg-system-gold opacity-90' : 'bg-system-border opacity-30'
          }`}
        />
      ))}
      <span className="font-mono text-[9px] text-system-gold ml-1 tracking-wide flex-shrink-0">
        {TIER_ORDER[idx].toUpperCase()}
      </span>
    </div>
  );
}

function VulnerabilityBadge({ vulnerability }) {
  if (!vulnerability || /^none$/i.test(vulnerability)) return null;
  const v = vulnerability.toLowerCase();
  let cls = '';
  if (/critical/i.test(v))   cls = 'text-system-red animate-pulse';
  else if (/danger/i.test(v)) cls = 'text-orange-400';
  else if (/risk/i.test(v))  cls = 'text-yellow-400';
  else return null;
  return (
    <span className={`font-mono text-[9px] tracking-wider ${cls}`}>
      ⚠ {vulnerability.toUpperCase()}
    </span>
  );
}

function ArcStageBadge({ arcStage }) {
  if (!arcStage || /^stable$/i.test(arcStage)) return null;
  let cls = 'text-system-text-dim';
  if (/breaking/i.test(arcStage))  cls = 'text-orange-400';
  else if (/pressured/i.test(arcStage)) cls = 'text-yellow-400';
  else if (/betrayal/i.test(arcStage))  cls = 'text-system-red';
  else if (/resolved/i.test(arcStage))  cls = 'text-system-green';
  return (
    <span className={`font-mono text-[9px] tracking-wider ${cls}`}>
      {arcStage.toUpperCase()}
    </span>
  );
}

function getRelStyles(relationship, isDeceased) {
  if (isDeceased) return { text: 'text-system-text-dim', border: 'border-system-border' };
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
  return { text: 'text-system-text-dim', border: 'border-system-border' };
}

function NPCCard({ npc }) {
  const [expanded, setExpanded] = useState(false);
  const isDeceased = /deceased/i.test(npc.status || '');
  const { text: textColor, border: borderColor } = getRelStyles(npc.relationship, isDeceased);
  const hasMemories = npc.memoryLog && npc.memoryLog.length > 0;

  return (
    <div
      className={`border ${borderColor} ${isDeceased ? 'opacity-40' : ''} border-opacity-30 bg-system-bg cursor-pointer hover:border-opacity-60 transition-all duration-150`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header row */}
      <div className="p-3 space-y-1">
        <div className="flex justify-between items-start gap-2">
          <div className="font-mono text-xs text-system-text font-medium leading-tight truncate flex items-center gap-1">
            {npc.isRomantic && !isDeceased && (
              <span className="text-rose-400 text-[10px]">♥</span>
            )}
            {isDeceased && (
              <span className="text-system-text-dim text-[10px]">†</span>
            )}
            {npc.name || '—'}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isDeceased && <VulnerabilityBadge vulnerability={npc.vulnerability} />}
            <span className={`font-mono text-[9px] ${textColor} tracking-wide`}>
              {npc.relationship || 'Unknown'}
            </span>
          </div>
        </div>

        {/* Tier progression bar */}
        {npc.relationshipTier && !isDeceased && (
          <TierBar tier={npc.relationshipTier} />
        )}

        {/* Preview row when collapsed */}
        {!expanded && (
          <div className="flex justify-between items-center gap-2">
            <div className="font-mono text-[10px] text-system-text-dim leading-relaxed line-clamp-1 opacity-70 flex-1">
              {npc.notes || (npc.faction ? npc.faction : '—')}
            </div>
            <ArcStageBadge arcStage={npc.arcStage} />
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

          {npc.status && npc.status !== 'Active' && (
            <div className="flex justify-between items-center">
              <span className="font-mono text-[9px] text-system-text-dim tracking-wider">STATUS</span>
              <span className={`font-mono text-[10px] ${isDeceased ? 'text-system-text-dim' : 'text-orange-400'}`}>
                {npc.status}
              </span>
            </div>
          )}

          {!isDeceased && npc.vulnerability && !/^none$/i.test(npc.vulnerability) && (
            <div className="flex justify-between items-center">
              <span className="font-mono text-[9px] text-system-text-dim tracking-wider">VULNERABILITY</span>
              <VulnerabilityBadge vulnerability={npc.vulnerability} />
            </div>
          )}

          {npc.arcStage && (
            <div className="flex justify-between items-center">
              <span className="font-mono text-[9px] text-system-text-dim tracking-wider">ARC STAGE</span>
              <ArcStageBadge arcStage={npc.arcStage} />
            </div>
          )}

          {npc.personalArc && (
            <div>
              <div className="font-mono text-[9px] text-system-text-dim tracking-wider mb-1">PERSONAL ARC</div>
              <div className="font-mono text-[10px] text-system-text leading-relaxed">{npc.personalArc}</div>
            </div>
          )}

          {npc.notes && (
            <div>
              <div className="font-mono text-[9px] text-system-text-dim tracking-wider mb-1">NOTES</div>
              <div className="font-mono text-[10px] text-system-text leading-relaxed">{npc.notes}</div>
            </div>
          )}

          {/* Memory log — most recent 3 entries */}
          {hasMemories && (
            <div>
              <div className="font-mono text-[9px] text-system-text-dim tracking-wider mb-1">
                MEMORIES ({npc.memoryLog.length})
              </div>
              <div className="space-y-1">
                {npc.memoryLog.slice(-3).map((m, i) => (
                  <div
                    key={i}
                    className="font-mono text-[10px] text-system-text-dim leading-relaxed pl-2 border-l border-system-border"
                  >
                    {m}
                  </div>
                ))}
              </div>
            </div>
          )}

          {npc.lastSeen && (
            <div className="flex justify-between items-start gap-2">
              <span className="font-mono text-[9px] text-system-text-dim tracking-wider flex-shrink-0">LAST SEEN</span>
              <span className="font-mono text-[10px] text-system-text-dim text-right">{npc.lastSeen}</span>
            </div>
          )}

          {/* Death record — only for deceased */}
          {isDeceased && npc.deathInfo && (
            <div className="border-t border-system-border pt-2 space-y-1 mt-1">
              {npc.deathInfo.date && (
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[9px] text-system-text-dim tracking-wider">DIED</span>
                  <span className="font-mono text-[10px] text-system-text-dim">{npc.deathInfo.date}</span>
                </div>
              )}
              {npc.deathInfo.circumstance && (
                <div>
                  <div className="font-mono text-[9px] text-system-text-dim tracking-wider mb-1">CIRCUMSTANCE</div>
                  <div className="font-mono text-[10px] text-system-text-dim leading-relaxed">
                    {npc.deathInfo.circumstance}
                  </div>
                </div>
              )}
              {npc.deathInfo.lastWords && (
                <div>
                  <div className="font-mono text-[9px] text-system-text-dim tracking-wider mb-1">LAST WORDS</div>
                  <div className="font-mono text-[10px] text-system-text-dim leading-relaxed italic">
                    "{npc.deathInfo.lastWords}"
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function groupNPCs(npcs) {
  const groups = {
    hostile:  [],
    rival:    [],
    romantic: [],
    family:   [],
    positive: [],
    neutral:  [],
    deceased: [],
  };

  for (const npc of npcs) {
    const r = (npc.relationship || '').toLowerCase();
    const s = (npc.status || '').toLowerCase();
    const isDeceased = /deceased/.test(s);

    if (isDeceased) {
      groups.deceased.push(npc);
    } else if (npc.isRomantic || /love\s*interest|romantic|partner|crush|devoted/.test(r)) {
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
    { key: 'hostile',  label: 'HOSTILE',  color: 'text-system-red',      list: groups.hostile },
    { key: 'rival',    label: 'RIVALS',   color: 'text-yellow-400',      list: groups.rival },
    { key: 'romantic', label: 'PERSONAL', color: 'text-rose-400',        list: groups.romantic },
    { key: 'family',   label: 'FAMILY',   color: 'text-system-blue',     list: groups.family },
    { key: 'positive', label: 'ALLIES',   color: 'text-system-green',    list: groups.positive },
    { key: 'neutral',  label: 'CONTACTS', color: 'text-system-text-dim', list: groups.neutral },
    { key: 'deceased', label: 'DECEASED', color: 'text-system-text-dim', list: groups.deceased },
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
