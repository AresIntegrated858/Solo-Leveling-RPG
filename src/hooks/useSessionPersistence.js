// useSessionPersistence — auto-save and session lifecycle management

import { useEffect, useRef, useCallback } from 'react';
import { saveAll } from '../utils/fileManager';

export function useSessionPersistence({
  gameState,
  isGameActive,
  autoSaveIntervalMs = 5 * 60 * 1000, // 5 minutes default
  onSaveStatusChange,
}) {
  const intervalRef = useRef(null);
  const lastSaveRef = useRef(null);
  const isSavingRef = useRef(false);

  const triggerSave = useCallback(async (narrativeSummary = '') => {
    if (isSavingRef.current) return;
    if (!gameState) return;

    isSavingRef.current = true;
    onSaveStatusChange?.('saving');

    try {
      await saveAll({ ...gameState, narrativeSummary });
      lastSaveRef.current = Date.now();
      onSaveStatusChange?.('saved');
    } catch (err) {
      console.error('useSessionPersistence: save failed', err);
      onSaveStatusChange?.('error');
    } finally {
      isSavingRef.current = false;
    }
  }, [gameState, onSaveStatusChange]);

  // Auto-save interval
  useEffect(() => {
    if (!isGameActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      triggerSave('Auto-save checkpoint.');
    }, autoSaveIntervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isGameActive, autoSaveIntervalMs, triggerSave]);

  // Save before app close
  useEffect(() => {
    const handleBeforeClose = () => {
      triggerSave('Session ended — application closed.');
    };

    window.electronAPI?.app.onBeforeClose(handleBeforeClose);
    return () => {
      window.electronAPI?.app.removeBeforeClose(handleBeforeClose);
    };
  }, [triggerSave]);

  return { triggerSave };
}
