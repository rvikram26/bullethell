import { FIELD_H, FIELD_W, FIELD_X, FIELD_Y } from '../core/constants';
import { clamp, easeOut, grouped, TAU } from '../core/math';
import { ROT_HEADING, ROT_NONE } from '../data/bulletKinds';
import { SHOT_LEVELS, shotLevelForPower } from '../data/playerShots';
import type { CharacterId } from '../data/types';
import type { Boss } from '../game/boss';
import type { CBullet } from '../game/compile';
import { P_BLAST, P_RING, P_SPARK, P_TEXT } from '../game/particles';
import { BOMB_FRAMES, MODE_DEAD } from '../game/player';
import { SHOT_SPARK } from '../game/shots';
import { BANNER_FRAMES, CUT_IN_FRAMES, MESSAGE_FRAMES, type World } from '../game/world';
import { BulletAtlas, KIND_BASE_SIZE } from './atlas';
import { type Background, makeBackground } from './backgrounds';
import { drawFieldCharacter, lantern, LOOKS, PORTRAIT_H, PORTRAIT_W, portrait } from './characters';
import { drawEnemy } from './enemySprites';
import { drawGlow, glowFor, glowHex, glowSprite } from './glow';
import { ItemSprites } from './itemSprites';
import { hexA, rgba, SWATCHES, UI } from './palette';
import { prerender } from './surface';
import { drawText, FONT_MONO, FONT_TITLE, FONT_UI, measure, panel, roundRect, wrapText } from './text';

const SHOT_RES = 3;

/** Draws one World into the playfield rectangle. Owns all sprite caches it needs. */
export class WorldRenderer {
  private readonly atlas = new BulletAtlas();
  private readonly items = new ItemSprites();
  private readonly boltSprite: HTMLCanvasElement;
  private readonly sparkSprite: HTMLCanvasElement;
  private bg: Background | null = null;
  private bgId = '';
  private spellFade = 0;
  private mood = 0;
  private hpShown = 0;
  private lastPhase = -1;
  private readonly wrapCache = new Map<string, string[]>();
  private frame = 0;

  constructor() {
    this.boltSprite = prerender(8, 22, SHOT_RES, (ctx) => {
      const g = ctx.createLinearGradient(0, -11, 0, 11);
      g.addColorStop(0, 'rgba(255, 250, 220, 0.95)');
      g.addColorStop(0.4, 'rgba(255, 200, 90, 0.8)');
      g.addColorStop(1, 'rgba(255, 120, 40, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.4, 11, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.ellipse(0, -3, 1.3, 6, 0, 0, TAU);
      ctx.fill();
    });
    this.sparkSprite = prerender(14, 14, SHOT_RES, (ctx) => {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 7);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255, 220, 120, 0.85)');
      g.addColorStop(1, 'rgba(255, 150, 60, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, TAU);
      ctx.fill();
    });
  }

  /** Advance purely visual state by one simulation step. */
  step(w: World): void {
    this.frame++;
    if (this.bgId !== w.stage.background || !this.bg) {
      this.bg = makeBackground(w.stage.background);
      this.bgId = w.stage.background;
    }
    this.bg.update();
    const b = w.boss;
    const spellOn = !!b && b.spell && (b.mode === 'warmup' || b.mode === 'fight');
    this.spellFade = clamp(this.spellFade + (spellOn ? 0.04 : -0.05), 0, 1);
    this.mood = clamp(this.mood + (b && !b.def.midboss ? 0.01 : -0.01), 0, 1);
    if (b) {
      if (b.phase !== this.lastPhase) {
        this.lastPhase = b.phase;
        this.hpShown = 0;
      }
      const target = b.mode === 'fight' ? b.hp / b.maxHp : b.mode === 'warmup' ? Math.min(1, b.modeT / Math.max(1, b.warmup)) : b.mode === 'break' ? 0 : this.hpShown;
      this.hpShown += (clamp(target, 0, 1) - this.hpShown) * (b.mode === 'warmup' ? 0.25 : 0.35);
    } else {
      this.lastPhase = -1;
    }
  }

