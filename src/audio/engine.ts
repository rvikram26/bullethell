import type { SfxName } from '../data/types';
import { MusicPlayer } from './music';
import { SfxBank } from './sfx';

type AudioCtor = typeof AudioContext;

/**
 * Owns the AudioContext and the mixer: music and effects buses into a master gain and a gentle
 * compressor. The context is created on the first user gesture, as browsers require.
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  readonly sfx = new SfxBank();
  readonly music = new MusicPlayer();
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private volumes = { master: 0.8, music: 0.7, sfx: 0.8 };
  private ducked = false;
  private wanted: string | null = null;

  get ready(): boolean {
    return this.ctx !== null;
  }

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor: AudioCtor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) return;
    let ctx: AudioContext;
    try {
      ctx = new Ctor({ latencyHint: 'interactive' });
    } catch {
      return;
    }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.knee.value = 8;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.connect(comp);
    this.musicBus = ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.connect(this.master);
    this.ctx = ctx;
    this.sfx.init(ctx, this.sfxBus);
    this.music.init(ctx, this.musicBus);
    this.applyVolumes();
    if (ctx.state === 'suspended') void ctx.resume();
    if (this.wanted !== null) this.music.play(this.wanted);
  }

  setVolumes(master: number, music: number, sfx: number): void {
    this.volumes = { master, music, sfx };
    this.applyVolumes();
  }

  private applyVolumes(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.musicBus || !this.sfxBus) return;
    const now = ctx.currentTime;
    // squared for a more even perceived loudness curve
    this.master.gain.setTargetAtTime(this.volumes.master ** 2, now, 0.02);
    this.musicBus.gain.setTargetAtTime(this.volumes.music ** 2 * (this.ducked ? 0.35 : 1), now, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx ** 2, now, 0.02);
  }

  /** Lower the music while a menu covers the game. */
  duck(on: boolean): void {
    if (on === this.ducked) return;
    this.ducked = on;
    this.applyVolumes();
  }

  play(name: SfxName, volume = 1): void {
    if (this.ctx) this.sfx.play(name, volume);
  }

  playMusic(id: string | null): void {
    this.wanted = id;
    if (this.ctx) this.music.play(id);
  }

  get currentMusic(): string | null {
    return this.wanted;
  }

  update(): void {
    if (this.ctx && this.ctx.state === 'running') this.music.update();
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }
}
