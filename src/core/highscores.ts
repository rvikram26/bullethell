import { DIFFICULTY_IDS, type DifficultyId } from '../data/types';
import { store } from './storage';

export interface ScoreEntry {
  name: string;
  score: number;
  /** Last stage reached (1-3). */
  stage: number;
  cleared: boolean;
  continues: number;
  /** ISO date, YYYY-MM-DD. */
  date: string;
}

export type ScoreTable = Record<DifficultyId, ScoreEntry[]>;

export const TABLE_SIZE = 10;
export const NAME_MAX = 12;
const KEY = 'scores.v1';

const DEFAULT_NAMES = ['Wren', 'Tamsin', 'Odalys', 'Brindle', 'Vesper', 'Kessra', 'Auriel', 'Halcyra', 'Lamplight', 'Tidewatch'];

function defaults(diff: DifficultyId): ScoreEntry[] {
  const base = { easy: 500_000, normal: 1_000_000, hard: 1_500_000, lunatic: 2_000_000 }[diff];
  return DEFAULT_NAMES.map((name, i) => ({
    name,
    score: Math.round((base * (TABLE_SIZE - i)) / TABLE_SIZE / 1000) * 1000,
    stage: i < 3 ? 3 : i < 6 ? 2 : 1,
    cleared: false,
    continues: 0,
    date: '2000-01-01',
  }));
}

export function cleanName(raw: string): string {
  // printable characters only, collapsed whitespace
  return raw
    .replace(/[^\x20-\x7E\u00A0-\u024F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX);
}

function sanitizeEntry(raw: unknown): ScoreEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const score = typeof r.score === 'number' && Number.isFinite(r.score) ? Math.max(0, Math.floor(r.score)) : null;
  if (score === null) return null;
  const name = typeof r.name === 'string' ? cleanName(r.name) : '';
  const stage = typeof r.stage === 'number' ? Math.min(3, Math.max(1, Math.floor(r.stage))) : 1;
  const date = typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : '2000-01-01';
  const continues = typeof r.continues === 'number' ? Math.min(99, Math.max(0, Math.floor(r.continues))) : 0;
  return { name: name || 'Nameless', score, stage, cleared: r.cleared === true, continues, date };
}

export function sanitizeTable(raw: unknown): ScoreTable {
  const out = {} as ScoreTable;
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  for (const d of DIFFICULTY_IDS) {
    const list = Array.isArray(r[d]) ? (r[d] as unknown[]).map(sanitizeEntry).filter((e): e is ScoreEntry => e !== null) : [];
    out[d] = (list.length > 0 ? list : defaults(d)).sort((a, b) => b.score - a.score).slice(0, TABLE_SIZE);
  }
  return out;
}

export function loadScores(): ScoreTable {
  return sanitizeTable(store.read<unknown>(KEY, null));
}

export function saveScores(t: ScoreTable): void {
  store.write(KEY, t);
}

export function qualifies(t: ScoreTable, diff: DifficultyId, score: number): boolean {
  const list = t[diff];
  return score > 0 && (list.length < TABLE_SIZE || score > list[list.length - 1].score);
}

/** Insert an entry and return its rank (0-based), or -1 if it did not make the table. */
export function insertScore(t: ScoreTable, diff: DifficultyId, e: ScoreEntry): number {
  if (!qualifies(t, diff, e.score)) return -1;
  const list = t[diff];
  let idx = list.findIndex((x) => e.score > x.score);
  if (idx < 0) idx = list.length;
  list.splice(idx, 0, { ...e, name: cleanName(e.name) || 'Nameless' });
  if (list.length > TABLE_SIZE) list.length = TABLE_SIZE;
  return idx;
}

export function topScore(t: ScoreTable, diff: DifficultyId): number {
  return t[diff][0]?.score ?? 0;
}

export function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
