// System Message — renders Claude API response with Solo Leveling System aesthetic
// Narrative: clean prose. System blocks: cold, clinical, blue/purple UI panels.

import React, { useState } from 'react';

// ─── System block header detection ──────────────────────────────────────────
const BLOCK_HEADER_RE = /^\[\s*[A-Z][A-Z\s\-]+\s*\]$/;

// ─── Color classification for block headers ──────────────────────────────────
function getBlockStyle(header) {
  const h = header.toUpperCase();
  if (/LEVEL.?UP|TITLE.?UNLOCKED/.test(h))
    return { border: '#C8A951', text: '#C8A951', bg: 'rgba(200,169,81,0.06)', glow: '0 0 12px rgba(200,169,81,0.15)' };
  if (/SYSTEM.?FAILURE|DEATH|FATAL|COMBAT/.test(h))
    return { border: '#E05252', text: '#E05252', bg: 'rgba(224,82,82,0.05)', glow: '0 0 12px rgba(224,82,82,0.12)' };
  if (/SYSTEM.?ANOMALY/.test(h))
    return { border: '#ff4444', text: '#ff7070', bg: 'rgba(255,68,68,0.07)', glow: '0 0 16px rgba(255,68,68,0.2)', anomaly: true };
  if (/MEMORY.?FRAGMENT/.test(h))
    return { border: '#8a7060', text: '#c8b090', bg: 'rgba(138,112,96,0.08)', glow: '0 0 10px rgba(138,112,96,0.12)', memory: true };
  if (/ORIGIN.?CLUE/.test(h))
    return { border: '#7a4fa0', text: '#b080e0', bg: 'rgba(122,79,160,0.07)', glow: '0 0 14px rgba(122,79,160,0.18)' };
  if (/MORAL.?DECISION/.test(h))
    return { border: '#E05252', text: '#E05252', bg: 'rgba(224,82,82,0.06)', glow: '0 0 12px rgba(224,82,82,0.15)' };
  if (/NEWS.?FEED/.test(h))
    return { border: '#4A90D9', text: '#7ab8f5', bg: 'rgba(74,144,217,0.05)', glow: '0 0 10px rgba(74,144,217,0.1)' };
  if (/LEGEND.?ENTRY/.test(h))
    return { border: '#C8A951', text: '#e0c060', bg: 'rgba(200,169,81,0.07)', glow: '0 0 14px rgba(200,169,81,0.2)' };
  if (/BELIEF.?SHIFT/.test(h))
    return { border: '#4abe8a', text: '#4abe8a', bg: 'rgba(74,190,138,0.05)', glow: '0 0 10px rgba(74,190,138,0.1)' };
  if (/LORE.?CODEX/.test(h))
    return { border: '#9B7FD4', text: '#b8a0e8', bg: 'rgba(155,127,212,0.06)', glow: '0 0 10px rgba(155,127,212,0.1)' };
  if (/^REST$/.test(h))
    return { border: '#8a7040', text: '#c8a870', bg: 'rgba(200,168,80,0.05)', glow: '0 0 18px rgba(200,168,80,0.08)', rest: true };
  if (/SKILL|TITLE/.test(h))
    return { border: '#9B7FD4', text: '#9B7FD4', bg: 'rgba(155,127,212,0.05)', glow: '0 0 10px rgba(155,127,212,0.1)' };
  if (/QUEST/.test(h))
    return { border: '#52A8E0', text: '#7EC8E3', bg: 'rgba(82,168,224,0.05)', glow: '0 0 10px rgba(82,168,224,0.1)' };
  if (/NPC|WORLD/.test(h))
    return { border: '#3a9e6e', text: '#4abe8a', bg: 'rgba(58,158,110,0.05)', glow: '0 0 10px rgba(58,158,110,0.1)' };
  // default — system blue
  return { border: '#4A90D9', text: '#7ab8f5', bg: 'rgba(74,144,217,0.05)', glow: '0 0 12px rgba(74,144,217,0.12)' };
}

