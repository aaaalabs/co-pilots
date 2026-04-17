// Adaptive synthesized music engine for co-pilots — adapted from dropster/snakey
// Minor-key space theme with tension escalation based on wave progress

import { AudioSampleBank } from "./AudioSampleBank";

interface Chord { root: number; third: number; fifth: number }

// Em – C – Am – B (darker, more dramatic than the Am-F-C-G of dropster)
const CHORDS: Chord[] = [
  { root: 164.8, third: 196, fifth: 246.9 },    // Em
  { root: 130.8, third: 164.8, fifth: 196 },    // C
  { root: 220, third: 261.6, fifth: 329.6 },    // Am
  { root: 246.9, third: 311.1, fifth: 370 },     // B
];
const ARP_A = [0, 2, 1, 3, 2, 0, 3, 1] as const;
const ARP_B = [3, 1, 2, 0, 1, 3, 0, 2] as const;

function chordTone(c: Chord, i: number): number {
  return [c.root, c.third, c.fifth, c.root * 2][i];
}

export class MusicEngine {
  private ctx: AudioContext | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private bpm = 100;
  private _muted = false;
  private masterGain: GainNode | null = null;
  private patternB = false;
  private noiseBuffer: AudioBuffer | null = null;
  private totalSteps = 0;
  private padOscs: OscillatorNode[] = [];
  private padGain: GainNode | null = null;
  private bank: AudioSampleBank | null = null;
  private bossSource: AudioBufferSourceNode | null = null;
  private bossGain: GainNode | null = null;
  private onBossTheme = false;

  get muted(): boolean { return this._muted; }
  set muted(val: boolean) {
    this._muted = val;
    if (this.masterGain) this.masterGain.gain.value = val ? 0 : 0.10;
  }

