// ShadowArmyPanel — two-tier shadow roster (GENERALS / ARMY / FALLEN)
// Generals: full cards with personality, promotion, kill count, assignment
// Army: compact by creature type with count and deployment state
// DOMAIN counter always visible

import React, { useState } from 'react';
import { shadowCapacityFromINT } from '../constants/defaultState';

const GRADE_ORDER = ['Private', 'Soldier', 'Elite', 'Knight', 'Commander', 'General', 'Marshal', 'Sovereign'];

const GRADE_COLORS = {
  Private:    { border: '#2a3a5a', text: '#6a8aaa', glow: 'rgba(74,144,217,0.12)',  badge: '#1a2a3a' },
  Soldier:    { border: '#3a4a3a', text: '#6a9a6a', glow: 'rgba(39,174,96,0.12)',   badge: '#1a2a1a' },
  Elite:      { border: '#4a3a5a', text: '#9a7ab0', glow: 'rgba(138,90,170,0.12)',  badge: '#2a1a3a' },
  Knight:     { border: '#4a4a2a', text: '#b0a050', glow: 'rgba(176,160,80,0.12)',  badge: '#2a2a1a' },
  Commander:  { border: '#5a3a3a', text: '#c07060', glow: 'rgba(192,112,96,0.12)',  badge: '#3a1a1a' },
  General:    { border: '#6a4a2a', text: '#d0a060', glow: 'rgba(208,160,96,0.14)',  badge: '#4a2a1a' },
  Marshal:    { border: '#7a5a2a', text: '#e0c070', glow: 'rgba(224,192,112,0.18)', badge: '#5a3a1a' },
  Sovereign:  { border: '#C8A951', text: '#C8A951', glow: 'rgba(200,169,81,0.25)',  badge: '#3a2a08' },
};

const PERSONALITY_COLORS = {
  prideful:  { text: '#c07060', bg: 'rgba(192,112,96,0.15)' },
  silent:    { text: '#6a8aaa', bg: 'rgba(74,144,217,0.12)' },
  berserker: { text: '#d04040', bg: 'rgba(208,64,64,0.15)' },
  cautious:  { text: '#6a9a6a', bg: 'rgba(39,174,96,0.12)' },
  loyal:     { text: '#b0a050', bg: 'rgba(176,160,80,0.12)' },
};

const DEPLOY_LABELS = {
  standby:  { text: 'STANDBY',  color: '#4a5a6a' },
  deployed: { text: 'DEPLOYED', color: '#27ae60' },
  assigned: { text: 'ASSIGNED', color: '#b0a050' },
};

function getGradeColor(grade) {
  return GRADE_COLORS[grade] || GRADE_COLORS.Private;
}

