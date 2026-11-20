import type { App, Scene } from '../app';
import { SCREEN_H, SCREEN_W } from '../core/constants';
import { type Action, ACTION_LABELS, ACTIONS, bindingLabel, cloneBindings, DEFAULT_BINDINGS, rebind } from '../core/input';
import { clamp } from '../core/math';
import { UI } from '../render/palette';
import { drawText, FONT_TITLE, FONT_UI, panel } from '../render/text';
import { Menu, type MenuItem } from '../ui/menu';
import { footer, heading, menuBackdrop, tickBackdrop } from './common';

type VolumeKey = 'master' | 'music' | 'sfx';

export class OptionsScene implements Scene {
  readonly id = 'options';
  private readonly menu: Menu;

  constructor(
    private readonly app: App,
    back: () => Scene,
  ) {
    const s = () => app.settings;
    const vol = (key: VolumeKey, label: string, hint: string): MenuItem => ({
      label,
      value: () => `${Math.round(s()[key] * 100)}%`,
      onLeft: () => this.setVolume(key, -0.1),
      onRight: () => this.setVolume(key, 0.1),
      hint,
    });
    const toggle = (label: string, get: () => boolean, set: (v: boolean) => void, hint: string): MenuItem => ({
      label,
      value: () => (get() ? 'On' : 'Off'),
      onLeft: () => this.change(() => set(!get())),
      onRight: () => this.change(() => set(!get())),
      hint,
    });
    this.menu = new Menu(
      [
        vol('master', 'Master Volume', 'Overall loudness.'),
        vol('music', 'Music Volume', 'Background music.'),
        vol('sfx', 'Sound Volume', 'Shots, explosions and menu sounds.'),
        {
          label: 'Fullscreen',
          value: () => (app.fullscreen ? 'On' : 'Off'),
          onConfirm: () => app.toggleFullscreen(),
          onLeft: () => app.toggleFullscreen(),
          onRight: () => app.toggleFullscreen(),
          hint: 'Fill the screen. In Chrome, hold Esc to leave fullscreen.',
        },
        { label: 'Key Config', hint: 'Change the keys for every action.', onConfirm: () => app.goto(new KeyConfigScene(app, () => new OptionsScene(app, back))) },
        toggle('Screen Shake', () => s().screenShake, (v) => (s().screenShake = v), 'Shake the playfield on big explosions.'),
        toggle('Show FPS', () => s().showFps, (v) => (s().showFps = v), 'Frame rate counter in the corner.'),
        {
          label: 'Graphics',
          value: () => (s().quality === 2 ? 'Sharp' : 'Fast'),
          onLeft: () => this.change(() => (s().quality = s().quality === 2 ? 1 : 2)),
          onRight: () => this.change(() => (s().quality = s().quality === 2 ? 1 : 2)),
          hint: 'Fast renders at a lower resolution for slower computers.',
        },
        { label: 'Back', onConfirm: () => app.goto(back()) },
      ],
      () => app.goto(back()),
    );
  }

  private change(fn: () => void): void {
    fn();
    this.app.applySettings();
  }

  private setVolume(key: VolumeKey, delta: number): void {
    const s = this.app.settings;
    s[key] = clamp(Math.round((s[key] + delta) * 10) / 10, 0, 1);
    this.app.applySettings();
    if (key !== 'music') this.app.audio.play('item');
  }

  update(app: App): void {
    tickBackdrop();
    this.menu.update(app);
  }

  render(ctx: CanvasRenderingContext2D): void {
    menuBackdrop(ctx, 0.6);
    heading(ctx, 'Options');
    panel(ctx, 120, 112, SCREEN_W - 240, 324, 1);
    this.menu.draw(ctx, { x: 150, y: 146, spacing: 29, size: 16, align: 'left', valueX: 418 });
    footer(ctx, 'Up/Down: choose   Left/Right: change   Z: select   X: back');
  }
}

export class KeyConfigScene implements Scene {
  readonly id = 'key-config';
  private readonly menu: Menu;
  private capturing: Action | null = null;
  private t = 0;

  constructor(
    private readonly app: App,
    back: () => Scene,
  ) {
    const items: MenuItem[] = ACTIONS.map((a) => ({
      label: ACTION_LABELS[a],
      value: () => bindingLabel(app.settings.bindings[a]),
      onConfirm: () => this.capture(a),
      quietConfirm: true,
    }));
    items.push(
      {
        label: 'Reset to Defaults',
        onConfirm: () => {
          app.settings.bindings = cloneBindings(DEFAULT_BINDINGS);
          app.applySettings();
        },
      },
      { label: 'Back', onConfirm: () => app.goto(back()) },
    );
    this.menu = new Menu(items, () => app.goto(back()));
  }

  private capture(action: Action): void {
    const app = this.app;
    this.capturing = action;
    this.t = 0;
    app.audio.play('menu-ok');
    app.input.captureNextKey((code) => {
      app.settings.bindings = rebind(app.settings.bindings, action, code);
      app.applySettings();
      app.audio.play('menu-ok');
      this.capturing = null;
    });
  }

  exit(app: App): void {
    app.input.cancelCapture();
  }

  update(app: App): void {
    this.t++;
    tickBackdrop();
    if (this.capturing) return;
    this.menu.update(app);
  }

  render(ctx: CanvasRenderingContext2D): void {
    menuBackdrop(ctx, 0.6);
    heading(ctx, 'Key Config', 'Menus always accept the arrow keys, Enter and Esc as well.');
    panel(ctx, 110, 116, SCREEN_W - 220, 316, 1);
    this.menu.draw(ctx, { x: 140, y: 148, spacing: 27, size: 15, align: 'left', valueX: 420 });
    if (this.capturing) {
      ctx.fillStyle = 'rgba(2, 3, 12, 0.7)';
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      panel(ctx, SCREEN_W / 2 - 170, 190, 340, 100, 1);
      drawText(ctx, `Press a key for "${ACTION_LABELS[this.capturing]}"`, SCREEN_W / 2, 232, { size: 16, font: FONT_TITLE, italic: true, color: UI.gold, align: 'center' });
      drawText(ctx, 'A key already in use swaps with this one.', SCREEN_W / 2, 262, { size: 11, font: FONT_UI, color: UI.dim, align: 'center' });
    }
    footer(ctx, 'Z / Enter: rebind   X / Esc: back');
  }
}
