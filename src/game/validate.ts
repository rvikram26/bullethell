import { DIFFICULTY_LIST } from '../data/difficulty';
import type { GameData } from '../data/registry';
import type { BulletDef, BulletEvent, EmitterDef, TimelineStep } from '../data/types';
import { PatternBank } from './compile';

/**
 * Cross-checks the data tables: every id that one table refers to must exist in another, every
 * pattern must compile on every difficulty, and every stage must end. Returns human-readable
 * problems (an empty list means the data is consistent).
 */
export function validateData(data: GameData, knownTracks?: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  const has = <T>(table: Record<string, T>, id: string | undefined): boolean => id === undefined || id in table;

  for (const [id, e] of Object.entries(data.enemies)) {
    if (!has(data.paths, e.path)) problems.push(`enemy ${id}: unknown path "${e.path}"`);
    if (!has(data.patterns, e.pattern)) problems.push(`enemy ${id}: unknown pattern "${e.pattern}"`);
  }

  for (const [id, b] of Object.entries(data.bosses)) {
    if (b.phases.length === 0) problems.push(`boss ${id}: no phases`);
    b.phases.forEach((p, i) => {
      if (!(p.pattern in data.patterns)) problems.push(`boss ${id} phase ${i}: unknown pattern "${p.pattern}"`);
      if (p.hp <= 0 || p.time <= 0) problems.push(`boss ${id} phase ${i}: hp and time must be positive`);
    });
  }

  data.stages.forEach((stage, si) => {
    const where = `stage ${si + 1}`;
    if (knownTracks) {
      if (!knownTracks.has(stage.stageMusic)) problems.push(`${where}: unknown stage music "${stage.stageMusic}"`);
      if (!knownTracks.has(stage.bossMusic)) problems.push(`${where}: unknown boss music "${stage.bossMusic}"`);
    }
    const last = stage.steps[stage.steps.length - 1] as TimelineStep | undefined;
    if (!last || last.type !== 'end') problems.push(`${where}: the last step must be { type: 'end' }`);
    if (!stage.steps.some((s) => s.type === 'boss')) problems.push(`${where}: no boss step`);

    let lastT = -1;
    for (const s of stage.steps) {
      if (s.t < lastT) problems.push(`${where}: steps must be listed in time order (t=${s.t} follows t=${lastT})`);
      lastT = s.t;
      switch (s.type) {
        case 'spawn':
        case 'wave':
          if (!(s.enemy in data.enemies)) problems.push(`${where}: unknown enemy "${s.enemy}"`);
          if (!has(data.paths, s.path)) problems.push(`${where}: unknown path "${s.path}"`);
          if (!has(data.patterns, s.pattern)) problems.push(`${where}: unknown pattern "${s.pattern}"`);
          break;
        case 'boss':
          if (!(s.boss in data.bosses)) problems.push(`${where}: unknown boss "${s.boss}"`);
          if (!has(data.dialogues, s.before)) problems.push(`${where}: unknown dialogue "${s.before}"`);
          if (!has(data.dialogues, s.after)) problems.push(`${where}: unknown dialogue "${s.after}"`);
          break;
        case 'dialogue':
          if (!(s.id in data.dialogues)) problems.push(`${where}: unknown dialogue "${s.id}"`);
          break;
        case 'music':
          if (knownTracks && s.track !== null && !knownTracks.has(s.track)) problems.push(`${where}: unknown track "${s.track}"`);
          break;
        default:
          break;
      }
    }
  });

  for (const [id, d] of Object.entries(data.dialogues)) {
    if (d.lines.length === 0) problems.push(`dialogue ${id}: no lines`);
    for (const l of d.lines) if (l.text.length > 110) problems.push(`dialogue ${id}: line too long (${l.text.length}): "${l.text.slice(0, 30)}..."`);
  }

  // Compile everything for every difficulty; the compiler throws on unknown sprites or colours.
  DIFFICULTY_LIST.forEach((diff, di) => {
    const bank = new PatternBank(data.patterns, data.paths, diff, di);
    for (const id of Object.keys(data.patterns)) {
      try {
        bank.pattern(id);
      } catch (err) {
        problems.push(`pattern ${id} (${diff.id}): ${(err as Error).message}`);
      }
    }
    for (const id of Object.keys(data.paths)) {
      try {
        bank.path(id);
      } catch (err) {
        problems.push(`path ${id}: ${(err as Error).message}`);
      }
    }
  });

  for (const [id, p] of Object.entries(data.patterns)) {
    if (p.emitters.length === 0) problems.push(`pattern ${id}: no emitters`);
    p.emitters.forEach((e, i) => checkEmitter(e, `pattern ${id} emitter ${i}`, problems));
  }

  return problems;
}

function checkEmitter(e: EmitterDef, where: string, problems: string[]): void {
  const interval = Array.isArray(e.interval) ? Math.min(...(e.interval as number[])) : (e.interval as number);
  if (!(interval > 0)) problems.push(`${where}: interval must be > 0`);
  checkBullet(e.bullet, where, problems, 0);
}

function checkBullet(b: BulletDef, where: string, problems: string[], depth: number): void {
  if (depth > 6) {
    problems.push(`${where}: bullet events nest deeper than 6 levels`);
    return;
  }
  const events: BulletEvent[] = b.events ?? [];
  if (events.length > 200) problems.push(`${where}: too many events on one bullet`);
  for (const ev of events) {
    if (ev.at < 0) problems.push(`${where}: negative event time`);
    if (ev.do === 'split' || ev.do === 'morph') checkBullet(ev.bullet, where, problems, depth + 1);
  }
}
