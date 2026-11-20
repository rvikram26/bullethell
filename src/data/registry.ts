import { STAGE1_BOSSES } from './bosses/stage1';
import { STAGE2_BOSSES } from './bosses/stage2';
import { STAGE3_BOSSES } from './bosses/stage3';
import { DIALOGUES } from './dialogue';
import { ENEMIES } from './enemies';
import { PATHS } from './paths';
import { STAGE1_PATTERNS } from './patterns/stage1';
import { STAGE2_PATTERNS } from './patterns/stage2';
import { STAGE3_PATTERNS } from './patterns/stage3';
import { STAGE1 } from './stages/stage1';
import { STAGE2 } from './stages/stage2';
import { STAGE3 } from './stages/stage3';
import type { BossDef, DialogueDef, EnemyDef, PathDef, PatternDef, StageDef } from './types';

/** Everything the simulation reads, gathered in one place. */
export interface GameData {
  patterns: Record<string, PatternDef>;
  paths: Record<string, PathDef>;
  enemies: Record<string, EnemyDef>;
  bosses: Record<string, BossDef>;
  stages: StageDef[];
  dialogues: Record<string, DialogueDef>;
}

export const GAME_DATA: GameData = {
  patterns: { ...STAGE1_PATTERNS, ...STAGE2_PATTERNS, ...STAGE3_PATTERNS },
  paths: PATHS,
  enemies: ENEMIES,
  bosses: { ...STAGE1_BOSSES, ...STAGE2_BOSSES, ...STAGE3_BOSSES },
  stages: [STAGE1, STAGE2, STAGE3],
  dialogues: DIALOGUES,
};
