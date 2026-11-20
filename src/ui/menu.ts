import { drawGlow, glowHex } from '../render/glow';
import { UI } from '../render/palette';
import { drawText, FONT_TITLE, type TextOpts } from '../render/text';
import type { App } from '../app';

export interface MenuItem {
  label: string | (() => string);
  /** Value shown to the right of the label (options). */
  value?: () => string;
  onConfirm?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  disabled?: () => boolean;
  /** Short description shown under the menu while the item is selected. */
  hint?: string | (() => string);
  /** Play the confirm sound (default true). */
  quietConfirm?: boolean;
}

export interface MenuStyle {
  x: number;
  y: number;
  spacing: number;
  size: number;
  align: CanvasTextAlign;
  /** For option menus: x position of the value column. */
  valueX?: number;
  font?: string;
  color?: string;
}

/** A vertical keyboard menu with wrap-around, held-key repeat and left/right adjustments. */
export class Menu {
  index = 0;
  private t = 0;
  private flash = 0;

  constructor(
    public items: MenuItem[],
    private readonly onCancel: (() => void) | null = null,
  ) {
    this.index = Math.max(0, items.findIndex((i) => !i.disabled?.()));
  }

  get selected(): MenuItem {
    return this.items[this.index];
  }

  private move(dir: number): void {
    const n = this.items.length;
    for (let k = 1; k <= n; k++) {
      const i = (this.index + dir * k + n * 4) % n;
      if (!this.items[i].disabled?.()) {
        this.index = i;
        return;
      }
    }
  }

  update(app: App): void {
    this.t++;
    if (this.flash > 0) this.flash--;
    const nav = app.input.nav;
    if (nav.up) {
      this.move(-1);
      app.audio.play('menu-move');
    } else if (nav.down) {
      this.move(1);
      app.audio.play('menu-move');
    }
    const item = this.selected;
    if (!item) return;
    if (nav.left && item.onLeft) {
      item.onLeft();
      app.audio.play('menu-move');
    } else if (nav.right && item.onRight) {
      item.onRight();
      app.audio.play('menu-move');
    } else if (nav.confirm) {
      if (item.onConfirm && !item.disabled?.()) {
        if (!item.quietConfirm) app.audio.play('menu-ok');
        this.flash = 10;
        item.onConfirm();
      } else if (item.onRight) {
        item.onRight();
        app.audio.play('menu-move');
      }
    } else if (nav.cancel && this.onCancel) {
      app.audio.play('menu-cancel');
      this.onCancel();
    }
  }

  draw(ctx: CanvasRenderingContext2D, st: MenuStyle, alpha = 1): void {
    this.items.forEach((item, i) => {
      const sel = i === this.index;
      const dis = item.disabled?.() ?? false;
      const label = typeof item.label === 'function' ? item.label() : item.label;
      const y = st.y + i * st.spacing;
      const opts: TextOpts = {
        size: st.size,
        font: st.font ?? FONT_TITLE,
        bold: sel,
        color: dis ? UI.faint : sel ? (this.flash > 0 && this.flash % 4 < 2 ? '#ffffff' : UI.gold) : st.color ?? UI.ink,
        align: st.align,
        alpha,
        shadow: 'rgba(0,0,0,0.7)',
      };
      if (sel) {
        const bob = Math.sin(this.t * 0.12) * 2;
        const w = estimateWidth(ctx, label, opts);
        const left = st.align === 'center' ? st.x - w / 2 : st.align === 'right' ? st.x - w : st.x;
        drawGlow(ctx, glowHex('#ffc95a', true), left - 16 + bob, y - st.size * 0.35, 6, alpha);
        drawGlow(ctx, glowHex('#ffb84a'), left + w / 2, y - st.size * 0.35, w * 0.7, 0.12 * alpha);
      }
      drawText(ctx, label, st.x, y, opts);
      if (item.value && st.valueX !== undefined) {
        const v = item.value();
        const arrows = item.onLeft || item.onRight;
        drawText(ctx, sel && arrows ? `<  ${v}  >` : v, st.valueX, y, { ...opts, align: 'center', bold: false, color: sel ? '#ffffff' : UI.dim });
      }
    });
    const hintSrc = this.selected?.hint;
    const hint = typeof hintSrc === 'function' ? hintSrc() : hintSrc;
    if (hint) {
      drawText(ctx, hint, st.x, st.y + this.items.length * st.spacing + 8, {
        size: 11,
        font: FONT_TITLE,
        italic: true,
        color: UI.dim,
        align: st.align === 'center' ? 'center' : 'left',
        alpha,
      });
    }
  }
}

function estimateWidth(ctx: CanvasRenderingContext2D, s: string, o: TextOpts): number {
  ctx.save();
  ctx.font = `${o.bold ? 'bold ' : ''}${o.size ?? 14}px ${o.font ?? FONT_TITLE}`;
  const w = ctx.measureText(s).width;
  ctx.restore();
  return w;
}
