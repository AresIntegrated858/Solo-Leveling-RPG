// Settings Panel — API key management, preferences, new campaign, export

import React, { useState } from 'react';
import { exportCampaignLog } from '../utils/fileManager';

export default function SettingsPanel({
  apiKey,
  autoSaveInterval,
  onAutoSaveIntervalChange,
  onNewCampaign,
  conversationHistory,
  playerState,
  sessionMeta,
  onClose,
  onAPIKeyUpdate,
}) {
  const [newKey, setNewKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState('');
  const [showNewCampaignConfirm, setShowNewCampaignConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [exportStatus, setExportStatus] = useState('');

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 8)}${'•'.repeat(Math.max(0, apiKey.length - 12))}${apiKey.slice(-4)}`
    : 'Not configured';

  const handleUpdateKey = async () => {
    if (!newKey.trim()) return;
    await onAPIKeyUpdate(newKey.trim());
    setKeyStatus('API key updated.');
    setNewKey('');
    setTimeout(() => setKeyStatus(''), 3000);
  };

  const handleExport = async () => {
    setExportStatus('exporting');
    const success = await exportCampaignLog(conversationHistory, playerState, sessionMeta);
    setExportStatus(success ? 'exported' : 'cancelled');
    setTimeout(() => setExportStatus(''), 3000);
  };

  const handleNewCampaign = () => {
    if (confirmInput === 'CONFIRM') {
      onClose();
      onNewCampaign();
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-80">
      <div
        className="system-window w-full mx-6"
        style={{ maxWidth: '520px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="system-header flex items-center justify-between flex-shrink-0">
          <span>SYSTEM SETTINGS</span>
          <button
            onClick={onClose}
            className="font-mono text-[10px] text-system-text-dim hover:text-system-text"
          >
            [CLOSE]
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* API Key */}
          <div className="space-y-3">
            <div className="font-mono text-[9px] text-system-text-dim tracking-widest border-b border-system-border pb-2">
              API KEY MANAGEMENT
            </div>
            <div className="font-mono text-[10px] text-system-text-dim">
              Current: <span className="text-system-blue">{maskedKey}</span>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="New API key..."
                  className="w-full bg-system-bg border border-system-border font-mono text-xs text-system-text outline-none px-3 py-2 focus:border-system-blue"
                  autoComplete="off"
                />
              </div>
              <button
                onClick={() => setShowKey(!showKey)}
                className="btn-system text-[10px] px-2"
              >
                {showKey ? 'HIDE' : 'SHOW'}
              </button>
              <button
                onClick={handleUpdateKey}
                disabled={!newKey.trim()}
                className="btn-primary text-[10px] px-3 disabled:opacity-30"
              >
                UPDATE
              </button>
            </div>
            {keyStatus && (
              <div className="font-mono text-[10px] text-system-green">{keyStatus}</div>
            )}
          </div>

          {/* Auto-save interval */}
          <div className="space-y-3">
            <div className="font-mono text-[9px] text-system-text-dim tracking-widest border-b border-system-border pb-2">
              AUTO-SAVE INTERVAL
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-system-text-dim">Every</span>
              <div className="flex gap-2">
                {[1, 2, 5, 10].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => onAutoSaveIntervalChange(mins)}
                    className={`font-mono text-[10px] px-3 py-1 border transition-colors ${
                      autoSaveInterval === mins
                        ? 'border-system-blue text-system-blue'
                        : 'border-system-border text-system-text-dim hover:border-system-blue'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Export */}
          <div className="space-y-3">
            <div className="font-mono text-[9px] text-system-text-dim tracking-widest border-b border-system-border pb-2">
              EXPORT
            </div>
            <div className="font-mono text-[10px] text-system-text-dim">
              Export the full campaign transcript as a .txt file.
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                disabled={exportStatus === 'exporting'}
                className="btn-system text-[10px] px-4 py-2 disabled:opacity-40"
              >
                {exportStatus === 'exporting'
                  ? 'EXPORTING...'
                  : exportStatus === 'exported'
                  ? 'EXPORTED ✓'
                  : 'EXPORT CAMPAIGN LOG'}
              </button>
            </div>
          </div>

          {/* New Campaign */}
          <div className="space-y-3">
            <div className="font-mono text-[9px] text-system-red tracking-widest border-b border-system-red border-opacity-20 pb-2">
              CAMPAIGN RESET
            </div>

            {!showNewCampaignConfirm ? (
              <>
                <div className="font-mono text-[10px] text-system-text-dim">
                  Archive the current campaign and begin a new Hunter registration.
                  Current save data will be preserved in the archive.
                </div>
                <button
                  onClick={() => setShowNewCampaignConfirm(true)}
                  className="btn-danger text-[10px] px-4 py-2"
                >
                  NEW CAMPAIGN
                </button>
              </>
            ) : (
              <div className="system-block system-block-red space-y-3">
                <div className="font-mono text-xs text-system-red">
                  [ WARNING ] This will archive your current campaign and reset all progress.
                </div>
                <div className="font-mono text-[10px] text-system-text-dim">
                  Type <span className="text-system-text">CONFIRM</span> to proceed:
                </div>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value.toUpperCase())}
                  className="w-full bg-transparent border border-system-border font-mono text-sm text-system-text outline-none px-3 py-2"
                  placeholder="CONFIRM"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleNewCampaign}
                    disabled={confirmInput !== 'CONFIRM'}
                    className="flex-1 btn-danger text-[10px] py-2 disabled:opacity-30"
                  >
                    ARCHIVE & RESET
                  </button>
                  <button
                    onClick={() => { setShowNewCampaignConfirm(false); setConfirmInput(''); }}
                    className="flex-1 btn-system text-[10px] py-2"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
