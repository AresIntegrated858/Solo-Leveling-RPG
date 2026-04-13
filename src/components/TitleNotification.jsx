// Title Unlock Notification — brief overlay toast

import React, { useEffect } from 'react';

export default function TitleNotification({ titleData, onDismiss }) {
  useEffect(() => {
    if (!titleData) return;
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [titleData, onDismiss]);

  if (!titleData) return null;

  return (
    <div
      className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 cursor-pointer"
      onClick={onDismiss}
    >
      <div className="system-window border-system-gold px-6 py-4 text-center space-y-1"
        style={{ borderColor: 'rgba(200, 169, 81, 0.6)', minWidth: '300px' }}>
        <div className="font-mono text-[9px] text-system-gold tracking-widest">
          TITLE UNLOCKED
        </div>
        <div className="font-mono text-base text-system-gold gold-shimmer">
          「{titleData.title}」
        </div>
        {titleData.effect && (
          <div className="font-mono text-[10px] text-system-text-dim">
            {titleData.effect}
          </div>
        )}
        <div className="font-mono text-[9px] text-system-muted mt-2">
          Click to dismiss
        </div>
      </div>
    </div>
  );
}
