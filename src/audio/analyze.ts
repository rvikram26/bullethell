import { MusicPlayer, SONG_IDS } from './music';
import { SFX_NAMES, SfxBank } from './sfx';

export interface LevelReport {
  peak: number;
  rms: number;
}

function levels(data: Float32Array, gain = 1): LevelReport {
  let peak = 0;
  let sum = 0;
  for (const v of data) {
    const a = Math.abs(v * gain);
    if (a > peak) peak = a;
    sum += v * v * gain * gain;
  }
  return { peak, rms: Math.sqrt(sum / Math.max(1, data.length)) };
}

/**
 * Debug helper: renders a few seconds of every song offline and reports peak and RMS levels, so
 * the mix can be checked for clipping or silence without listening.
 */
export async function analyzeAudio(seconds = 6): Promise<{ music: Record<string, LevelReport>; sfx: Record<string, LevelReport> }> {
  const music: Record<string, LevelReport> = {};
  for (const id of SONG_IDS) {
    const sr = 22050;
    const ctx = new OfflineAudioContext(1, Math.ceil(sr * seconds), sr);
    const player = new MusicPlayer();
    player.init(ctx, ctx.destination);
    player.play(id, 0);
    player.scheduleUntil(seconds);
    const buf = await ctx.startRendering();
    music[id] = levels(buf.getChannelData(0));
  }
  const sfx: Record<string, LevelReport> = {};
  const ctx = new OfflineAudioContext(1, 22050, 22050);
  const bank = new SfxBank();
  bank.init(ctx, ctx.destination);
  for (const name of SFX_NAMES) {
    const b = bank.buffer(name);
    if (b) sfx[name] = levels(b.getChannelData(0), bank.gainOf(name));
  }
  return { music, sfx };
}
