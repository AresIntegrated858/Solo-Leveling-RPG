// System Message — renders Claude API response text with Solo Leveling aesthetic
// Detects system blocks, combat HUDs, dividers, and numbered choices

import React from 'react';

// Render a single line with appropriate styling
function RenderLine({ line, index }) {
  // Empty line
  if (!line.trim()) return <div key={index} className="h-2" />;

  // Section divider
  if (/^[═─\-=]{4,}$/.test(line.trim())) {
    return (
      <hr key={index} className="border-system-border my-2 opacity-40" />
    );
  }

  // System block header: [ CAPS WORD(S) ]
  if (/^\[\s*[A-Z][A-Z\s]+\s*\]$/.test(line.trim())) {
    const isGold = /LEVEL UP|TITLE|WARNING|SYSTEM FAILURE/.test(line);
    const isRed = /SYSTEM FAILURE|DEATH|FATAL/.test(line);
    return (
      <div
        key={index}
        className={`font-mono text-xs tracking-widest py-1 mt-3 mb-1 border-b ${
          isRed
            ? 'text-system-red border-system-red border-opacity-40'
            : isGold
            ? 'text-system-gold border-system-gold border-opacity-30'
            : 'text-system-blue border-system-blue border-opacity-30'
        }`}
      >
        {line.trim()}
      </div>
    );
  }

  // Numbered choice (1. text, 2. text)
  if (/^\d+\.\s/.test(line.trim())) {
    return (
      <div
        key={index}
        className="font-mono text-xs text-system-text my-1 pl-2 border-l border-system-border"
      >
        {line}
      </div>
    );
  }

  // Key-value pair inside system block (Key: value)
  if (/^[A-Z][a-zA-Z\s]+:\s/.test(line.trim()) && line.trim().length < 120) {
    const colonIdx = line.indexOf(':');
    const key = line.slice(0, colonIdx);
    const val = line.slice(colonIdx + 1).trim();
    return (
      <div key={index} className="font-mono text-[11px] flex gap-2 py-[1px]">
        <span className="text-system-text-dim min-w-[80px]">{key}:</span>
        <span className={`text-system-text ${
          /HP|Health/.test(key) ? 'text-red-400' :
          /MP|Mana/.test(key) ? 'text-system-blue' :
          /Stamina/.test(key) ? 'text-system-green' :
          /Level|Rank/.test(key) ? 'text-system-gold' :
          /Warning|Risk/.test(key) ? 'text-system-red' :
          ''
        }`}>{val}</span>
      </div>
    );
  }

  // Bullet list item
  if (/^[-•·]\s/.test(line.trim())) {
    return (
      <div key={index} className="font-mono text-[11px] text-system-text-dim pl-3 py-[1px] flex gap-2">
        <span className="text-system-muted">·</span>
        <span>{line.replace(/^[-•·]\s/, '')}</span>
      </div>
    );
  }

  // Stat line (STR: 12, AGI: 15, etc.)
  if (/^(STR|AGI|END|INT|PER|LUCK):\s*\d+/.test(line.trim())) {
    const parts = line.trim().split(/\s{2,}|\t/);
    return (
      <div key={index} className="font-mono text-[11px] flex flex-wrap gap-4 py-[1px]">
        {parts.map((part, j) => {
          const [k, v] = part.split(':').map((s) => s.trim());
          return (
            <span key={j}>
              <span className="text-system-text-dim">{k}: </span>
              <span className="text-system-text">{v}</span>
            </span>
          );
        })}
      </div>
    );
  }

  // Warning line
  if (/^Warning:|^CAUTION:|^ALERT:/.test(line.trim())) {
    return (
      <div key={index} className="font-mono text-xs text-system-red mt-2">
        {line}
      </div>
    );
  }

  // Default: narrative prose
  return (
    <p key={index} className="narrative-text py-[2px]">
      {line}
    </p>
  );
}

// Determine if text is inside a system block
function splitTextToSegments(text) {
  const lines = text.split('\n');
  const segments = [];
  let inSystemBlock = false;
  let currentSegment = { type: 'narrative', lines: [] };

  for (const line of lines) {
    const isBlockHeader = /^\[\s*[A-Z][A-Z\s]+\s*\]$/.test(line.trim());

    if (isBlockHeader) {
      if (currentSegment.lines.length > 0) {
        segments.push(currentSegment);
      }
      inSystemBlock = true;
      currentSegment = { type: 'system', lines: [line] };
    } else if (inSystemBlock && /^[═─]{4,}$/.test(line.trim())) {
      // End of system block
      currentSegment.lines.push(line);
      segments.push(currentSegment);
      inSystemBlock = false;
      currentSegment = { type: 'narrative', lines: [] };
    } else {
      currentSegment.lines.push(line);
    }
  }

  if (currentSegment.lines.length > 0) {
    segments.push(currentSegment);
  }

  return segments;
}

export default function SystemMessage({ content, role, isStreaming }) {
  if (!content) return null;

  if (role === 'user') {
    return (
      <div className="flex items-start gap-3 py-2">
        <div className="font-mono text-[10px] text-system-text-dim mt-1 min-w-[48px] text-right">YOU</div>
        <div className="flex-1 font-mono text-sm text-system-text-dim italic">
          {content}
        </div>
      </div>
    );
  }

  const segments = splitTextToSegments(content);

  return (
    <div className="py-3 space-y-1">
      {segments.map((seg, si) => (
        <div
          key={si}
          className={seg.type === 'system' ? 'system-block my-2' : ''}
        >
          {seg.lines.map((line, li) => (
            <RenderLine key={li} line={line} index={li} />
          ))}
        </div>
      ))}
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-system-blue ml-1 processing-pulse align-middle" />
      )}
    </div>
  );
}