// ─── Single line renderer ────────────────────────────────────────────────────
function RenderLine({ line, index, blockStyle, inBlock }) {
  if (!line.trim()) return <div key={index} className="h-2" />;

  // Section divider
  if (/^[═─\-=]{4,}$/.test(line.trim())) {
    return <div key={index} style={{ height: '1px', background: inBlock ? blockStyle.border + '33' : '#1e1e2e', margin: '6px 0', opacity: 0.5 }} />;
  }

  // Block header
  if (BLOCK_HEADER_RE.test(line.trim())) {
    const style = getBlockStyle(line);
    const label = line.trim().replace(/^\[\s*/, '').replace(/\s*\]$/, '');
    return (
      <div key={index} style={{ color: style.text, borderBottom: `1px solid ${style.border}44`, marginBottom: 6, marginTop: 12, paddingBottom: 4 }}
        className="font-mono text-[10px] tracking-[0.25em] uppercase flex items-center gap-2">
        <span style={{ color: style.border, opacity: 0.7 }}>▶</span>
        {label}
      </div>
    );
  }

  // Numbered choice
  if (/^\d+\.\s/.test(line.trim())) {
    return (
      <div key={index} className="font-mono text-[11px] text-system-text my-[3px] flex gap-3 items-start">
        <span className="text-system-blue opacity-60 flex-shrink-0 mt-[1px]">
          {line.match(/^(\d+)\./)?.[1]}.
        </span>
        <span className="text-system-text leading-snug">{line.replace(/^\d+\.\s/, '')}</span>
      </div>
    );
  }

  // Key-value pair inside a system block
  if (inBlock && /^[A-Za-z][a-zA-Z\s\/]+:\s/.test(line.trim()) && line.trim().length < 140) {
    const colonIdx = line.indexOf(':');
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();
    if (!val || val === '—' || val === '-') return null;
    const valColor =
      /^HP$|Health/i.test(key) ? '#e05252' :
      /^MP$|Mana/i.test(key) ? '#4A90D9' :
      /Stamina/i.test(key) ? '#4abe8a' :
      /Level|Rank/i.test(key) ? '#C8A951' :
      /XP|Experience/i.test(key) ? '#C8A951' :
      /Risk|Warning|Danger/i.test(key) ? '#e05252' :
      '#c8c8d4';
    return (
      <div key={index} className="font-mono text-[10px] flex gap-3 py-[2px] items-baseline">
        <span className="min-w-[110px] flex-shrink-0" style={{ color: '#6b7a9a' }}>{key}</span>
        <span style={{ color: valColor }}>{val}</span>
      </div>
    );
  }

  // Objective line inside quest block
  if (inBlock && /\[\s*[xX✓ ]\s*\]/.test(line)) {
    const done = /\[[xX✓]\]/.test(line);
    const text = line.replace(/\[\s*[xX✓ ]\s*\]/, '').replace(/^[-–\s]+/, '').trim();
    return (
      <div key={index} className="font-mono text-[10px] flex gap-2 py-[2px] pl-2">
        <span style={{ color: done ? '#4abe8a' : '#4A90D9' }}>{done ? '✓' : '○'}</span>
        <span style={{ color: done ? '#4abe8a88' : '#c8c8d4', textDecoration: done ? 'line-through' : 'none' }}>{text}</span>
      </div>
    );
  }

  // Stat line (STR: 12 AGI: 10 etc.)
  if (/\b(STR|AGI|END|INT|PER|LUCK)\s*:\s*\d+/.test(line)) {
    const pairs = [...line.matchAll(/\b(STR|AGI|END|INT|PER|LUCK)\s*:\s*(\d+)/g)];
    const statColors = { STR: '#e05252', AGI: '#4A90D9', END: '#4abe8a', INT: '#9B7FD4', PER: '#f0c040', LUCK: '#C8A951' };
    return (
      <div key={index} className="font-mono text-[10px] flex flex-wrap gap-x-5 gap-y-1 py-[3px]">
        {pairs.map(([, k, v], j) => (
          <span key={j}>
            <span style={{ color: '#6b7a9a' }}>{k} </span>
            <span style={{ color: statColors[k] || '#c8c8d4', fontWeight: 600 }}>{v}</span>
          </span>
        ))}
      </div>
    );
  }

  // Bullet item
  if (/^[-–•]\s/.test(line.trim())) {
    const text = line.replace(/^[-–•]\s/, '');
    return (
      <div key={index} className="font-mono text-[10px] flex gap-2 py-[2px] pl-1" style={{ color: '#9aa0b8' }}>
        <span style={{ color: '#4A90D9', opacity: 0.5 }}>·</span>
        <span>{text}</span>
      </div>
    );
  }

  // "Your choices:" label
  if (/^Your choices\s*:?$/i.test(line.trim())) {
    return (
      <div key={index} className="font-mono text-[9px] tracking-widest mt-4 mb-2" style={{ color: '#4A90D9', opacity: 0.7 }}>
        ── AWAITING INPUT ──────────────────────────
      </div>
    );
  }

  // Narrative prose (default)
  return (
    <p key={index} className="narrative-text py-[2px] leading-relaxed">
      {line}
    </p>
  );
}

