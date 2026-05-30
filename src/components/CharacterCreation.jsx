// Character Creation Wizard — 13 questions, one at a time, cinematic style
// With ambient audio and animated gate background

import React, { useState, useRef, useEffect } from 'react';
import { useClaudeAPI } from '../hooks/useClaudeAPI';
import { useAmbientAudio } from '../hooks/useAmbientAudio';
import { saveCharacterAnswers, saveSessionMeta, saveConversationHistory, savePlayerState } from '../utils/fileManager';
import { buildCharacterCreationMessage } from '../utils/promptBuilder';
import { CHARACTER_CREATION_QUESTIONS, DEFAULT_PLAYER_STATE } from '../constants/defaultState';
import { geocodeLocation } from '../utils/geocoder';
import AnimatedBackground from './AnimatedBackground';

const TOTAL = CHARACTER_CREATION_QUESTIONS.length;

export default function CharacterCreation({ apiKey, onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [currentInput, setCurrentInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingText, setGeneratingText] = useState('');
  const [error, setError] = useState('');
  const [bgOpacity, setBgOpacity] = useState(0);
  const inputRef = useRef(null);
  const { send, generateImage } = useClaudeAPI();
  const audio = useAmbientAudio();

  // Fade in background on mount
  useEffect(() => {
    const t = setTimeout(() => setBgOpacity(1), 100);
    return () => clearTimeout(t);
  }, []);

  // Start audio when player clicks BEGIN
  const handleStart = () => {
    audio.start();
    setStep(1);
  };

  // Focus input when step changes
  useEffect(() => {
    if (step > 0 && step <= TOTAL) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [step]);

  const currentQuestion = step > 0 && step <= TOTAL
    ? CHARACTER_CREATION_QUESTIONS[step - 1]
    : null;

  const handleAnswer = async () => {
    if (!currentInput.trim()) return;
    setError('');
    const qId = currentQuestion.id;
    const newAnswers = { ...answers, [qId]: currentInput.trim() };
    setAnswers(newAnswers);
    setCurrentInput('');

    if (step < TOTAL) {
      setStep(step + 1);
    } else {
      audio.fadeOut(3);
      await generateInitialState(newAnswers);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && currentQuestion?.type !== 'textarea') {
      e.preventDefault();
      handleAnswer();
    }
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleAnswer();
    }
  };

  // ── Portrait generator ─────────────────────────────────────────────────────
  // One-shot Claude call. Asks for a Solo-Leveling-style ASCII/Unicode portrait
  // bounded to the System aesthetic — high contrast, monospace-clean, head-and-
  // shoulders bust. Extracts the first fenced code block from the response so
  // any preamble or commentary is stripped automatically.
  // Generates a Hunter ID portrait using DALL-E 3.
  // Returns a base64 data URL (data:image/png;base64,...) ready to drop into an <img> tag.
  const generatePortrait = async (name, appearance) => {
    const prompt = `Solo Leveling anime/manhwa style Hunter ID card portrait of a character named ${name}. Head and shoulders bust, centered in frame, face filling most of the image. Physical appearance: ${appearance}. Art direction: match the official Solo Leveling anime adaptation aesthetic — cel-shaded illustration, cold and intense expression, sharp angular face, dark cinematic background with deep blue-purple atmospheric shadow and subtle rim lighting. Glowing or intense eyes. High contrast with strong shadows carved into the face. The mood is serious, dangerous, and solitary — a lone hunter who levels in silence. Clean portrait composition, no text, no UI overlays, no watermarks. Shoulders visible at the bottom of the frame.`;

    return await generateImage({ apiKey, prompt });
  };

  const generateInitialState = async (finalAnswers) => {
    setStep(TOTAL + 1);   // past all questions — triggers generating screen
    setIsGenerating(true);

    try {
      await saveCharacterAnswers(finalAnswers);
      await saveSessionMeta({
        sessionNumber: 1,
        totalPlayTime: 0,
        campaignStartDate: new Date().toISOString(),
        lastSaveTime: new Date().toISOString(),
      });

      // Geocode hometown from q14 so the map has coords from the start
      const hometown = finalAnswers.q14 || '';
      const hometownCoords = hometown ? await geocodeLocation(hometown) : null;

      // ── Portrait generation (q15 → ASCII/Unicode art) ──────────────────────
      // Generated FIRST so it's persisted with the player's initial state save.
      // Failures here are non-fatal — the Hunter ID Card falls back to a
      // placeholder if portrait is empty.
      let portrait = '';
      const appearance = (finalAnswers.q15 || '').trim();
      if (appearance) {
        let dots = '';
        const portraitDots = setInterval(() => {
          dots = dots.length >= 3 ? '' : dots + '.';
          setGeneratingText(`Rendering Hunter portrait${dots}`);
        }, 400);
        try {
          portrait = await generatePortrait(finalAnswers.q1 || 'Hunter', appearance);
        } catch (pErr) {
          console.warn('Portrait generation failed:', pErr);
        } finally {
          clearInterval(portraitDots);
        }
      }

      await savePlayerState({
        ...DEFAULT_PLAYER_STATE,
        name: finalAnswers.q1 || '',
        location: hometown || 'Unknown',
        hometown,
        hometownCoords,
        currentCoords: hometownCoords,
        appearance,
        portrait,
      });

      const initUserMessage = buildCharacterCreationMessage(finalAnswers);
      let dots = '';
      const dotInterval = setInterval(() => {
        dots = dots.length >= 3 ? '' : dots + '.';
        setGeneratingText(`Registering Hunter profile${dots}`);
      }, 400);

      const response = await send({
        apiKey,
        messages: [{ role: 'user', content: initUserMessage }],
        maxTokens: 1500,
      });

      clearInterval(dotInterval);
      setGeneratingText(response);

      const initialHistory = [
        { role: 'user', content: initUserMessage },
        { role: 'assistant', content: response },
      ];
      await saveConversationHistory(initialHistory);

      setTimeout(() => {
        onComplete(finalAnswers, initialHistory, response, { portrait, appearance });
      }, 3000);

    } catch (err) {
      const msg = err.message || '';
      const isOverloaded = msg.includes('529') || msg.toLowerCase().includes('overloaded');
      setError(isOverloaded
        ? 'Servers are overloaded. Click RETRY to try again.'
        : msg || 'Failed to initialize simulation. Check your API key.');
      setIsGenerating(false);
      setGeneratingText('');
      // Stay on generating screen (step > TOTAL) so the RETRY button is visible
    }
  };

  const progressPct = step > 0 && step <= TOTAL ? (step / TOTAL) * 100 : 0;

  // ── INTRO SCREEN ───────────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="relative flex items-center justify-center w-screen h-screen overflow-hidden">
        <AnimatedBackground opacity={bgOpacity} />

        {/* Vignette overlay */}
        <div className="fixed inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,10,0.7) 100%)',
          zIndex: 1,
        }} />

        <div className="relative z-10 w-full max-w-lg p-8 space-y-8">
          <div className="text-center space-y-3">
            <div className="font-mono text-[10px] tracking-widest text-system-text-dim uppercase"
              style={{ textShadow: '0 0 20px rgba(74,144,217,0.5)' }}>
              ══════ SYSTEM ══════
            </div>
            <h1 className="font-mono text-3xl text-system-gold tracking-wider gold-shimmer"
              style={{ textShadow: '0 0 40px rgba(200,169,81,0.4)' }}>
              SOLO LEVELING SYSTEM
            </h1>
            <p className="font-mono text-xs text-system-blue tracking-widest"
              style={{ textShadow: '0 0 15px rgba(74,144,217,0.8)' }}>
              NEW HUNTER REGISTRATION
            </p>
          </div>

          <div className="system-window p-5 space-y-3"
            style={{ background: 'rgba(10,10,20,0.85)', backdropFilter: 'blur(8px)' }}>
            <div className="system-header -mx-5 -mt-5 mb-4">REGISTRATION NOTICE</div>
            <div className="font-mono text-xs text-system-text-dim space-y-2 leading-relaxed">
              <p>Hunter profile initialization requires complete data input.</p>
              <p>You will be asked {TOTAL} questions. Answer each one accurately.</p>
              <p className="text-system-red">Incomplete or dishonest answers may affect
                your starting parameters. The System evaluates everything.</p>
              <p>There are no correct answers. There is only your truth.</p>
            </div>
          </div>

          <button onClick={handleStart} className="w-full btn-primary py-4 text-sm"
            style={{ boxShadow: '0 0 30px rgba(74,144,217,0.3)' }}>
            BEGIN REGISTRATION
          </button>
        </div>
      </div>
    );
  }

  // ── GENERATING INITIAL STATE ───────────────────────────────────────────────
  if (step > TOTAL) {
    return (
      <div className="relative flex items-center justify-center w-screen h-screen overflow-hidden">
        <AnimatedBackground opacity={0.6} />
        <div className="fixed inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,10,0.8) 100%)',
          zIndex: 1,
        }} />

        <div className="relative z-10 w-full max-w-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="font-mono text-xs text-system-gold tracking-widest gold-shimmer">
              [ SYSTEM PROCESSING ]
            </div>
            <div className="font-mono text-[10px] text-system-text-dim processing-pulse">
              Evaluating Hunter Profile...
            </div>
          </div>

          {error && (
            <div className="system-block system-block-red p-3">
              <div className="font-mono text-xs text-system-red">{error}</div>
              <button
                onClick={() => {
                  setError('');
                  setGeneratingText('');
                  setIsGenerating(true);
                  generateInitialState(answers);
                }}
                className="btn-danger mt-2 text-xs px-3 py-1"
              >RETRY</button>
            </div>
          )}

          {generatingText && (
            <div className="system-window p-4"
              style={{ background: 'rgba(10,10,20,0.9)', backdropFilter: 'blur(8px)' }}>
              <div className="font-mono text-xs text-system-text whitespace-pre-line leading-relaxed max-h-64 overflow-y-auto">
                {generatingText}
              </div>
            </div>
          )}

          {!error && !generatingText.includes('\n') && (
            <div className="w-full">
              <div className="stat-bar-track">
                <div className="stat-bar-fill bg-system-blue"
                  style={{ width: '100%', animation: 'loadBar 1.5s ease-in-out infinite alternate' }} />
              </div>
              <style>{`@keyframes loadBar { from { width: 20%; } to { width: 100%; } }`}</style>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── QUESTION SCREEN ────────────────────────────────────────────────────────
  return (
    <div className="relative flex items-center justify-center w-screen h-screen overflow-hidden">
      <AnimatedBackground opacity={0.75} />

      {/* Vignette */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,10,0.75) 100%)',
        zIndex: 1,
      }} />

      <div className="relative z-10 w-full max-w-lg p-8 space-y-6">

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between font-mono text-[10px] text-system-text-dim">
            <span style={{ textShadow: '0 0 10px rgba(74,144,217,0.5)' }}>HUNTER REGISTRATION</span>
            <span>Question {step} / {TOTAL}</span>
          </div>
          <div className="stat-bar-track" style={{ background: 'rgba(30,30,50,0.6)' }}>
            <div className="stat-bar-fill bg-system-blue transition-all duration-500"
              style={{ width: `${progressPct}%`, boxShadow: '0 0 8px rgba(74,144,217,0.8)' }} />
          </div>
        </div>

        {/* Question card */}
        <div className="system-window p-5 space-y-4"
          style={{ background: 'rgba(8,8,18,0.88)', backdropFilter: 'blur(12px)' }}>
          <div className="system-header -mx-5 -mt-5 mb-4">
            {String(step).padStart(2, '0')} / {TOTAL}
          </div>
          <div className="font-mono text-sm text-system-text leading-relaxed">
            {currentQuestion?.question}
          </div>
          {Object.keys(answers).length > 0 && step > 1 && (
            <div className="font-mono text-[10px] text-system-text-dim border-t border-system-border pt-3 mt-2">
              <span className="text-system-blue">Last recorded: </span>
              {answers[CHARACTER_CREATION_QUESTIONS[step - 2]?.id]?.slice(0, 80)}
              {answers[CHARACTER_CREATION_QUESTIONS[step - 2]?.id]?.length > 80 ? '...' : ''}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="space-y-3">
          {currentQuestion?.type === 'textarea' ? (
            <textarea
              ref={inputRef}
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentQuestion.placeholder}
              className="w-full border border-system-border font-mono text-sm text-system-text outline-none px-4 py-3 focus:border-system-blue transition-colors min-h-[100px]"
              style={{ background: 'rgba(8,8,18,0.88)', backdropFilter: 'blur(8px)', resize: 'vertical' }}
            />
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentQuestion?.placeholder}
              className="w-full border border-system-border font-mono text-sm text-system-text outline-none px-4 py-3 focus:border-system-blue transition-colors"
              style={{ background: 'rgba(8,8,18,0.88)', backdropFilter: 'blur(8px)' }}
            />
          )}

          {error && <div className="font-mono text-xs text-system-red">{error}</div>}

          <div className="flex gap-3">
            <button
              onClick={handleAnswer}
              disabled={!currentInput.trim()}
              className="flex-1 btn-primary py-3 disabled:opacity-30"
              style={{ boxShadow: currentInput.trim() ? '0 0 20px rgba(74,144,217,0.25)' : 'none' }}
            >
              {step === TOTAL ? 'COMPLETE REGISTRATION' : 'CONFIRM →'}
            </button>
            {step > 1 && (
              <button
                onClick={() => {
                  setStep(step - 1);
                  setCurrentInput(answers[CHARACTER_CREATION_QUESTIONS[step - 2]?.id] || '');
                }}
                className="btn-system px-4 py-3 text-xs"
              >← BACK</button>
            )}
          </div>

          {currentQuestion?.type === 'textarea' && (
            <div className="font-mono text-[9px] text-system-muted text-center">
              Ctrl+Enter to confirm
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
