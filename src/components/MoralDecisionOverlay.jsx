// MoralDecisionOverlay — Phase 4 time-pressure moral/strategic choice
// Full-screen overlay with countdown. NOT combat — moral weight only.
// Fires when Claude outputs [ MORAL DECISION ]. Timer defaults to 30s.

import React, { useState, useEffect, useRef } from 'react';

export default function MoralDecisionOverlay({ decision, onChoice }) {
  const [timeLeft, setTimeLeft] = useState(decision?.timer ?? 30);
  const timerRef = useRef(null);
  const defaultFiredRef = useRef(false);

  useEffect(() => {
    if (!decision) return;
    setTimeLeft(decision.timer ?? 30);
    defaultFiredRef.current = false;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!defaultFiredRef.current) {
            defaultFiredRef.current = true;
            onChoice(`DEFAULT: ${decision.defaultOption}`);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [decision]);

  if (!decision) return null;

  const handleChoice = (optionText) => {
    clearInterval(timerRef.current);
    defaultFiredRef.current = true;
    onChoice(optionText);
  };

  const timerPct = ((timeLeft / (decision.timer ?? 30)) * 100);
  const timerColor = timeLeft > 15 ? '#4A90D9' : timeLeft > 8 ? '#C8A951' : '#E05252';

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-auto"
      style={{ background: 'rgba(6,6,12,0.92)', zIndex: 80 }}
    >
      <div
        className="w-full max-w-sm mx-6 p-5 space-y-4"
        style={{ border: '1px solid rgba(224,82,82,0.4)', boxShadow: '0 0 40px rgba(224,82,82,0.12)' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="font-mono text-[9px] tracking-[0.25em] text-system-red">
            ▶ MORAL DECISION
          </div>
          <div
            className="font-mono text-[11px] font-bold tabular-nums"
            style={{ color: timerColor }}
          >
            {timeLeft}s
          </div>
        </div>

        {/* Timer bar */}
        <div className="h-[2px] bg-system-border" style={{ position: 'relative' }}>
          <div
            className="h-full transition-all duration-1000"
            style={{ width: `${timerPct}%`, background: timerColor }}
          />
        </div>

        {/* Situation */}
        <p className="font-mono text-[11px] text-system-text leading-relaxed">
          {decision.situation}
        </p>

        {/* Stakes */}
        {decision.stakes && (
          <p className="font-mono text-[10px] leading-relaxed" style={{ color: '#9aa0b8' }}>
            {decision.stakes}
          </p>
        )}

        {/* Options */}
        <div className="space-y-2 pt-1">
          {decision.options.map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleChoice(opt.text)}
              className="w-full text-left font-mono text-[10px] px-3 py-2 transition-all"
              style={{
                border: '1px solid rgba(74,144,217,0.4)',
                background: 'rgba(74,144,217,0.06)',
                color: '#c8c8d4',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(74,144,217,0.14)'; e.currentTarget.style.borderColor = 'rgba(74,144,217,0.7)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(74,144,217,0.06)'; e.currentTarget.style.borderColor = 'rgba(74,144,217,0.4)'; }}
            >
              <span style={{ color: '#4A90D9', marginRight: 8 }}>{opt.key}.</span>
              {opt.text}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="font-mono text-[9px] text-system-muted text-center pt-1">
          DEFAULT: {decision.defaultOption} — activates when timer expires
        </div>
      </div>
    </div>
  );
}
