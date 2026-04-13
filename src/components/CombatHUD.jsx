// Combat HUD — slides in as overlay during combat encounters

import React from 'react';

function ThreatBadge({ level }) {
  if (!level) return null;
  const l = level.toLowerCase();
  let color = 'text-system-text-dim border-system-border';
  if (l.includes('critical') || l.includes('extreme')) color = 'text-system-red border-system-red';
  else if (l.includes('high') || l.includes('dangerous')) color = 'text-orange-500 border-orange-500';
  else if (l.includes('medium') || l.includes('moderate')) color = 'text-yellow-500 border-yellow-500';
  else if (l.includes('low') || l.includes('minor')) color = 'text-system-green border-system-green';

  return (
    <span className={`font-mono text-[9px] px-2 py-[1px] border ${color} bg-opacity-10`}>
      {level.toUpperCase()}
    </span>
  );
}

export default function CombatHUD({ combatData, onClose }) {
  if (!combatData) return null;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {/* Combat HUD panel - slides in from bottom */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-auto">
        <div className="system-window border-t-2 border-system-red">
          <div className="system-header flex items-center justify-between"
            style={{ borderColor: 'rgba(192,57,43,0.5)', color: '#C0392B' }}>
            <span>COMBAT INTERFACE</span>
            <button
              onClick={onClose}
              className="font-mono text-[10px] text-system-text-dim hover:text-system-text transition-colors"
            >
              [CLOSE]
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 p-3">
            {/* Enemy info */}
            <div className="space-y-2">
              <div className="font-mono text-[9px] text-system-text-dim tracking-wider">TARGET</div>
              <div className="font-mono text-sm text-system-red">{combatData.enemy || '—'}</div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-system-text-dim">Threat:</span>
                <ThreatBadge level={combatData.threatLevel} />
              </div>
              <div className="font-mono text-[10px] text-system-text-dim">
                Distance: <span className="text-system-text">{combatData.distance || '—'}</span>
              </div>
              <div className="font-mono text-[10px] text-system-text-dim">
                Condition: <span className="text-system-text">{combatData.enemyCondition || '—'}</span>
              </div>
            </div>

            {/* Player condition */}
            <div className="space-y-2">
              <div className="font-mono text-[9px] text-system-text-dim tracking-wider">YOUR CONDITION</div>
              <div className="font-mono text-[10px] space-y-1">
                <div>
                  <span className="text-system-text-dim">HP: </span>
                  <span className="text-system-red">{combatData.playerHp || '—'}</span>
                </div>
                <div>
                  <span className="text-system-text-dim">Stamina: </span>
                  <span className="text-system-green">{combatData.playerStamina || '—'}</span>
                </div>
                {combatData.injuryStatus && combatData.injuryStatus !== '—' && (
                  <div>
                    <span className="text-system-text-dim">Injuries: </span>
                    <span className="text-yellow-500">{combatData.injuryStatus}</span>
                  </div>
                )}
              </div>

              {/* Buffs/Debuffs */}
              {combatData.activeBuffs && combatData.activeBuffs.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {combatData.activeBuffs.map((b, i) => (
                    <span key={i} className="font-mono text-[9px] px-2 py-[1px] border border-system-green text-system-green bg-green-950 bg-opacity-30">
                      +{b}
                    </span>
                  ))}
                </div>
              )}
              {combatData.activeDebuffs && combatData.activeDebuffs.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {combatData.activeDebuffs.map((d, i) => (
                    <span key={i} className="font-mono text-[9px] px-2 py-[1px] border border-system-red text-system-red bg-red-950 bg-opacity-30">
                      -{d}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Available actions */}
          {combatData.availableActions && combatData.availableActions.length > 0 && (
            <div className="px-3 pb-3">
              <div className="font-mono text-[9px] text-system-text-dim tracking-wider mb-2">AVAILABLE ACTIONS</div>
              <div className="flex flex-wrap gap-2">
                {combatData.availableActions.map((action, i) => (
                  <span key={i} className="font-mono text-[10px] px-3 py-1 border border-system-border text-system-text-dim hover:border-system-blue hover:text-system-blue transition-colors cursor-default">
                    {action}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Environment */}
          {combatData.environmentalFactors && combatData.environmentalFactors.length > 0 && (
            <div className="px-3 pb-3 border-t border-system-border pt-2">
              <div className="font-mono text-[9px] text-system-text-dim tracking-wider mb-1">ENVIRONMENT</div>
              <div className="font-mono text-[10px] text-system-text-dim">
                {combatData.environmentalFactors.join(' · ')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