  start(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._muted ? 0 : 0.10;
      this.masterGain.connect(this.ctx.destination);
      const sr = this.ctx.sampleRate;
      const len = Math.floor(sr * 0.05);
      this.noiseBuffer = this.ctx.createBuffer(1, len, sr);
      const d = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.bank = new AudioSampleBank(this.ctx, this.masterGain);
      void this.bank.preload(["boss-fight-theme"]);
    }
    this.scheduleInterval();
  }

  stop(): void {
    if (this.intervalId !== null) { clearInterval(this.intervalId); this.intervalId = null; }
    for (const o of this.padOscs) { try { o.stop(); } catch { /* noop */ } }
    this.padOscs = [];
    this.padGain = null;
    if (this.bossSource) { try { this.bossSource.stop(); } catch { /* noop */ } this.bossSource = null; }
    this.bossGain = null;
    if (this.ctx) { void this.ctx.close(); this.ctx = null; this.masterGain = null; this.noiseBuffer = null; this.bank = null; }
    this.step = 0;
    this.totalSteps = 0;
    this.patternB = false;
    this.onBossTheme = false;
  }

  switchToBossTheme(): void {
    if (!this.ctx || !this.masterGain || !this.bank || this.onBossTheme) return;
    this.onBossTheme = true;
    const t = this.ctx.currentTime;
    if (this.intervalId !== null) { clearInterval(this.intervalId); this.intervalId = null; }
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(this._muted ? 0 : 0.22, t + 0.5);
    g.connect(this.ctx.destination);
    const src = this.bank.play("boss-fight-theme", { loop: true, gain: 1.0 });
    if (src) {
      try { src.disconnect(); } catch { /* noop */ }
      src.connect(g);
    }
    this.bossSource = src;
    this.bossGain = g;
    this.masterGain.gain.cancelScheduledValues(t);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
    this.masterGain.gain.linearRampToValueAtTime(0, t + 0.5);
  }

  switchToNormalTheme(): void {
    if (!this.ctx || !this.masterGain || !this.onBossTheme) return;
    this.onBossTheme = false;
    const t = this.ctx.currentTime;
    if (this.bossGain) {
      this.bossGain.gain.cancelScheduledValues(t);
      this.bossGain.gain.setValueAtTime(this.bossGain.gain.value, t);
      this.bossGain.gain.linearRampToValueAtTime(0, t + 0.5);
    }
    const bossSrc = this.bossSource;
    setTimeout(() => { try { bossSrc?.stop(); } catch { /* noop */ } }, 520);
    this.bossSource = null;
    this.bossGain = null;
    this.masterGain.gain.cancelScheduledValues(t);
    this.masterGain.gain.setValueAtTime(0, t);
    this.masterGain.gain.linearRampToValueAtTime(this._muted ? 0 : 0.10, t + 0.5);
    if (this.intervalId === null) this.scheduleInterval();
  }

  setBpm(bpm: number): void { this.bpm = bpm; this.restartInterval(); }

  private restartInterval(): void {
    if (this.intervalId === null) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.scheduleInterval();
  }

  private scheduleInterval(): void {
    this.intervalId = setInterval(() => this.playStep(), (60000 / this.bpm) / 2);
  }

  private playStep(): void {
    if (!this.ctx || !this.masterGain) return;
    const stepDur = (60 / this.bpm) / 2;
    const chordIdx = Math.floor(this.step / 8) % 4;
    const chord = CHORDS[chordIdx];
    const local = this.step % 8;
    const pat = this.patternB ? ARP_B : ARP_A;

    // Arp — slightly detuned square for spacey feel
    this.playNote(chordTone(chord, pat[local]), "square", 0.25, stepDur * 0.4);

    // Bass — beat 1 and beat 3
    if (local === 0) this.playBass(chord.root / 2, stepDur * 4);
    else if (local === 4) this.playBass(chord.root / 2, stepDur * 1.5);

    // Kick — every 4 steps
    if (this.step % 4 === 0) this.playKick();

    // Hi-hat — every 2 steps, off-beats louder
    if (this.step % 2 === 0) this.playHiHat(local % 2 === 1 ? 0.3 : 0.15);

    // Chorus pad — fades in after 64 steps
    if (this.totalSteps >= 64 && local === 0) {
      const buildUp = Math.min((this.totalSteps - 64) / 64, 1);
      this.playPad(chord, stepDur * 8, buildUp * 0.12);
    }

    this.totalSteps++;
    this.step = (this.step + 1) % 32;
    if (this.step === 0) this.patternB = !this.patternB;
  }

  private playNote(freq: number, type: OscillatorType, gain: number, dur: number): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t = this.ctx.currentTime;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(env).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  private playBass(freq: number, dur: number): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    lp.type = "lowpass";
    lp.frequency.value = 350;
    const t = this.ctx.currentTime;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.45, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(lp).connect(env).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  private playKick(): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);
    env.gain.setValueAtTime(0.7, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(env).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.13);
    const click = this.ctx.createOscillator();
    const ce = this.ctx.createGain();
    click.frequency.value = 1000;
    ce.gain.setValueAtTime(0.25, t);
    ce.gain.exponentialRampToValueAtTime(0.001, t + 0.005);
    click.connect(ce).connect(this.masterGain);
    click.start(t);
    click.stop(t + 0.01);
  }

  private playPad(chord: Chord, dur: number, gain: number): void {
    if (!this.ctx || !this.masterGain || gain < 0.01) return;
    const t = this.ctx.currentTime;
    for (const o of this.padOscs) { try { o.stop(t + 0.05); } catch { /* noop */ } }
    this.padOscs = [];
    if (!this.padGain) {
      this.padGain = this.ctx.createGain();
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1000;
      this.padGain.connect(lp);
      lp.connect(this.masterGain);
    }
    this.padGain.gain.cancelScheduledValues(t);
    this.padGain.gain.setValueAtTime(0, t);
    this.padGain.gain.linearRampToValueAtTime(gain, t + dur * 0.3);
    this.padGain.gain.setValueAtTime(gain, t + dur * 0.7);
    this.padGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    for (const freq of [chord.root, chord.third, chord.fifth]) {
      for (const detune of [-4, 4]) {
        const osc = this.ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.value = freq;
        osc.detune.value = detune;
        osc.connect(this.padGain);
        osc.start(t);
        osc.stop(t + dur + 0.1);
        this.padOscs.push(osc);
      }
    }
  }

  private playHiHat(gain: number): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    const env = this.ctx.createGain();
    const hp = this.ctx.createBiquadFilter();
    src.buffer = this.noiseBuffer;
    hp.type = "highpass";
    hp.frequency.value = 8000;
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    src.connect(hp).connect(env).connect(this.masterGain);
    src.start(t);
    src.stop(t + 0.04);
  }
}
