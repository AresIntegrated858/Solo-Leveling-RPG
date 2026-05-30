// NewsFeedPanel — Phase 4 right panel tab
// Displays append-only media headlines and Association press releases

import React, { useState } from 'react';

const CATEGORY_STYLES = {
  association: { label: 'ASSOC', color: '#4A90D9', bg: 'rgba(74,144,217,0.08)' },
  local:       { label: 'LOCAL', color: '#4abe8a', bg: 'rgba(74,190,138,0.08)' },
  national:    { label: 'NAT',   color: '#C8A951', bg: 'rgba(200,169,81,0.08)' },
  hunter:      { label: 'HUNTR', color: '#9B7FD4', bg: 'rgba(155,127,212,0.08)' },
};

function NewsCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.association;

  return (
    <div
      className="border border-system-border border-opacity-40 cursor-pointer hover:border-opacity-70 transition-all"
      style={{ background: cat.bg }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-2 flex items-start gap-2">
        <span
          className="font-mono text-[8px] tracking-wider flex-shrink-0 mt-[1px] px-1 py-[1px]"
          style={{ color: cat.color, border: `1px solid ${cat.color}55` }}
        >
          {cat.label}
        </span>
        <span className="font-mono text-[10px] text-system-text leading-snug flex-1">
          {item.headline}
        </span>
      </div>
      {expanded && (
        <div className="border-t border-system-border border-opacity-30 px-3 py-2 space-y-1">
          <div className="flex justify-between">
            <span className="font-mono text-[9px] text-system-text-dim">SOURCE</span>
            <span className="font-mono text-[9px] text-system-text">{item.source}</span>
          </div>
          {item.date && (
            <div className="flex justify-between">
              <span className="font-mono text-[9px] text-system-text-dim">DATE</span>
              <span className="font-mono text-[9px] text-system-text">{item.date}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function NewsFeedPanel({ newsFeed, codex }) {
  const feed = newsFeed || [];
  const entries = codex || [];
  const originEntries = entries.filter((e) => e.category === 'origin');
  const loreEntries = entries.filter((e) => e.category !== 'origin');

  return (
    <div className="h-full overflow-y-auto p-3 space-y-4">

      {/* News Feed */}
      <div>
        <div className="font-mono text-[9px] text-system-text-dim tracking-widest mb-2">NEWS FEED</div>
        {feed.length > 0 ? (
          <div className="space-y-2">
            {feed.slice().reverse().map((item, i) => (
              <NewsCard key={i} item={item} />
            ))}
          </div>
        ) : (
          <div className="font-mono text-[10px] text-system-muted py-2">
            No media coverage on record.
          </div>
        )}
      </div>

      {/* Lore Codex */}
      {loreEntries.length > 0 && (
        <div>
          <div className="font-mono text-[9px] text-system-text-dim tracking-widest mb-2">LORE CODEX</div>
          <div className="space-y-2">
            {loreEntries.map((entry, i) => (
              <div key={i} className="border border-system-border border-opacity-30 p-2 bg-system-bg">
                <div className="font-mono text-[9px] text-system-gold mb-1 tracking-wider">{entry.title.toUpperCase()}</div>
                <div className="font-mono text-[10px] text-system-text leading-relaxed">{entry.entry}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Origin Clues — shown only if discovered */}
      {originEntries.length > 0 && (
        <div>
          <div className="font-mono text-[9px] tracking-widest mb-2" style={{ color: '#9B7FD4' }}>ANOMALOUS OBSERVATIONS</div>
          <div className="space-y-2">
            {originEntries.map((entry, i) => (
              <div
                key={i}
                className="p-2"
                style={{ border: '1px solid rgba(155,127,212,0.3)', background: 'rgba(155,127,212,0.05)' }}
              >
                <div className="font-mono text-[9px] mb-1 tracking-wider" style={{ color: '#9B7FD4' }}>
                  {entry.title}
                </div>
                <div className="font-mono text-[10px] leading-relaxed" style={{ color: '#c8c8d4' }}>
                  {entry.entry}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
