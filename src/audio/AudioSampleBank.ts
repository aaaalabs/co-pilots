// Loads and plays MP3 samples through a shared AudioContext + destination node.
// Samples decode on `preload()`; `play()` returns null if the sample isn't
// ready so the caller can synth-fallback.

export class AudioSampleBank {
  private ctx: AudioContext;
  private destination: AudioNode;
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<void>>();

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.destination = destination;
  }

  preload(names: string[]): Promise<void> {
    return Promise.all(names.map(n => this.loadOne(n))).then(() => undefined);
  }

  private loadOne(name: string): Promise<void> {
    if (this.buffers.has(name)) return Promise.resolve();
    const existing = this.loading.get(name);
    if (existing) return existing;
    const p = fetch(`/audios/${name}.mp3`)
      .then(r => {
        if (!r.ok) throw new Error(`fetch ${name}: ${r.status}`);
        return r.arrayBuffer();
      })
      .then(buf => this.ctx.decodeAudioData(buf))
      .then(buffer => { this.buffers.set(name, buffer); })
      .catch(err => {
        console.warn(`[AudioSampleBank] failed to load ${name}:`, err);
      });
    this.loading.set(name, p);
    return p;
  }

  isReady(name: string): boolean {
    return this.buffers.has(name);
  }

  play(name: string, opts?: { gain?: number; loop?: boolean }): AudioBufferSourceNode | null {
    const buf = this.buffers.get(name);
    if (!buf) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = opts?.loop ?? false;
    const gain = this.ctx.createGain();
    gain.gain.value = opts?.gain ?? 1.0;
    src.connect(gain);
    gain.connect(this.destination);
    src.start();
    return src;
  }
}
