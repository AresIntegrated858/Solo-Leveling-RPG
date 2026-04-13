import React, { useEffect, useState } from 'react';

export default function LoadingScreen() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const i = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 400);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="flex items-center justify-center w-screen h-screen bg-system-bg">
      <div className="text-center space-y-4">
        <div className="font-mono text-[10px] tracking-widest text-system-text-dim uppercase mb-8">
          ══════ SYSTEM ══════
        </div>
        <h1 className="font-mono text-3xl text-system-gold tracking-widest gold-shimmer">
          SOLO LEVELING SYSTEM
        </h1>
        <div className="font-mono text-xs text-system-blue tracking-widest mt-4">
          [ INITIALIZING{dots} ]
        </div>
        <div className="w-48 mx-auto mt-6">
          <div className="stat-bar-track">
            <div
              className="stat-bar-fill bg-system-blue"
              style={{ width: '100%', animation: 'loadBar 1.5s ease-in-out infinite alternate' }}
            />
          </div>
        </div>
        <style>{`
          @keyframes loadBar {
            from { width: 20%; opacity: 0.5; }
            to { width: 100%; opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}