// ─── Split response into narrative vs system block segments ──────────────────
function parseSegments(text) {
  const lines = text.split('\n');
  const segments = [];
  let inBlock = false;
  let current = { type: 'narrative', header: null, lines: [] };

  for (const line of lines) {
    if (BLOCK_HEADER_RE.test(line.trim())) {
      if (current.lines.length > 0) segments.push(current);
      inBlock = true;
      current = { type: 'system', header: line.trim(), lines: [line] };
    } else if (inBlock) {
      current.lines.push(line);
      // End block on a long divider or two consecutive blank lines
      const blanks = current.lines.filter((l) => !l.trim()).length;
      const lastFew = current.lines.slice(-3).map((l) => l.trim());
      const hasTrailingBlanks = lastFew.filter((l) => !l).length >= 2;
      if (hasTrailingBlanks && current.lines.length > 4) {
        segments.push(current);
        inBlock = false;
        current = { type: 'narrative', header: null, lines: [] };
      }
    } else {
      current.lines.push(line);
    }
  }

  if (current.lines.length > 0) segments.push(current);
  return segments;
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function SystemMessage({ content, role, isStreaming }) {
  if (!content) return null;

  if (role === 'user') {
    return (
      <div className="flex items-start gap-3 py-2">
        <div className="font-mono text-[9px] tracking-widest mt-1 flex-shrink-0" style={{ color: '#4A90D9', minWidth: 48, textAlign: 'right' }}>
          INPUT
        </div>
        <div className="flex-1 font-mono text-[11px] italic" style={{ color: '#8890a8' }}>
          {content}
        </div>
      </div>
    );
  }

  const segments = parseSegments(content);

  return (
    <div className="py-3 space-y-1">
      {segments.map((seg, si) => {
        if (seg.type === 'system') {
          const style = getBlockStyle(seg.header || '');
          // SYSTEM ANOMALY — distorted/glitched appearance
          if (style.anomaly) {
            return (
              <div
                key={si}
                style={{
                  border: `1px solid ${style.border}66`,
                  borderLeft: `3px solid ${style.border}`,
                  background: style.bg,
                  boxShadow: style.glow,
                  margin: '10px 0',
                  padding: '8px 14px',
                  fontStyle: 'italic',
                  letterSpacing: '0.02em',
                }}
              >
                {seg.lines.map((line, li) => (
                  <RenderLine key={li} line={line} index={li} blockStyle={style} inBlock={true} />
                ))}
              </div>
            );
          }
          // REST — warm amber, expanded padding, scene field in italic prose
          if (style.rest) {
            // Extract Scene field for special rendering
            const sceneMatch = seg.lines.join('\n').match(/Scene\s*:\s*(.+?)(?:\n[A-Z]|$)/s);
            const sceneText = sceneMatch ? sceneMatch[1].trim() : null;
            return (
              <div
                key={si}
                style={{
                  border: `1px solid ${style.border}55`,
                  borderLeft: `3px solid ${style.border}`,
                  background: style.bg,
                  boxShadow: style.glow,
                  margin: '14px 0',
                  padding: '12px 18px 14px',
                }}
              >
                {seg.lines
                  .filter((l) => !l.match(/^Scene\s*:/i))
                  .map((line, li) => (
                    <RenderLine key={li} line={line} index={li} blockStyle={style} inBlock={true} />
                  ))}
                {sceneText && (
                  <div style={{
                    marginTop: '10px',
                    paddingTop: '10px',
                    borderTop: `1px solid ${style.border}33`,
                    fontStyle: 'italic',
                    color: '#a89060',
                    fontSize: '12px',
                    lineHeight: 1.7,
                    fontFamily: 'Georgia, serif',
                  }}>
                    {sceneText}
                  </div>
                )}
              </div>
            );
          }
          // MEMORY FRAGMENT — sepia/faded appearance
          if (style.memory) {
            return (
              <div
                key={si}
                style={{
                  border: `1px solid ${style.border}44`,
                  borderLeft: `2px solid ${style.border}`,
                  background: style.bg,
                  boxShadow: style.glow,
                  margin: '10px 0',
                  padding: '8px 14px',
                  opacity: 0.88,
                  fontStyle: 'italic',
                }}
              >
                {seg.lines.map((line, li) => (
                  <RenderLine key={li} line={line} index={li} blockStyle={style} inBlock={true} />
                ))}
              </div>
            );
          }
          return (
            <div
              key={si}
              style={{
                border: `1px solid ${style.border}55`,
                borderLeft: `2px solid ${style.border}`,
                background: style.bg,
                boxShadow: style.glow,
                margin: '10px 0',
                padding: '8px 14px',
              }}
            >
              {seg.lines.map((line, li) => (
                <RenderLine key={li} line={line} index={li} blockStyle={style} inBlock={true} />
              ))}
            </div>
          );
        }

        // Narrative segment
        return (
          <div key={si}>
            {seg.lines.map((line, li) => (
              <RenderLine key={li} line={line} index={li} blockStyle={null} inBlock={false} />
            ))}
          </div>
        );
      })}
      {isStreaming && (
        <span
          className="inline-block ml-1 align-middle processing-pulse"
          style={{ width: 8, height: 16, background: '#4A90D9', verticalAlign: 'middle' }}
        />
      )}
    </div>
  );
}
