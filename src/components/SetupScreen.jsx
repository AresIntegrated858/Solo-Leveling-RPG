import React, { useState } from 'react';

export default function SetupScreen({ onSubmit }) {
  const [apiKey, setApiKey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setIsVerifying(true);
    setError('');

    const result = await onSubmit(apiKey.trim());

    if (!result.success) {
      setError(result.error || 'Verification failed.');
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex items-center justify-center w-screen h-screen bg-system-bg">
      <div className="w-full max-w-md p-8 space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="font-mono text-[10px] tracking-widest text-system-text-dim uppercase">
            ══════ SYSTEM ══════
          </div>
          <h1 className="font-mono text-2xl text-system-gold tracking-wider">
            SOLO LEVELING SYSTEM
          </h1>
          <p className="font-mono text-xs text-system-text-dim tracking-widest mt-2">
            Hunter Registration Required
          </p>
        </div>

        {/* Key entry */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="system-window p-4 space-y-4">
            <div className="system-header -mx-4 -mt-4 mb-3">API KEY CONFIGURATION</div>

            <div className="font-mono text-xs text-system-text-dim space-y-1">
              <p>To initialize the simulation, provide your OpenAI API key.</p>
              <p>The key is stored securely on your local machine and never transmitted elsewhere.</p>
            </div>

            <div className="space-y-2">
              <label className="font-mono text-xs text-system-text-dim block">
                OPENAI API KEY
              </label>
              <div className="relative flex items-center border border-system-border bg-system-bg">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1 bg-transparent font-mono text-sm text-system-text outline-none px-3 py-2 pr-10"
                  placeholder="sk-..."
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 font-mono text-[10px] text-system-text-dim hover:text-system-blue transition-colors"
                  tabIndex={-1}
                >
                  {showKey ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            {error && (
              <div className="font-mono text-xs text-system-red border border-system-red border-opacity-30 bg-red-950 bg-opacity-20 px-3 py-2">
                [ SYSTEM ERROR ] {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!apiKey.trim() || isVerifying}
            className="w-full btn-primary py-3 text-sm"
          >
            {isVerifying ? '[ VERIFYING... ]' : 'INITIALIZE SYSTEM'}
          </button>
        </form>

        <div className="font-mono text-[10px] text-system-text-dim text-center leading-relaxed">
          Your API key is stored locally using encrypted system storage.<br />
          It is never logged, transmitted, or exposed.
        </div>
      </div>
    </div>
  );
}
