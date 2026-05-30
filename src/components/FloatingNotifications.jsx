// FloatingNotifications — animated toast overlay for XP gains, stat changes, etc.
// Renders over the center panel; toasts float upward and fade out automatically.

import React from 'react';

const TYPE_STYLES = {
  xp:     { color: '#C8A951', glow: 'rgba(200,169,81,0.5)',   prefix: '+', suffix: ' XP' },
  stat:   { color: '#4A90D9', glow: 'rgba(74,144,217,0.5)',   prefix: '',  suffix: '' },
  level:  { color: '#C8A951', glow: 'rgba(200,169,81,0.7)',   prefix: '',  suffix: '' },
  skill:  { color: '#9a7ab0', glow: 'rgba(138,90,170,0.5)',   prefix: '',  suffix: '' },
  shadow: { color: '#4A90D9', glow: 'rgba(74,144,217,0.5)',   prefix: '',  suffix: '' },
  hp:     { color: '#C0392B', glow: 'rgba(192,57,43,0.5)',    prefix: '',  suffix: '' },
  heal:   { color: '#27ae60', glow: 'rgba(39,174,96,0.5)',    prefix: '+', suffix: ' HP' },
  loot:   { color: '#4abe8a', glow: 'rgba(74,190,138,0.5)',   prefix: '',  suffix: '' },
  npc:      { color: '#e87d7d', glow: 'rgba(232,125,125,0.5)',  prefix: '', suffix: '' },
  rival:    { color: '#f0a500', glow: 'rgba(240,165,0,0.5)',   prefix: '', suffix: '' },
  contract: { color: '#4abe8a', glow: 'rgba(74,190,138,0.5)',  prefix: '', suffix: '' },
  overflow: { color: '#C0392B', glow: 'rgba(192,57,43,0.7)',   prefix: '', suffix: '' },
  expense:  { color: '#e87d7d', glow: 'rgba(232,125,125,0.4)', prefix: '', suffix: '' },
};

function FloatingToast({ notification }) {
  const { text, type } = notification;
  const style = TYPE_STYLES[type] || TYPE_STYLES.xp;
  const isLevel = type === 'level';

  return (
    <div
      className="absolute font-mono font-bold tracking-widest whitespace-nowrap select-none pointer-events-none"
      style={{
        left: '50%',
        bottom: '30%',
        transform: 'translateX(-50%)',
        color: style.color,
        textShadow: `0 0 10px ${style.glow}, 0 0 24px ${style.glow}`,
        animation: 'floatUp 2.8s ease-out forwards',
        fontSize: isLevel ? '15px' : '11px',
        letterSpacing: '0.18em',
        zIndex: 60,
      }}
    >
      {style.prefix}{text}{style.suffix}
    </div>
  );
}

export default function FloatingNotifications({ notifications }) {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 55 }}
      aria-hidden="true"
    >
      {notifications.map((n) => (
        <FloatingToast key={n.id} notification={n} />
      ))}
    </div>
  );
}
