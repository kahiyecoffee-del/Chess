// Arka plan müziği: hiçbir ses dosyası olmadan WebAudio ile gerçek zamanlı üretilir.
// Sakin, döngüsel bir parça: yumuşak akor pedi, bas, kalimba benzeri arpej ve hafif ritim.
// Her dünya farklı bir tonda çalar. Tarayıcılar sesi ancak ilk dokunuştan sonra başlatır.

type Chord = number[]; // kök + aralıklar (yarım ton)

// I – vi – IV – V(sus) ilerlemesi, iki çeşitlemeyle (8 ölçü).
const PROGRESSION: Chord[] = [
  [0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 4], [-5, -1, 2, 7],
  [0, 4, 7, 11], [-3, 0, 4, 7], [-8, -5, -1, 4], [-5, 0, 2, 7],
];
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16];
// Dünyaya göre ton kaydırma (yarım ton): Köy C, Kale D, Çöl E♭, Buz F …
const WORLD_KEYS = [0, 2, 3, 5, -2, 7, -3, 4, -4, 1];
const BASE_MIDI = 60; // C4

const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), a | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export class MusicPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null; // efektlerden önceki karışım
  private reverb: ConvolverNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer = 0;
  private nextBarTime = 0;
  private bar = 0;
  private key = 0;
  private enabled = false;
  private readonly tempo = 76; // BPM
  private readonly volume = 0.32;
  private random = rng(7);

  /** Müzik açık/kapalı. Açıkken ses bağlamı ilk kullanıcı etkileşiminde başlatılır. */
  setEnabled(on: boolean): void {
    this.enabled = on;
    if (on) this.resume();
    // Kısma bitmeden yeniden açılırsa susturma, aksi halde açık görünüp sessiz kalır.
    else this.fadeTo(0, 0.6, () => { if (!this.enabled) void this.ctx?.suspend(); });
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Dünyaya göre ton (bir sonraki ölçüden itibaren). */
  setWorld(index: number): void {
    this.key = WORLD_KEYS[index % WORLD_KEYS.length];
  }

  /** Bir kullanıcı dokunuşunun içinden çağrılmalı (tarayıcı otomatik oynatma kuralı). */
  resume(): void {
    if (!this.enabled) return;
    if (!this.ctx) this.init();
    const ctx = this.ctx!;
    void ctx.resume().then(() => {
      this.fadeTo(this.volume, 1.5);
      if (!this.timer) this.start();
    });
  }

  /** Sayfa arka plana geçince sustur, dönünce devam et. */
  pauseForBackground(hidden: boolean): void {
    if (!this.ctx) return;
    if (hidden) void this.ctx.suspend();
    else if (this.enabled) void this.ctx.resume();
  }

  private init(): void {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    // Hafif sıkıştırma: ani tepeleri yumuşatır.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    comp.connect(this.master);
    this.bus = ctx.createGain();
    this.bus.connect(comp);
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.8, 2.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    this.bus.connect(this.reverb);
    this.reverb.connect(wet);
    wet.connect(comp);
    this.noise = this.noiseBuffer();
  }

  private impulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  private noiseBuffer(): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private fadeTo(value: number, seconds: number, done?: () => void): void {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const g = this.master.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(value, now + seconds);
    if (done) setTimeout(done, seconds * 1000 + 50);
  }

  private start(): void {
    const ctx = this.ctx!;
    this.nextBarTime = ctx.currentTime + 0.1;
    // İleriye dönük zamanlayıcı: notalar ~1 ölçü önceden planlanır, ana iş parçacığı takılsa da kesilmez.
    this.timer = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      while (this.nextBarTime < this.ctx.currentTime + 1.2) {
        this.scheduleBar(this.nextBarTime);
        this.nextBarTime += this.barLength;
        this.bar++;
      }
    }, 200);
  }

  private get beat(): number {
    return 60 / this.tempo;
  }

  private get barLength(): number {
    return this.beat * 4;
  }

  private scheduleBar(t: number): void {
    const chord = PROGRESSION[this.bar % PROGRESSION.length];
    const root = BASE_MIDI + this.key;
    // Ped: akorun tamamı, yavaş giriş-çıkış.
    for (const iv of chord) this.pad(midiToHz(root + iv), t, this.barLength * 1.05);
    // Bas: 1. ve 3. vuruşta kök.
    this.bass(midiToHz(root + chord[0] - 24), t, this.beat * 1.8);
    this.bass(midiToHz(root + chord[0] - 24 + (this.bar % 2 ? 7 : 0)), t + this.beat * 2, this.beat * 1.6);
    // Kalimba arpeji: sekizlik notalar, pentatonikten akora yakın seçimler; bazı vuruşlar boş.
    const section = Math.floor(this.bar / PROGRESSION.length) % 4;
    for (let i = 0; i < 8; i++) {
      if (section === 0 && i % 2) continue; // ilk turda seyrek
      if (this.random() < 0.28) continue;
      const step = PENTATONIC[Math.floor(this.random() * PENTATONIC.length)];
      const snapped = chord.reduce((best, iv) => (Math.abs(iv + 12 - step) < Math.abs(best - step) ? iv + 12 : best), step);
      const note = root + 12 + (this.random() < 0.6 ? snapped : step);
      this.pluck(midiToHz(note), t + i * (this.beat / 2), 0.09 + this.random() * 0.05);
    }
    // Hafif ritim: ikinci turdan sonra, vuruş aralarında yumuşak shaker.
    if (section > 0) for (let i = 0; i < 8; i++) this.shaker(t + i * (this.beat / 2) + (i % 2 ? 0.02 : 0), i % 2 ? 0.05 : 0.025);
  }

  private pad(freq: number, t: number, dur: number): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1100;
    filter.Q.value = 0.4;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.045, t + dur * 0.35);
    g.gain.linearRampToValueAtTime(0, t + dur);
    for (const [type, detune] of [['triangle', -6], ['sine', 7]] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      o.connect(filter);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
    filter.connect(g);
    g.connect(this.bus!);
  }

  private bass(freq: number, t: number, dur: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.bus!);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private pluck(freq: number, t: number, level: number): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 1.4);
    // Kalimba tınısı: temel + hafif bir üst harmonik.
    for (const [mult, amp] of [[1, 1], [3.01, 0.18], [5.2, 0.05]]) {
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq * mult;
      og.gain.value = amp;
      o.connect(og);
      og.connect(g);
      o.start(t);
      o.stop(t + 1.5);
    }
    g.connect(this.bus!);
  }

  private shaker(t: number, level: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.09);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.bus!);
    src.start(t, Math.random() * 0.5);
    src.stop(t + 0.12);
  }
}
