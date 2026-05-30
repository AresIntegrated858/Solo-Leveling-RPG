// useSystemSting — short procedural Web Audio stings for full-screen System events.
// Single shared AudioContext, lazily created. Each sting is a one-shot generator
// that plays an event-appropriate motif (level-up, title, shadow, skill, penalty, daily).

import { useCallback, useRef } from 'react';

export function useSystemSting() {
  const ctxRef = useRef(null);

  const ensureContext = () => {
    if (ctxRef.current) return ctxRef.current;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;
      return ctx;
    } catch {
      return null;
    }
  };

  // ── Reverb impulse (shared across stings) ──────────────────────────────────
  const makeReverb = (ctx, duration = 2.5, decay = 2.5) => {
    const length = ctx.sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    const conv = ctx.createConvolver();
    conv.buffer = impulse;
    return conv;
  };

  const playSting = useCallback((type) => {
    const ctx = ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);

    const reverb = makeReverb(ctx, 2.0, 2.5);
    const wet = ctx.createGain();
    wet.gain.value = 0.4;
    reverb.connect(wet);
    wet.connect(master);

    const playOsc = (freq, type, attackT, sustainT, releaseT, gain = 0.3, detune = 0) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, now);
      if (detune) o.detune.value = detune;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(gain, now + attackT);
      g.gain.setValueAtTime(gain, now + attackT + sustainT);
      g.gain.exponentialRampToValueAtTime(0.001, now + attackT + sustainT + releaseT);

      o.connect(g);
      g.connect(master);
      g.connect(reverb);
      o.start(now);
      o.stop(now + attackT + sustainT + releaseT + 0.05);
    };

    const playSweep = (fromFreq, toFreq, duration, type, gain = 0.3) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(fromFreq, now);
      o.frequency.exponentialRampToValueAtTime(toFreq, now + duration);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(gain, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + duration);

      o.connect(g);
      g.connect(master);
      g.connect(reverb);
      o.start(now);
      o.stop(now + duration + 0.05);
    };

    const playNoise = (duration, gain = 0.2, filterFreq = 1000) => {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(gain, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(g);
      g.connect(master);
      g.connect(reverb);
      noise.start(now);
      noise.stop(now + duration);
    };

    switch (type) {
      case 'level-up': {
        // Rising minor 3rd power chord (D3 → F3 → A3) with shimmer
        playOsc(146.83, 'sawtooth', 0.02, 0.4, 1.6, 0.18);          // D3
        playOsc(174.61, 'sawtooth', 0.05, 0.4, 1.6, 0.18);          // F3
        playOsc(220.00, 'sawtooth', 0.10, 0.5, 1.8, 0.15);          // A3
        playOsc(440.00, 'sine',     0.15, 0.4, 1.4, 0.08);          // A4 shimmer
        playOsc(880.00, 'sine',     0.35, 0.3, 1.0, 0.04);          // A5 sparkle
        playSweep(60, 30, 1.5, 'sine', 0.2);                         // sub drop
        break;
      }
      case 'title': {
        // Bright FM bell — gold ringing
        playOsc(523.25, 'triangle', 0.005, 0.15, 1.4, 0.22);         // C5
        playOsc(783.99, 'sine',     0.01,  0.15, 1.6, 0.16);         // G5
        playOsc(1046.5, 'sine',     0.015, 0.10, 1.4, 0.10);         // C6
        playOsc(1567.98, 'sine',    0.03,  0.10, 1.2, 0.06);         // G6
        playSweep(80, 40, 1.0, 'sine', 0.12);                         // soft thud
        break;
      }
      case 'skill': {
        // Bright synth blip — quick rise + tail
        playSweep(220, 880, 0.4, 'square', 0.18);                     // chirp
        playOsc(440, 'triangle', 0.005, 0.15, 0.8, 0.18);             // A4
        playOsc(659.25, 'sine',  0.08,  0.10, 0.6, 0.12);             // E5
        playNoise(0.3, 0.08, 4000);                                   // white tail
        break;
      }
      case 'shadow': {
        // Dark whoosh + sub-bass tom — Solo Leveling ARISE moment
        playSweep(200, 50, 1.8, 'sawtooth', 0.28);                    // dark whoosh
        playOsc(41.20, 'sine',    0.005, 0.5, 2.0, 0.32);             // E1 sub
        playOsc(82.41, 'triangle',0.02,  0.4, 1.8, 0.18);             // E2
        playOsc(58.27, 'sawtooth',0.1,   0.3, 1.5, 0.12);             // A#1 dissonance
        playNoise(1.5, 0.10, 200);                                    // rumbling noise
        playSweep(2000, 100, 0.8, 'sine', 0.06);                      // ghost shimmer fall
        break;
      }
      case 'penalty': {
        // Distorted bass hit — danger
        playOsc(55.00, 'square',   0.001, 0.6, 1.2, 0.35);            // A1 punch
        playOsc(82.41, 'sawtooth', 0.005, 0.5, 1.4, 0.22);            // E2 dissonant
        playOsc(110.00, 'sawtooth',0.005, 0.5, 1.4, 0.18);            // A2
        playSweep(800, 200, 0.4, 'sawtooth', 0.18);                   // alarm fall
        playNoise(0.5, 0.15, 800);                                    // crunch
        break;
      }
      case 'daily-complete': {
        // Short triumphant chord — gold
        playOsc(392.00, 'triangle', 0.005, 0.2, 0.9, 0.18);           // G4
        playOsc(493.88, 'triangle', 0.005, 0.2, 0.9, 0.16);           // B4
        playOsc(587.33, 'triangle', 0.005, 0.2, 0.9, 0.14);           // D5
        playOsc(987.77, 'sine',     0.05,  0.15,0.7, 0.07);           // B5 sparkle
        break;
      }
      default:
        break;
    }
  }, []);

  return { playSting };
}