// Grade rank pip display
function GradePips({ grade }) {
  const colors = getGradeColor(grade);
  const idx = Math.max(GRADE_ORDER.indexOf(grade), 0);
  return (
    <div className="flex items-end gap-0.5">
      {GRADE_ORDER.slice(0, idx + 1).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: i === idx ? 9 : 5,
            background: i === idx ? colors.text : '#2a2a3a',
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}

// ─── GENERAL CARD ────────────────────────────────────────────────────────────
function GeneralCard({ shadow, expanded, onToggle }) {
  const colors = getGradeColor(shadow.grade);
  const pers = (shadow.personality || '').toLowerCase();
  const persStyle = PERSONALITY_COLORS[pers] || null;
  const deployInfo = DEPLOY_LABELS[shadow.deploymentState] || DEPLOY_LABELS.standby;
  const promotionPct = Math.min(100, Math.round(((shadow.promotionXP || 0) % 10) * 10));

  return (
    <div
      className="mb-2 cursor-pointer transition-all duration-200"
      style={{
        border: `1px solid ${colors.border}`,
        background: `linear-gradient(135deg, ${colors.glow}, rgba(8,8,12,0.95))`,
        boxShadow: expanded ? `0 0 16px ${colors.glow}` : 'none',
      }}
      onClick={onToggle}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 gap-2">
        {/* Left: status dot + name */}
        <div className="flex items-center gap-2 min-w-0">
          <div style={{
            width: 6, height: 6, borderRadius: '50%', flex: '0 0 auto',
            background: colors.text,
            boxShadow: `0 0 5px ${colors.text}`,
          }} />
          <span className="font-mono text-xs font-semibold tracking-wider truncate" style={{ color: colors.text }}>
            {shadow.customName || shadow.name || '—'}
          </span>
          {/* GENERAL badge */}
          <span
            className="flex-shrink-0 font-mono text-[8px] tracking-widest px-1 py-px"
            style={{ color: colors.text, background: colors.badge, border: `1px solid ${colors.border}` }}
          >
            GEN
          </span>
        </div>
        {/* Right: grade + pips */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <GradePips grade={shadow.grade} />
          <span
            className="font-mono text-[9px] tracking-widest px-1.5 py-0.5"
            style={{ color: colors.text, background: colors.badge, border: `1px solid ${colors.border}` }}
          >
            {(shadow.grade || 'PRIVATE').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Sub-row: deployment + personality */}
      <div className="flex items-center gap-2 px-3 pb-2">
        <span className="font-mono text-[9px] tracking-widest" style={{ color: deployInfo.color }}>
          {deployInfo.text}
        </span>
        {persStyle && (
          <span
            className="font-mono text-[8px] tracking-widest px-1.5 py-px rounded-sm"
            style={{ color: persStyle.text, background: persStyle.bg }}
          >
            {pers.toUpperCase()}
          </span>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: colors.border + '80' }}>
          <div className="pt-2 space-y-1.5">
            {shadow.origin && (
              <div className="flex gap-2">
                <span className="font-mono text-[9px] text-system-muted w-16 flex-shrink-0">ORIGIN</span>
                <span className="font-mono text-[9px] text-system-text">{shadow.origin}</span>
              </div>
            )}
            {shadow.extractedAt && (
              <div className="flex gap-2">
                <span className="font-mono text-[9px] text-system-muted w-16 flex-shrink-0">SITE</span>
                <span className="font-mono text-[9px] text-system-text">{shadow.extractedAt}</span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="font-mono text-[9px] text-system-muted w-16 flex-shrink-0">KILLS</span>
              <span className="font-mono text-[9px]" style={{ color: colors.text }}>{shadow.killCount || 0}</span>
            </div>
            {shadow.assignedTask && (
              <div className="flex gap-2">
                <span className="font-mono text-[9px] text-system-muted w-16 flex-shrink-0">TASK</span>
                <span className="font-mono text-[9px] text-system-text leading-relaxed">{shadow.assignedTask}</span>
              </div>
            )}
          </div>

          {/* Promotion bar */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="font-mono text-[8px] text-system-muted tracking-widest">PROMOTION</span>
              <span className="font-mono text-[8px]" style={{ color: colors.text }}>{shadow.promotionXP || 0} deployments</span>
            </div>
            <div className="h-1 bg-black/60 rounded-sm overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${promotionPct}%`, background: colors.text, opacity: 0.8 }}
              />
            </div>
          </div>

          {shadow.notes && (
            <p className="font-mono text-[9px] leading-relaxed pt-1 border-t" style={{ borderColor: colors.border + '60', color: colors.text, opacity: 0.7 }}>
              {shadow.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ARMY ROW — compact unit entry ───────────────────────────────────────────
function ArmyRow({ shadow }) {
  const colors = getGradeColor(shadow.grade);
  const deployInfo = DEPLOY_LABELS[shadow.deploymentState] || DEPLOY_LABELS.standby;
  const count = shadow.armyCount || 1;

  return (
    <div
      className="flex items-center justify-between px-3 py-1.5 mb-1"
      style={{
        border: `1px solid ${colors.border}`,
        background: 'rgba(8,8,12,0.7)',
        opacity: 0.9,
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: colors.text, opacity: 0.8, flex: '0 0 auto' }} />
        <span className="font-mono text-[10px] truncate" style={{ color: colors.text }}>
          {shadow.name || '—'}
        </span>
        {count > 1 && (
          <span className="font-mono text-[9px] text-system-muted">×{count}</span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="font-mono text-[8px] tracking-widest" style={{ color: deployInfo.color }}>
          {deployInfo.text}
        </span>
        <span
          className="font-mono text-[8px] px-1"
          style={{ color: colors.text, background: colors.badge, border: `1px solid ${colors.border}` }}
        >
          {(shadow.grade || 'PVT').slice(0, 3).toUpperCase()}
        </span>
      </div>
    </div>
  );
}

// ─── FALLEN ROW ───────────────────────────────────────────────────────────────
function FallenRow({ shadow }) {
  return (
    <div
      className="flex items-center justify-between px-3 py-1.5 mb-1"
      style={{ border: '1px solid #1a1a2a', background: 'rgba(8,8,12,0.4)', opacity: 0.5 }}
    >
      <div className="flex items-center gap-2">
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3a3a4a' }} />
        <span className="font-mono text-[10px] text-system-muted line-through">
          {shadow.customName || shadow.name || '—'}
        </span>
        {shadow.isGeneral && (
          <span className="font-mono text-[8px] text-system-muted">[GEN]</span>
        )}
      </div>
      <span className="font-mono text-[8px] text-system-red/70 tracking-widest">FALLEN</span>
    </div>
  );
}

// ─── DOMAIN COUNTER ───────────────────────────────────────────────────────────
function DomainCounter({ active, max }) {
  const pct = max > 0 ? Math.min(1, active / max) : 0;
  const barColor = pct >= 0.9 ? '#C0392B' : pct >= 0.7 ? '#b0a050' : '#4A90D9';

  return (
    <div className="px-3 py-2 border-b border-system-border">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[9px] text-system-muted tracking-[0.25em]">DOMAIN</span>
        <span className="font-mono text-[10px] font-bold" style={{ color: barColor }}>
          {active} <span className="text-system-muted">/ {max}</span>
        </span>
      </div>
      <div className="h-1 bg-black/60 rounded-sm overflow-hidden" style={{ border: '1px solid #1a2a3a' }}>
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${pct * 100}%`, background: barColor, opacity: 0.85 }}
        />
      </div>
    </div>
  );
}

// ─── MAIN PANEL ───────────────────────────────────────────────────────────────
export default function ShadowArmyPanel({ shadowArmy = [], playerState = {} }) {
  const [expandedKey, setExpandedKey] = useState(null);

  const allActive = shadowArmy.filter((s) => s.status !== 'lost');
  const fallen    = shadowArmy.filter((s) => s.status === 'lost');
  const generals  = allActive.filter((s) => s.isGeneral)
    .sort((a, b) => GRADE_ORDER.indexOf(b.grade) - GRADE_ORDER.indexOf(a.grade));
  const army      = allActive.filter((s) => !s.isGeneral)
    .sort((a, b) => GRADE_ORDER.indexOf(b.grade) - GRADE_ORDER.indexOf(a.grade));

  const intStat = playerState?.stats?.INT || 10;
  const maxDomain = shadowCapacityFromINT(intStat);
  const deployedCount = allActive.filter(
    (s) => s.deploymentState === 'deployed' || s.deploymentState === 'assigned',
  ).length;

  const shadowProtocolUnlocked = playerState?.shadowProtocolUnlocked;

  // LOCKED state
  if (!shadowProtocolUnlocked && shadowArmy.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="system-header flex-shrink-0 flex items-center justify-between">
          <span>SOVEREIGN'S DOMAIN</span>
          <span className="text-system-muted text-[9px]">LOCKED</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center space-y-3">
          <div className="font-mono text-3xl" style={{ color: '#1e2a3a', textShadow: '0 0 20px rgba(74,144,217,0.08)' }}>
            ◈
          </div>
          <div className="font-mono text-[10px] text-system-muted tracking-widest">
            [ PROTOCOL LOCKED ]
          </div>
          <div className="font-mono text-[9px] text-system-muted/60 leading-relaxed max-w-[180px]">
            Shadow Extraction has not yet manifested. Survive what must be survived.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="system-header flex-shrink-0 flex items-center justify-between">
        <span>SOVEREIGN'S DOMAIN</span>
        <span className="text-[9px]" style={{ color: allActive.length > 0 ? '#4A90D9' : '#4a5a6a' }}>
          {allActive.length} shadow{allActive.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* DOMAIN bar */}
      <DomainCounter active={deployedCount} max={maxDomain} />

      <div className="flex-1 overflow-y-auto p-2">

        {/* ── GENERALS ── */}
        {generals.length > 0 && (
          <>
            <div className="font-mono text-[9px] tracking-[0.3em] text-system-muted px-1 py-1.5 mb-1 flex items-center gap-2">
              <span>— GENERALS</span>
              <span className="text-[#d0a060]">{generals.length}</span>
              <span>—</span>
            </div>
            {generals.map((s) => {
              const key = s.customName || s.name;
              return (
                <GeneralCard
                  key={key}
                  shadow={s}
                  expanded={expandedKey === key}
                  onToggle={() => setExpandedKey(expandedKey === key ? null : key)}
                />
              );
            })}
          </>
        )}

        {/* ── ARMY ── */}
        {army.length > 0 && (
          <>
            <div className="font-mono text-[9px] tracking-[0.3em] text-system-muted px-1 py-1.5 mb-1 flex items-center gap-2 mt-1">
              <span>— ARMY</span>
              <span style={{ color: '#6a8aaa' }}>{army.reduce((n, s) => n + (s.armyCount || 1), 0)}</span>
              <span>—</span>
            </div>
            {army.map((s, i) => (
              <ArmyRow key={s.name + i} shadow={s} />
            ))}
          </>
        )}

        {/* Empty state (protocol unlocked but no shadows yet) */}
        {generals.length === 0 && army.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
            <div className="font-mono text-2xl" style={{ color: '#1e2a3a' }}>◈</div>
            <div className="font-mono text-[9px] text-system-muted/60 tracking-wider">
              No shadows extracted yet.
            </div>
          </div>
        )}

        {/* ── FALLEN ── */}
        {fallen.length > 0 && (
          <>
            <div className="font-mono text-[9px] tracking-[0.3em] text-system-red/50 px-1 py-1.5 mb-1 mt-2 border-t border-system-border">
              — FALLEN {fallen.length} —
            </div>
            {fallen.map((s, i) => (
              <FallenRow key={(s.customName || s.name) + 'fallen' + i} shadow={s} />
            ))}
          </>
        )}
      </div>

      {/* Footer: INT → capacity hint */}
      <div className="flex-shrink-0 px-3 py-1.5 border-t border-system-border">
        <div className="font-mono text-[8px] text-system-muted/50 text-center tracking-widest">
          CAPACITY SCALES WITH INT · CURRENT MAX {maxDomain}
        </div>
      </div>
    </div>
  );
}
