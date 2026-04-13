// Right Panel Tab 1 — Skill Directory

import React, { useState } from 'react';
import { SKILL_RANK_THRESHOLDS, SKILL_RANK_ORDER } from '../utils/stateParser';

const RANK_COLORS = {
  E: 'text-system-text-dim',
  D: 'text-system-text',
  C: 'text-system-green',
  B: 'text-system-blue',
  A: 'text-system-gold',
  S: 'text-system-red',
};

const RANK_BORDER = {
  E: 'border-system-border',
  D: 'border-system-border',
  C: 'border-system-green',
  B: 'border-system-blue',
  A: 'border-system-gold',
  S: 'border-system-red',
};

function UsageBar({ usageCount, rank }) {
  const rankIdx = SKILL_RANK_ORDER.indexOf(rank);
  const nextRank = SKILL_RANK_ORDER[rankIdx + 1];
  if (!nextRank) {
    // Max rank — show full bar
    return (
      <div className="space-y-[2px]">
        <div className="flex justify-between">
          <span className="font-mono text-[8px] text-system-text-dim">MASTERY</span>
          <span className="font-mono text-[8px] text-system-red">MAX RANK</span>
        </div>
        <div className="stat-bar-track">
          <div className="stat-bar-fill bg-system-red" style={{ width: '100%' }} />
        </div>
      </div>
    );
  }
  const threshold = SKILL_RANK_THRESHOLDS[rank] || 8;
  const prevThreshold = rankIdx > 0 ? SKILL_RANK_THRESHOLDS[SKILL_RANK_ORDER[rankIdx - 1]] || 0 : 0;
  const progress = Math.max(0, usageCount - prevThreshold);
  const needed = threshold - prevThreshold;
  const pct = Math.min(100, (progress / needed) * 100);
  const rankColor = RANK_COLORS[nextRank] || 'text-system-text-dim';

  return (
    <div className="space-y-[2px]">
      <div className="flex justify-between">
        <span className="font-mono text-[8px] text-system-text-dim">Uses: {usageCount}</span>
        <span className={`font-mono text-[8px] ${rankColor}`}>{usageCount}/{threshold} → {nextRank}</span>
      </div>
      <div className="stat-bar-track">
        <div
          className={`stat-bar-fill ${
            nextRank === 'S' ? 'bg-system-red' :
            nextRank === 'A' ? 'bg-system-gold' :
            nextRank === 'B' ? 'bg-system-blue' :
            nextRank === 'C' ? 'bg-system-green' : 'bg-system-text-dim'
          }`}
          style={{ width: `${pct}%`, transition: 'width 0.4s ease' }}
        />
      </div>
    </div>
  );
}

function SkillCard({ skill }) {
  const [expanded, setExpanded] = useState(false);

  const typeColor = {
    Passive: 'text-system-green',
    Active: 'text-system-blue',
    Conditional: 'text-system-gold',
  };

  const rank = skill.rank || 'E';
  const rankColor = RANK_COLORS[rank] || 'text-system-text-dim';
  const rankBorder = RANK_BORDER[rank] || 'border-system-border';
  const usageCount = skill.usageCount || 0;

  return (
    <div
      className={`border ${rankBorder} border-opacity-40 bg-system-bg cursor-pointer hover:border-opacity-80 transition-all duration-150 ${rank === 'S' ? 'animate-pulse-border' : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-3 space-y-2">
        <div className="flex justify-between items-start">
          <div className="font-mono text-xs text-system-text font-medium leading-tight">{skill.name}</div>
          <span className={`font-mono text-[10px] font-bold ${rankColor} ml-2 flex-shrink-0`}>
            {rank}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[9px] ${typeColor[skill.type] || 'text-system-text-dim'}`}>
            {skill.type || 'Unknown'}
          </span>
        </div>
        {!expanded && (
          <div className="font-mono text-[10px] text-system-text-dim line-clamp-1">
            {skill.currentEffect || skill.description || '—'}
          </div>
        )}

        {/* Usage progress bar — always visible */}
        <UsageBar usageCount={usageCount} rank={rank} />
      </div>

      {expanded && (
        <div className="border-t border-system-border p-3 space-y-2 bg-system-panel">
          {skill.description && (
            <div>
              <div className="font-mono text-[9px] text-system-text-dim tracking-wider mb-1">DESCRIPTION</div>
              <div className="font-mono text-[10px] text-system-text leading-relaxed">{skill.description}</div>
            </div>
          )}
          {skill.currentEffect && (
            <div>
              <div className="font-mono text-[9px] text-system-text-dim tracking-wider mb-1">CURRENT EFFECT</div>
              <div className="font-mono text-[10px] text-system-blue leading-relaxed">{skill.currentEffect}</div>
            </div>
          )}
          {skill.growthCondition && (
            <div>
              <div className="font-mono text-[9px] text-system-text-dim tracking-wider mb-1">GROWTH CONDITION</div>
              <div className="font-mono text-[10px] text-system-text-dim leading-relaxed">{skill.growthCondition}</div>
            </div>
          )}
          {skill.mutationPotential && (
            <div>
              <div className="font-mono text-[9px] text-system-text-dim tracking-wider mb-1">MUTATION POTENTIAL</div>
              <div className="font-mono text-[10px] text-system-gold leading-relaxed">{skill.mutationPotential}</div>
            </div>
          )}
          {skill.riskFactor && (
            <div>
              <div className="font-mono text-[9px] text-system-text-dim tracking-wider mb-1">RISK FACTOR</div>
              <div className="font-mono text-[10px] text-system-red leading-relaxed">{skill.riskFactor}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SkillDirectory({ skills }) {
  if (!skills || skills.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="font-mono text-xs text-system-text-dim">[ NO SKILLS ON RECORD ]</div>
          <div className="font-mono text-[10px] text-system-muted">
            Abilities will appear here as they are acquired.
          </div>
        </div>
      </div>
    );
  }

  const active = skills.filter((s) => s.type === 'Active');
  const passive = skills.filter((s) => s.type === 'Passive');
  const conditional = skills.filter((s) => s.type === 'Conditional');
  const other = skills.filter((s) => !['Active', 'Passive', 'Conditional'].includes(s.type));

  return (
    <div className="h-full overflow-y-auto p-3 space-y-4">
      {active.length > 0 && (
        <div>
          <div className="font-mono text-[9px] text-system-blue tracking-widest mb-2">ACTIVE</div>
          <div className="space-y-2">
            {active.map((s, i) => <SkillCard key={i} skill={s} />)}
          </div>
        </div>
      )}
      {passive.length > 0 && (
        <div>
          <div className="font-mono text-[9px] text-system-green tracking-widest mb-2">PASSIVE</div>
          <div className="space-y-2">
            {passive.map((s, i) => <SkillCard key={i} skill={s} />)}
          </div>
        </div>
      )}
      {conditional.length > 0 && (
        <div>
          <div className="font-mono text-[9px] text-system-gold tracking-widest mb-2">CONDITIONAL</div>
          <div className="space-y-2">
            {conditional.map((s, i) => <SkillCard key={i} skill={s} />)}
          </div>
        </div>
      )}
      {other.length > 0 && (
        <div>
          <div className="font-mono text-[9px] text-system-text-dim tracking-widest mb-2">OTHER</div>
          <div className="space-y-2">
            {other.map((s, i) => <SkillCard key={i} skill={s} />)}
          </div>
        </div>
      )}
    </div>
  );
}
