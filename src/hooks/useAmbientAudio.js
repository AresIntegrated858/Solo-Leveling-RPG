// useAmbientAudio — procedural dark ambient music via Web Audio API
// No audio files required. Generates atmosphere entirely in-engine.
// Inspired by Solo Leveling gate-opening / system-awakening tone.

import { useEffect, useRef, useCallback } from 'react';

export function useAmbientAudio() {
  const ctxRef = useRef(null);
  const nodesRef = useRef([]);
  const isPlayingRef = useRef(false);

  const stop = useCallback(() => {
    if (!isPlayingRef.current) return;
    isPlayingRef.current = false;
    nodesRef.current.forEach((n) => {
      try { n.stop?.(); } catch {}
      try { n.disconnect?.(); } catch {}
    });
    nodesRef.current = [];
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 4);
      masterGain.connect(ctx.destination);
      nodesRef.current.push(masterGain);

      // ── Reverb (convolver via impulse response synthesis) ────────────────
      function makeReverb(duration = 4, decay = 3) {
        const sampleRate = ctx.sampleRate;
        const length = sampleRate * duration;
        const impulse = ctx.createBuffer(2, length, sampleRate);
        for (let c = 0; c < 2; c++) {
          const data = impulse.getChannelData(c);
          for (let i = 0; i < length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
          }
        }
        const conv = ctx.createConvolver();
        conv.buffer = impulse;
        return conv;
      }
      const reverb = makeReverb(5, 2.5);
      reverb.connect(masterGain);
      nodesRef.current.push(reverb);

      // ── Heavy bass drone ─────────────────────────────────────────────────
      function makeDrone(freq, gainVal, detune = 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.detune.setValueAtTime(detune, ctx.currentTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, ctx.currentTime);
        filter.Q.setValueAtTime(2, ctx.currentTime);

        gain.gain.setValueAtTime(gainVal, ctx.currentTime);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(reverb);
        gain.connect(masterGain);
        osc.start();
        nodesRef.current.push(osc, filter, gain);
        return osc;
      }

      makeDrone(36.7, 0.18, 0);    // D1 — sub bass
      makeDrone(36.7, 0.10, 8);    // slightly detuned for thickness
      makeDrone(73.4, 0.06, -5);   // D2 — upper harmonic
      makeDrone(55.0, 0.04, 3);    // A1 — tension fifth

      // ── Slow LFO breath modulation on filter ─────────────────────────────
      const breathLFO = ctx.createOscillator();
      const breathGain = ctx.createGain();
      breathLFO.frequency.setValueAtTime(0.07, ctx.currentTime); // very slow
      breathLFO.type = 'sine';
      breathGain.gain.setValueAtTime(120, ctx.currentTime);
      breathLFO.connect(breathGain);
      breathLFO.start();
      nodesRef.current.push(breathLFO, breathGain);

      // ── Atmospheric pad layer ─────────────────────────────────────────────
      function makePad(freq, gainVal) {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc1.type = 'triangle';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(freq, ctx.currentTime);
        osc2.frequency.setValueAtTime(freq * 1.003, ctx.currentTime); // chorus

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        filter.Q.setValueAtTime(1.5, ctx.currentTime);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + 6);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(reverb);
        osc1.start();
        osc2.start();
        nodesRef.current.push(osc1, osc2, filter, gain);
      }

      makePad(146.8, 0.04);  // D3
      makePad(220.0, 0.03);  // A3
      makePad(185.0, 0.025); // F#3 — dark maj7 color

      // ── Tension pulses — rhythmic low thuds ───────────────────────────────
      function schedulePulse(time) {
        if (!isPlayingRef.current || !ctxRef.current) return;
        const now = ctxRef.current.currentTime;
        if (time < now) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(55, time);
        osc.frequency.exponentialRampToValueAtTime(28, time + 0.4);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(120, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.5, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.start(time);
        osc.stop(time + 0.6);
        nodesRef.current.push(osc, gain, filter);
      }

      // Schedule pulses on a slow 4-beat pattern
      const beatInterval = 3.2; // seconds per beat
      let nextBeat = ctx.currentTime + 2;
      let beatCount = 0;
      const beatPattern = [1, 0, 0, 1, 0, 0, 0.6, 0]; // accent pattern

      const beatScheduler = setInterval(() => {
        if (!isPlayingRef.current || !ctxRef.current) {
          clearInterval(beatScheduler);
          return;
        }
        const accent = beatPattern[beatCount % beatPattern.length];
        if (accent > 0) schedulePulse(nextBeat);
        nextBeat += beatInterval;
        beatCount++;
      }, beatInterval * 1000);

      // ── High shimmer — ethereal overtones ────────────────────────────────
      function makeShimmer(freq, delay) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(0.15 + Math.random() * 0.1, ctx.currentTime);
        lfoGain.gain.setValueAtTime(0.008, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        lfo.start();

        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.012, ctx.currentTime + delay + 3);

        osc.connect(gain);
        gain.connect(reverb);
        osc.start(ctx.currentTime + delay);
        nodesRef.current.push(osc, gain, lfo, lfoGain);
      }

      makeShimmer(587.3, 5);   // D5
      makeShimmer(739.9, 8);   // F#5
      makeShimmer(440.0, 11);  // A4

    } catch (err) {
      console.warn('useAmbientAudio: Web Audio not available', err);
    }
  }, []);

  // Fade out cleanly
  const fadeOut = useCallback((duration = 2) => {
    if (!ctxRef.current || !isPlayingRef.current) return;
    const ctx = ctxRef.current;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.7, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    setTimeout(stop, duration * 1000 + 100);
  }, [stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  return { start, stop, fadeOut };
}