  draw(ctx: CanvasRenderingContext2D, w: World, shakeX = 0, shakeY = 0): void {
    ctx.save();
    ctx.translate(FIELD_X + shakeX, FIELD_Y + shakeY);
    ctx.beginPath();
    ctx.rect(0, 0, FIELD_W, FIELD_H);
    ctx.clip();

    this.bg?.draw(ctx, this.mood);
    if (this.spellFade > 0 && w.boss) this.drawSpellBackdrop(ctx, w.boss);

    this.drawEnemies(ctx, w);
    if (w.boss) this.drawBoss(ctx, w, w.boss);
    this.drawShots(ctx, w);
    this.drawItems(ctx, w);
    this.drawPlayer(ctx, w);
    this.drawBombFx(ctx, w);
    this.drawBullets(ctx, w);
    this.drawParticles(ctx, w);
    this.drawHitbox(ctx, w);
    if (w.clearFx) {
      const c = w.clearFx;
      ctx.strokeStyle = `rgba(255, 240, 200, ${0.7 * (1 - c.t / 40)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 10 + easeOut(c.t / 40) * 130, 0, TAU);
      ctx.stroke();
    }

    if (w.boss) this.drawBossUi(ctx, w, w.boss);
    if (w.cutIn) this.drawCutIn(ctx, w);
    this.drawMessages(ctx, w);
    if (w.banner) this.drawBanner(ctx, w);
    if (w.dialogue) this.drawDialogue(ctx, w);
    if (w.endTimer > 0) this.drawClearTally(ctx, w);
    if (w.flash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.6, w.flash / 14)})`;
      ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------------------------------

  private drawSpellBackdrop(ctx: CanvasRenderingContext2D, b: Boss): void {
    const f = this.spellFade;
    const s = SWATCHES[b.colorIdx];
    ctx.fillStyle = `rgba(2, 2, 10, ${0.5 * f})`;
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    const cx = FIELD_W / 2;
    const cy = FIELD_H * 0.42;
    drawGlow(ctx, glowSprite(s.r, s.g, s.b), cx, cy, 260, 0.22 * f);
    const t = this.frame;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = rgba(s, 0.32 * f);
    ctx.lineWidth = 1.5;
    for (const [r, dir] of [
      [170, 1],
      [128, -1],
      [80, 1],
    ] as const) {
      ctx.save();
      ctx.rotate(t * 0.004 * dir);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.stroke();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU;
        const len = i % 3 === 0 ? 12 : 5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.lineTo(Math.cos(a) * (r - len), Math.sin(a) * (r - len));
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.rotate(-t * 0.006);
    ctx.beginPath();
    for (let i = 0; i <= 7; i++) {
      const a = (i * 3 * TAU) / 7;
      const x = Math.cos(a) * 128;
      const y = Math.sin(a) * 128;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawEnemies(ctx: CanvasRenderingContext2D, w: World): void {
    for (const e of w.enemies) {
      if (!e.active) continue;
      drawEnemy(ctx, e.sprite, e.x, e.y, e.radius, SWATCHES[e.tint], e.age, e.hitFlash);
    }
  }

  private drawBoss(ctx: CanvasRenderingContext2D, w: World, b: Boss): void {
    const s = SWATCHES[b.colorIdx];
    const t = w.tick;
    if (b.mode === 'dying' && (b.modeT >> 2) % 2 === 0 && b.modeT > 60) return;
    // circle beneath the boss while it attacks
    if (b.mode === 'fight' || b.mode === 'warmup') {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.strokeStyle = rgba(s, 0.55);
      ctx.lineWidth = 1.5;
      for (const [r, dir] of [
        [34, 1],
        [26, -1],
      ] as const) {
        ctx.save();
        ctx.rotate(t * 0.03 * dir);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, TAU);
        ctx.stroke();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 2, 0, TAU);
          ctx.fillStyle = rgba(s, 0.8);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.restore();
    }
    drawGlow(ctx, glowSprite(s.r, s.g, s.b), b.x, b.y, 46, 0.45 + 0.1 * Math.sin(t * 0.08));
    drawFieldCharacter(ctx, LOOKS[b.def.character], b.x, b.y, 1.2, t, b.lean);
    if (b.hitFlash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, glowSprite(255, 255, 255), b.x, b.y, 26, 0.35);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  private drawShots(ctx: CanvasRenderingContext2D, w: World): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.75;
    const m = ctx.getTransform();
    for (const s of w.shots.shots) {
      if (!s.active) continue;
      if (s.sprite === SHOT_SPARK) {
        ctx.drawImage(this.sparkSprite, s.x - 6, s.y - 6, 12, 12);
      } else {
        const sp = Math.hypot(s.vx, s.vy) || 1;
        const c = -s.vy / sp;
        const sn = s.vx / sp;
        ctx.transform(c, sn, -sn, c, s.x, s.y);
        ctx.drawImage(this.boltSprite, -4, -11, 8, 22);
        ctx.setTransform(m);
      }
    }
    ctx.restore();
  }

  private drawItems(ctx: CanvasRenderingContext2D, w: World): void {
    const spr = this.items;
    for (const it of w.items.items) {
      if (!it.active) continue;
      const size = spr.sizes[it.type];
      if (it.y < -size * 0.4) {
        ctx.drawImage(spr.markers[it.type], it.x - 5, 3, 10, 8);
        continue;
      }
      ctx.drawImage(spr.sprites[it.type], it.x - size / 2, it.y - size / 2, size, size);
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, w: World): void {
    const p = w.player;
    if (p.mode === MODE_DEAD) return;
    const blink = p.invuln > 0 && p.bombT <= 0 && (p.anim >> 2) % 2 === 0;
    ctx.save();
    if (blink) ctx.globalAlpha = 0.45;
    const lvl = SHOT_LEVELS[shotLevelForPower(w.run.power)];
    for (let k = 0; k < lvl.options.length; k++) {
      const o = p.options[k];
      lantern(ctx, o.x, o.y + Math.sin(p.anim * 0.1 + k) * 1.2, 7, p.anim + k * 13, 0.8);
    }
    drawFieldCharacter(ctx, LOOKS.wren, p.x, p.y + 2, 0.95, p.anim, p.tilt);
    lantern(ctx, p.x + 11 + p.tilt * 2, p.y + 9, 6.5, p.anim);
    ctx.restore();
  }

  private drawHitbox(ctx: CanvasRenderingContext2D, w: World): void {
    const p = w.player;
    const f = p.focusFade;
    if (f <= 0 || p.mode === MODE_DEAD) return;
    ctx.save();
    ctx.globalAlpha = f;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.anim * 0.05);
    ctx.strokeStyle = 'rgba(255, 220, 140, 0.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 21, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 21, Math.sin(a) * 21, 2.2, 0, TAU);
      ctx.fillStyle = 'rgba(255, 230, 160, 0.9)';
      ctx.fill();
    }
    ctx.rotate(-p.anim * 0.1);
    ctx.strokeStyle = 'rgba(127, 216, 255, 0.5)';
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // the hitbox itself, drawn above bullets
    ctx.save();
    ctx.globalAlpha = f;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.4, 0, TAU);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = '#ff3b52';
    ctx.stroke();
    ctx.restore();
  }

  private drawBombFx(ctx: CanvasRenderingContext2D, w: World): void {
    const p = w.player;
    if (p.bombT <= 0) return;
    const t = BOMB_FRAMES - p.bombT;
    const fade = Math.min(1, p.bombT / 40);
    const radius = Math.min(760, 40 + t * 18);
    ctx.save();
    ctx.fillStyle = `rgba(255, 190, 90, ${0.12 * fade})`;
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255, 210, 120, ${0.65 * fade})`;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 255, 230, ${0.8 * fade})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    const n = 10;
    const orbit = 34 + t * 1.6;
    for (let i = 0; i < n; i++) {
      const a = t * 0.06 + (i / n) * TAU;
      const x = p.x + Math.cos(a) * orbit;
      const y = p.y + Math.sin(a) * orbit - t * 0.4;
      drawGlow(ctx, glowHex('#ffc95a', true), x, y, 16, 0.7 * fade);
    }
    ctx.restore();
    if (fade > 0.2) {
      for (let i = 0; i < n; i += 2) {
        const a = t * 0.06 + (i / n) * TAU;
        lantern(ctx, p.x + Math.cos(a) * orbit, p.y + Math.sin(a) * orbit - t * 0.4, 8, t + i * 7, 0);
      }
    }
  }

  private drawBullets(ctx: CanvasRenderingContext2D, w: World): void {
    const pool = w.bullets;
    const n = pool.count;
    if (n === 0) return;
    const img = this.atlas.canvas;
    const cells = this.atlas.cells;
    const m = ctx.getTransform();
    const a0 = m.a;
    const ox = m.e;
    const oy = m.f;
    const px = pool.x;
    const py = pool.y;
    let alphaSet = false;
    for (let i = 0; i < n; i++) {
      const spec = pool.spec[i] as CBullet;
      const cell = cells[spec.atlas];
      let size = (cell.size * spec.size) / KIND_BASE_SIZE[spec.kind];
      const age = pool.age[i];
      if (age < 6) {
        size *= 1 + (6 - age) * 0.12;
        ctx.globalAlpha = 0.35 + age * 0.11;
        alphaSet = true;
      } else if (alphaSet) {
        ctx.globalAlpha = 1;
        alphaSet = false;
      }
      const half = size / 2;
      if (spec.rotation === ROT_NONE) {
        ctx.setTransform(a0, 0, 0, a0, ox + px[i] * a0, oy + py[i] * a0);
      } else {
        const ang = spec.rotation === ROT_HEADING ? pool.ang[i] : age * 0.09;
        const c = Math.cos(ang) * a0;
        const s = Math.sin(ang) * a0;
        ctx.setTransform(c, s, -s, c, ox + px[i] * a0, oy + py[i] * a0);
      }
      ctx.drawImage(img, cell.sx, cell.sy, cell.sw, cell.sw, -half, -half, size, size);
    }
    ctx.setTransform(m);
    ctx.globalAlpha = 1;
  }

  private drawParticles(ctx: CanvasRenderingContext2D, w: World): void {
    const list = w.particles.list;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of list) {
      if (!p.active || (p.kind !== P_SPARK && p.kind !== P_BLAST)) continue;
      const a = p.life / p.maxLife;
      drawGlow(ctx, glowFor(p.color, p.kind === P_SPARK), p.x, p.y, p.size * (p.kind === P_BLAST ? 1 : 1.4), p.kind === P_BLAST ? a * 0.8 : a);
    }
    ctx.restore();
    for (const p of list) {
      if (!p.active) continue;
      const a = p.life / p.maxLife;
      if (p.kind === P_RING) {
        ctx.strokeStyle = rgba(SWATCHES[p.color], a * 0.8);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.stroke();
      } else if (p.kind === P_TEXT) {
        drawText(ctx, p.text, p.x, p.y, { size: 9, font: FONT_MONO, color: SWATCHES[p.color].light, align: 'center', alpha: Math.min(1, a * 2), shadow: 'rgba(0,0,0,0.6)' });
      }
    }
  }

  // ------------------------------------------------------------------------------------------
  // Overlays
  // ------------------------------------------------------------------------------------------

  private drawBossUi(ctx: CanvasRenderingContext2D, w: World, b: Boss): void {
    const s = SWATCHES[b.colorIdx];
    const showBar = b.mode === 'warmup' || b.mode === 'fight' || b.mode === 'break';
    if (showBar) {
      const x0 = 40;
      const x1 = 338;
      const y = 6;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(x0 - 1, y - 1, x1 - x0 + 2, 6);
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      if (b.spell) {
        g.addColorStop(0, s.light);
        g.addColorStop(1, s.main);
      } else {
        g.addColorStop(0, '#ffffff');
        g.addColorStop(1, '#c8d0ff');
      }
      ctx.fillStyle = g;
      ctx.fillRect(x0, y, (x1 - x0) * this.hpShown, 4);
      // remaining phases
      for (let i = 0; i < b.remainingPhases; i++) {
        drawGlow(ctx, glowSprite(s.r, s.g, s.b, true), 10 + (i % 4) * 7, 8 + Math.floor(i / 4) * 7, 4, 0.9);
      }
      drawText(ctx, b.def.name, 6, 26, { size: 10, font: FONT_UI, bold: true, color: s.light, shadow: 'rgba(0,0,0,0.8)' });

      if (b.mode === 'fight' || b.mode === 'warmup') {
        const left = Math.max(0, (b.limit - b.phaseT) / 60);
        const secs = Math.floor(left);
        const low = left < 10;
        const col = low ? (Math.floor(left * 4) % 2 === 0 ? '#ff6b7f' : '#ffd0d6') : '#ffffff';
        drawText(ctx, String(Math.min(99, secs)).padStart(2, '0'), FIELD_W - 26, 22, { size: 17, font: FONT_MONO, bold: true, color: col, align: 'right', shadow: 'rgba(0,0,0,0.8)' });
        drawText(ctx, `.${String(Math.floor((left % 1) * 100)).padStart(2, '0')}`, FIELD_W - 6, 22, { size: 10, font: FONT_MONO, color: col, align: 'right', shadow: 'rgba(0,0,0,0.8)' });
      }
    }

    // rite name and bonus
    const phase = b.currentPhase;
    if (b.spell && phase?.name && (b.mode === 'warmup' || b.mode === 'fight')) {
      const intro = b.mode === 'warmup' ? b.modeT : 999;
      const u = clamp((intro - 20) / 40, 0, 1);
      const y = 360 + (40 - 360) * easeOut(u);
      const x = FIELD_W - 8;
      const nameW = Math.min(FIELD_W - 16, measure(ctx, phase.name, { size: 12, font: FONT_TITLE, italic: true, bold: true }) + 40);
      ctx.save();
      const grad = ctx.createLinearGradient(x - nameW, 0, x, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, hexA(s.dark, 0.85));
      ctx.fillStyle = grad;
      ctx.fillRect(x - nameW, y - 13, nameW + 8, 18);
      ctx.restore();
      drawText(ctx, phase.name, x, y, { size: 12, font: FONT_TITLE, italic: true, bold: true, color: '#ffffff', align: 'right', shadow: 'rgba(0,0,0,0.9)' });
      if (u >= 1) {
        const failed = b.missed || b.bombed;
        let bonusText = 'Bonus Failed';
        if (!failed) {
          const ratio = b.mode === 'fight' ? clamp(1 - b.phaseT / b.limit, 0, 1) : 1;
          const value = Math.round((phase.bonus ?? 500_000) * w.diff.score * (0.5 + 0.5 * ratio));
          bonusText = `Bonus ${grouped(value)}`;
        }
        drawText(ctx, bonusText, x, y + 13, { size: 9, font: FONT_MONO, color: failed ? '#9aa0b8' : UI.gold, align: 'right', shadow: 'rgba(0,0,0,0.8)' });
      }
    }

    // boss intro card while it arrives
    if (b.mode === 'enter' || (b.mode === 'talk' && w.dialogue && w.dialogue.line === 0)) {
      const a = b.mode === 'enter' ? clamp(b.modeT / 30, 0, 1) : 1;
      drawText(ctx, b.def.title, FIELD_W / 2, 30, { size: 11, font: FONT_TITLE, italic: true, color: s.light, align: 'center', alpha: a, shadow: 'rgba(0,0,0,0.9)' });
      drawText(ctx, b.def.name, FIELD_W / 2, 54, { size: 22, font: FONT_TITLE, bold: true, color: '#ffffff', align: 'center', alpha: a, glow: s.main, glowBlur: 12 });
    }

    // position marker along the bottom edge
    if (b.mode !== 'dying') {
      const mx = clamp(b.x, 16, FIELD_W - 16);
      ctx.fillStyle = hexA(s.dark, 0.85);
      roundRect(ctx, mx - 15, FIELD_H - 11, 30, 11, 3);
      ctx.fill();
      drawText(ctx, 'BOSS', mx, FIELD_H - 2.5, { size: 8, font: FONT_UI, bold: true, color: s.light, align: 'center' });
    }
  }

  private drawCutIn(ctx: CanvasRenderingContext2D, w: World): void {
    const c = w.cutIn;
    if (!c) return;
    const t = c.t;
    const s = SWATCHES[w.boss ? w.boss.colorIdx : 9];
    const inU = easeOut(clamp(t / 22, 0, 1));
    const outU = clamp((t - (CUT_IN_FRAMES - 30)) / 30, 0, 1);
    const alpha = 1 - outU;
    ctx.save();
    ctx.globalAlpha = alpha * 0.55;
    ctx.translate(FIELD_W / 2, FIELD_H / 2);
    ctx.rotate(-0.35);
    for (let i = 0; i < 3; i++) {
      const off = ((t * (4 + i * 2)) % 220) - 110;
      ctx.fillStyle = i === 1 ? rgba(s, 0.35) : 'rgba(255,255,255,0.12)';
      ctx.fillRect(-400 + off, -46 + i * 34, 800, 10 + i * 4);
    }
    ctx.restore();

    const img = portrait(c.boss.character as CharacterId);
    const pw = PORTRAIT_W * 1.05;
    const ph = PORTRAIT_H * 1.05;
    const x = FIELD_W + 40 - inU * 210 - outU * 80;
    const y = FIELD_H * 0.62 + 40 - inU * 40 - outU * 40;
    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.drawImage(img, x - pw / 2, y - ph, pw, ph);
    ctx.restore();
  }

  private drawMessages(ctx: CanvasRenderingContext2D, w: World): void {
    w.messages.forEach((m, i) => {
      const a = m.t < 10 ? m.t / 10 : 1 - clamp((m.t - (MESSAGE_FRAMES - 25)) / 25, 0, 1);
      const color = m.tone === 'good' ? UI.gold : m.tone === 'bad' ? '#a0a6c0' : '#ffffff';
      drawText(ctx, m.text, FIELD_W / 2, 150 + i * 22 - Math.min(10, m.t * 0.5), {
        size: m.text.length > 14 ? 14 : 17,
        font: FONT_TITLE,
        bold: true,
        italic: true,
        color,
        align: 'center',
        alpha: a,
        stroke: 'rgba(0,0,0,0.75)',
        strokeWidth: 3,
      });
    });
  }

  private drawBanner(ctx: CanvasRenderingContext2D, w: World): void {
    const b = w.banner;
    if (!b) return;
    const a = b.t < 30 ? b.t / 30 : 1 - clamp((b.t - (BANNER_FRAMES - 40)) / 40, 0, 1);
    const y = 176;
    ctx.save();
    ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(0, 0, FIELD_W, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 34, FIELD_W, 66);
    ctx.restore();
    drawText(ctx, b.text, FIELD_W / 2, y, { size: 30, font: FONT_TITLE, bold: true, color: UI.gold, align: 'center', alpha: a, glow: '#ff9a3a', glowBlur: 14 });
    drawText(ctx, b.sub, FIELD_W / 2, y + 22, { size: 14, font: FONT_TITLE, italic: true, color: '#e8ecff', align: 'center', alpha: a, shadow: 'rgba(0,0,0,0.8)' });
    if (w.stage.subtitle && b.text.startsWith('Stage')) {
      drawText(ctx, w.stage.subtitle, FIELD_W / 2, y + 40, { size: 10, font: FONT_UI, italic: true, color: UI.dim, align: 'center', alpha: a });
    }
  }

  private wrapped(ctx: CanvasRenderingContext2D, key: string, text: string, width: number): string[] {
    let lines = this.wrapCache.get(key);
    if (!lines) {
      lines = wrapText(ctx, text, width, { size: 13, font: FONT_UI });
      this.wrapCache.set(key, lines);
    }
    return lines;
  }

  private drawDialogue(ctx: CanvasRenderingContext2D, w: World): void {
    const d = w.dialogue;
    if (!d) return;
    const line = d.def.lines[d.line];
    const other = d.def.lines.find((l) => l.who !== 'wren')?.who ?? null;
    const bottom = FIELD_H - 64;
    const fadeIn = clamp(d.t / 12, 0, 1);

    const drawPortrait = (id: CharacterId, cx: number, active: boolean, flip: boolean): void => {
      const img = portrait(id);
      const pw = PORTRAIT_W * 0.92;
      const ph = PORTRAIT_H * 0.92;
      ctx.save();
      ctx.globalAlpha = active ? 1 : 0.45;
      ctx.translate(cx, bottom + (active ? 0 : 6));
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(img, -pw / 2, -ph, pw, ph);
      ctx.restore();
    };
    if (other) drawPortrait(other, FIELD_W - 92, line.who !== 'wren', false);
    drawPortrait('wren', 92, line.who === 'wren', true);

    const bx = 10;
    const by = FIELD_H - 102;
    const bw = FIELD_W - 20;
    const bh = 90;
    panel(ctx, bx, by, bw, bh, 0.96);
    const look = LOOKS[line.who];
    const right = line.who !== 'wren';
    const nameX = right ? bx + bw - 14 : bx + 14;
    drawText(ctx, look.name, nameX, by + 18, { size: 12, font: FONT_TITLE, bold: true, color: look.trim, align: right ? 'right' : 'left', shadow: 'rgba(0,0,0,0.8)' });

    const lines = this.wrapped(ctx, `${d.id}:${d.line}`, line.text, bw - 30);
    let budget = Math.floor(d.t * 1.6);
    lines.forEach((l, i) => {
      if (budget <= 0) return;
      const shown = l.slice(0, budget);
      budget -= l.length + 1;
      drawText(ctx, shown, bx + 15, by + 38 + i * 17, { size: 13, font: FONT_UI, color: '#eef1ff', alpha: fadeIn, shadow: 'rgba(0,0,0,0.6)' });
    });
    if (d.t * 1.6 >= line.text.length && (this.frame >> 4) % 2 === 0) {
      drawText(ctx, 'Z', bx + bw - 16, by + bh - 10, { size: 10, font: FONT_MONO, bold: true, color: UI.gold, align: 'center' });
    }
    drawText(ctx, 'Z: next   X: skip', bx + 14, by + bh - 8, { size: 8, font: FONT_UI, color: UI.faint });
  }

  private drawClearTally(ctx: CanvasRenderingContext2D, w: World): void {
    const t = 160 - w.endTimer;
    const a = clamp(t / 25, 0, 1);
    const y = 180;
    ctx.save();
    ctx.globalAlpha = a;
    panel(ctx, 52, y - 40, FIELD_W - 104, 86, 1);
    ctx.restore();
    drawText(ctx, 'Stage Clear!', FIELD_W / 2, y - 8, { size: 24, font: FONT_TITLE, bold: true, italic: true, color: UI.gold, align: 'center', alpha: a, glow: '#ff9a3a', glowBlur: 10 });
    drawText(ctx, `Clear Bonus  ${grouped(w.clearBonus)}`, FIELD_W / 2, y + 20, { size: 13, font: FONT_MONO, color: '#ffffff', align: 'center', alpha: a });
    drawText(ctx, `Graze ${w.run.graze - w.run.stats.grazeAtStart}   Misses ${w.run.stats.misses}   Bombs ${w.run.stats.bombs}`, FIELD_W / 2, y + 37, {
      size: 10,
      font: FONT_UI,
      color: UI.dim,
      align: 'center',
      alpha: a,
    });
  }
}
