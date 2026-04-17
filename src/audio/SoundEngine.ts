// Synthesized SFX engine for co-pilots — adapted from dropster/snakey
import { AudioSampleBank } from "./AudioSampleBank";

const MUTE_KEY = "co-pilots-muted";

type SoundName = "pilotShoot" | "gunnerShoot" | "enemyHit" | "enemyKill" | "shipHit" | "bossShoot" | "bossKill" | "overheat" | "coolReady" | "waveStart";

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private _muted: boolean;
  private delayNode: DelayNode | null = null;
  private feedbackNode: GainNode | null = null;
  private compNode: DynamicsCompressorNode | null = null;
  private bank: AudioSampleBank | null = null;

  constructor() {
    this._muted = localStorage.getItem(MUTE_KEY) === "true";
  }

  get muted(): boolean { return this._muted; }
  set muted(val: boolean) {
    this._muted = val;
    localStorage.setItem(MUTE_KEY, String(val));
  }

  toggleMute(): void { this.muted = !this._muted; }

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.compNode = this.ctx.createDynamicsCompressor();
      this.compNode.connect(this.ctx.destination);
      this.delayNode = this.ctx.createDelay(0.2);
      this.delayNode.delayTime.value = 0.08;
      this.feedbackNode = this.ctx.createGain();
      this.feedbackNode.gain.value = 0.3;
      this.delayNode.connect(this.feedbackNode);
      this.feedbackNode.connect(this.delayNode);
      this.delayNode.connect(this.compNode);
      this.bank = new AudioSampleBank(this.ctx, this.compNode);
      void this.bank.preload([
        "laser_shoot_tiny",
        "shot-ship",
        "shot-ship_mega-gun",
        "laser_shoot_long",
        "heart_collect",
        "bonus_collect",
        "level_win",
      ]);
    }
    return this.ctx;
  }

  private layeredOsc(type: OscillatorType, freq: number, gain: number, duration: number, opts?: {
    detune?: number; layers?: number; freqEnd?: number; filterFreq?: number; reverb?: boolean;
  }): void {
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    const detune = opts?.detune ?? 6;
    const layers = opts?.layers ?? 2;
    const filterFreq = opts?.filterFreq ?? 3000;
    const useReverb = opts?.reverb ?? false;

    const mix = ctx.createGain();
    mix.gain.setValueAtTime(gain, t);
    mix.gain.setValueAtTime(gain, t + 0.005);
    mix.gain.exponentialRampToValueAtTime(0.001, t + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq;
    filter.connect(mix);
    mix.connect(this.compNode!);
    if (useReverb) mix.connect(this.delayNode!);

    for (let i = 0; i < layers; i++) {
      const osc = ctx.createOscillator();
      osc.type = type;
      const spread = layers === 1 ? 0 : (i / (layers - 1) * 2 - 1) * detune;
      osc.frequency.setValueAtTime(freq, t);
      osc.detune.setValueAtTime(spread, t);
      if (opts?.freqEnd !== undefined) osc.frequency.linearRampToValueAtTime(opts.freqEnd, t + duration);
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + duration);
    }
  }

  private noise(gain: number, duration: number, filterFreq?: number, useReverb?: boolean): void {
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    const bufSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);

    if (filterFreq) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = filterFreq;
      src.connect(f);
      f.connect(g);
    } else {
      src.connect(g);
    }
    g.connect(this.compNode!);
    if (useReverb) g.connect(this.delayNode!);
    src.start(t);
    src.stop(t + duration);
  }

  play(name: SoundName): void {
    if (this._muted) return;

    switch (name) {
      case "pilotShoot":
        // Short punchy laser — high square blip
        this.layeredOsc("square", 880, 0.12, 0.06, {
          freqEnd: 440, layers: 1, filterFreq: 2500,
        });
        break;

      case "gunnerShoot":
        // Deeper turret blast — sawtooth with reverb
        this.layeredOsc("sawtooth", 330, 0.15, 0.1, {
          freqEnd: 220, layers: 2, detune: 10, filterFreq: 1800, reverb: true,
        });
        break;

      case "enemyHit":
        // Metallic impact tick
        this.layeredOsc("square", 600, 0.1, 0.04, { filterFreq: 4000 });
        this.noise(0.05, 0.03, 3000);
        break;

      case "enemyKill":
        // Satisfying explosion pop — sweep down + noise burst
        this.layeredOsc("sawtooth", 500, 0.2, 0.2, {
          freqEnd: 60, layers: 2, detune: 12, filterFreq: 2000, reverb: true,
        });
        this.noise(0.15, 0.15, 1200, true);
        break;

      case "shipHit":
        // Heavy impact — low rumble + noise
        this.layeredOsc("sawtooth", 120, 0.3, 0.3, {
          freqEnd: 40, layers: 3, detune: 20, filterFreq: 800,
        });
        this.noise(0.2, 0.2, 400);
        break;

      case "bossShoot":
        // Menacing low-freq pulse
        this.layeredOsc("sawtooth", 180, 0.15, 0.15, {
          freqEnd: 100, layers: 2, filterFreq: 1000,
        });
        break;

      case "bossKill":
        // Massive explosion — long, layered, reverb-heavy
        this.layeredOsc("sawtooth", 300, 0.3, 0.6, {
          freqEnd: 30, layers: 3, detune: 20, filterFreq: 1500, reverb: true,
        });
        this.noise(0.25, 0.5, 800, true);
        // Victory chirp after the boom
        setTimeout(() => {
          if (this._muted) return;
          this.layeredOsc("sine", 660, 0.15, 0.15, { freqEnd: 1320, filterFreq: 5000 });
        }, 400);
        break;

      case "overheat":
        // Warning buzz — dissonant square
        this.layeredOsc("square", 200, 0.15, 0.2, {
          layers: 3, detune: 30, filterFreq: 1500,
        });
        break;

      case "coolReady":
        // Reload chirp — bright ascending
        this.layeredOsc("sine", 440, 0.12, 0.12, {
          freqEnd: 880, filterFreq: 4000,
        });
        break;

      case "waveStart":
        // Alert tone — two quick beeps
        this.layeredOsc("square", 880, 0.15, 0.08, { filterFreq: 3000 });
        setTimeout(() => {
          if (this._muted) return;
          this.layeredOsc("square", 1100, 0.15, 0.08, { filterFreq: 3000 });
        }, 120);
        break;
    }
  }

  playPilotShot(upgraded: boolean): void {
    if (this._muted) return;
    this.getCtx();
    const name = upgraded ? "shot-ship_mega-gun" : "laser_shoot_tiny";
    if (this.bank?.play(name, { gain: 0.7 })) return;
    // Synth fallback
    this.layeredOsc("square", upgraded ? 600 : 880, 0.12, upgraded ? 0.10 : 0.06, {
      freqEnd: upgraded ? 300 : 440, layers: 1, filterFreq: 2500,
    });
  }

  playGunnerShot(upgraded: boolean): void {
    if (this._muted) return;
    this.getCtx();
    const name = upgraded ? "laser_shoot_long" : "shot-ship";
    if (this.bank?.play(name, { gain: 0.7 })) return;
    // Synth fallback
    this.layeredOsc("sawtooth", 330, 0.15, upgraded ? 0.2 : 0.1, {
      freqEnd: 220, layers: 2, detune: 10, filterFreq: 1800, reverb: true,
    });
  }

  playHeartCollect(): void {
    if (this._muted) return;
    this.getCtx();
    if (this.bank?.play("heart_collect", { gain: 0.8 })) return;
    this.layeredOsc("sine", 660, 0.2, 0.2, { freqEnd: 1320, filterFreq: 4000 });
  }

  playBonusCollect(): void {
    if (this._muted) return;
    this.getCtx();
    if (this.bank?.play("bonus_collect", { gain: 0.9 })) return;
    // Synth fallback: triumphant arpeggio
    [660, 880, 1320].forEach((f, i) => {
      setTimeout(() => {
        if (this._muted) return;
        this.layeredOsc("sine", f, 0.2, 0.15, { filterFreq: 4500 });
      }, i * 80);
    });
  }

  playWaveClear(): void {
    if (this._muted) return;
    this.getCtx();
    if (this.bank?.play("level_win", { gain: 0.8 })) return;
    this.layeredOsc("square", 880, 0.2, 0.15, { freqEnd: 1760, filterFreq: 3000 });
  }

  gameOver(): void {
    if (this._muted) return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    const notes = [440, 330, 220];
    notes.forEach((freq, i) => {
      const start = t + i * 0.15;
      for (let l = 0; l < 3; l++) {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, start);
        osc.detune.setValueAtTime((l - 1) * 8, start);
        const g = ctx.createGain();
        const f = ctx.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = 2000;
        g.gain.setValueAtTime(0.2, start);
        g.gain.setValueAtTime(0.2, start + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, start + 1.2);
        osc.connect(f);
        f.connect(g);
        g.connect(this.compNode!);
        g.connect(this.delayNode!);
        osc.start(start);
        osc.stop(start + 1.2);
      }
    });
  }

  stopAll(): void {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.delayNode = null;
      this.feedbackNode = null;
      this.compNode = null;
      this.bank = null;
    }
  }
}
