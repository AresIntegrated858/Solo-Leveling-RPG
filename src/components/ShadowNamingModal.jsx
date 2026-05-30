import React, { useState, useEffect, useRef } from 'react';

/**
 * ShadowNamingModal — fires after a successful General-tier extraction.
 *
 * Props:
 *   shadow      — the freshly extracted shadow object
 *   onConfirm   — (chosenName) → void
 *   onCancel    — () → void  (player can skip naming; shadow keeps origin name)
 */
export default function ShadowNamingModal({ shadow, onConfirm, onCancel }) {
  const [inputName, setInputName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus the input when the modal opens
    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, []);

  if (!shadow) return null;

  const handleConfirm = () => {
    const trimmed = inputName.trim();
    if (!trimmed) {
      setError('A name is required.');
      return;
    }
    if (trimmed.length > 40) {
      setError('Name must be 40 characters or fewer.');
      return;
    }
    onConfirm(trimmed);
  };

  const handleSkip = () => {
    // Use the origin name as the shadow's name
    onCancel();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') handleSkip();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85" />

      {/* Modal */}
      <div
        className="relative z-10 w-[480px] border border-system-blue/60 bg-system-bg shadow-2xl"
        style={{ boxShadow: '0 0 60px rgba(30,144,255,0.15), 0 0 120px rgba(30,144,255,0.07)' }}
      >
        {/* Header */}
        <div className="border-b border-system-blue/40 px-6 py-4">
          <div className="text-[10px] tracking-[0.35em] text-system-blue/70 uppercase mb-1">
            Shadow Protocol — General Extraction
          </div>
          <div className="text-lg font-bold tracking-wider text-system-blue">
            SHADOW EXTRACTION COMPLETE
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Origin info */}
          <div className="mb-5 border border-system-blue/20 bg-system-blue/5 px-4 py-3">
            <div className="text-xs text-system-muted mb-1">Extracted entity</div>
            <div className="text-sm text-system-text font-semibold">
              {shadow.origin || shadow.name}
            </div>
            {shadow.grade && (
              <div className="text-xs text-system-blue/80 mt-1">
                Grade assigned: {shadow.grade}
              </div>
            )}
          </div>

          {/* Flavour */}
          <p className="text-xs text-system-muted leading-relaxed mb-5">
            This entity carries residual will. A name binds it more completely to your domain.
            Name it, or leave it as what it was.
          </p>

          {/* Input */}
          <div className="mb-1">
            <label className="block text-[10px] tracking-[0.3em] text-system-blue/70 uppercase mb-2">
              Assign Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={inputName}
              onChange={(e) => { setInputName(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              maxLength={40}
              placeholder={shadow.origin || shadow.name || 'Enter a name…'}
              className="w-full bg-black/60 border border-system-blue/40 px-4 py-2.5 text-sm text-system-text placeholder-system-muted/50 focus:outline-none focus:border-system-blue/80 focus:bg-black/80 transition-colors"
            />
            {error && (
              <div className="text-system-red text-xs mt-1">{error}</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-system-blue/30 px-6 py-4 flex justify-between items-center gap-3">
          <button
            onClick={handleSkip}
            className="text-xs text-system-muted hover:text-system-text transition-colors uppercase tracking-widest"
          >
            Skip — keep origin name
          </button>
          <button
            onClick={handleConfirm}
            disabled={!inputName.trim()}
            className="px-5 py-2 text-xs font-bold tracking-[0.25em] uppercase bg-system-blue/20 border border-system-blue/60 text-system-blue hover:bg-system-blue/30 hover:border-system-blue disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Bind Name
          </button>
        </div>
      </div>
    </div>
  );
}
