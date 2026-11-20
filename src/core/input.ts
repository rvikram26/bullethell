export type Action = 'up' | 'down' | 'left' | 'right' | 'shoot' | 'bomb' | 'focus' | 'pause';

export const ACTIONS: readonly Action[] = ['up', 'down', 'left', 'right', 'shoot', 'bomb', 'focus', 'pause'];

export const ACTION_LABELS: Record<Action, string> = {
  up: 'Move Up',
  down: 'Move Down',
  left: 'Move Left',
  right: 'Move Right',
  shoot: 'Shoot / Confirm',
  bomb: 'Bomb / Cancel',
  focus: 'Focus (slow)',
  pause: 'Pause',
};

export type Bindings = Record<Action, string[]>;

export const DEFAULT_BINDINGS: Bindings = {
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  shoot: ['KeyZ'],
  bomb: ['KeyX'],
  focus: ['ShiftLeft', 'ShiftRight'],
  pause: ['Escape'],
};

export function cloneBindings(b: Bindings): Bindings {
  const out = {} as Bindings;
  for (const a of ACTIONS) out[a] = [...b[a]];
  return out;
}

/** Validate untrusted (e.g. localStorage) bindings, falling back to defaults per action. */
export function sanitizeBindings(raw: unknown): Bindings {
  const out = cloneBindings(DEFAULT_BINDINGS);
  if (!raw || typeof raw !== 'object') return out;
  for (const a of ACTIONS) {
    const v = (raw as Record<string, unknown>)[a];
    if (Array.isArray(v) && v.length > 0 && v.every((c) => typeof c === 'string' && c.length > 0 && c.length < 32)) {
      out[a] = (v as string[]).slice(0, 3);
    }
  }
  return out;
}

/**
 * Assign `code` as the primary key of `action`. If another action already used that key it receives
 * the key this action used to have, so no action is ever left unbound.
 */
export function rebind(bindings: Bindings, action: Action, code: string): Bindings {
  const next = cloneBindings(bindings);
  const old = next[action][0];
  for (const other of ACTIONS) {
    if (other === action) continue;
    const idx = next[other].indexOf(code);
    if (idx >= 0) {
      if (old !== undefined && !next[other].includes(old)) next[other][idx] = old;
      else next[other].splice(idx, 1);
      if (next[other].length === 0) next[other] = [...DEFAULT_BINDINGS[other]].filter((c) => c !== code);
    }
  }
  // the secondary slots of this action are dropped so the new key is unambiguous
  next[action] = [code];
  for (const other of ACTIONS) if (next[other].length === 0) next[other] = [...DEFAULT_BINDINGS[other]];
  return next;
}

const KEY_NAMES: Record<string, string> = {
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  ShiftLeft: 'L-Shift',
  ShiftRight: 'R-Shift',
  ControlLeft: 'L-Ctrl',
  ControlRight: 'R-Ctrl',
  AltLeft: 'L-Alt',
  AltRight: 'R-Alt',
  Space: 'Space',
  Enter: 'Enter',
  NumpadEnter: 'Num Enter',
  Escape: 'Esc',
  Backspace: 'Bksp',
  Tab: 'Tab',
  Comma: ',',
  Period: '.',
  Slash: '/',
  Semicolon: ';',
  Quote: "'",
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Minus: '-',
  Equal: '=',
  Backquote: '`',
};

export function keyLabel(code: string): string {
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
  return code;
}

export function bindingLabel(codes: readonly string[]): string {
  return codes.map(keyLabel).join(' / ');
}

/** Keys that may never be bound (browser/OS shortcuts). */
export function isReservedKey(code: string): boolean {
  return /^F\d{1,2}$/.test(code) || code.startsWith('Meta') || code === 'ContextMenu' || code === 'OS';
}

export interface Nav {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  confirm: boolean;
  cancel: boolean;
}

type NavKey = keyof Nav;

const NAV_REPEAT_DELAY = 20;
const NAV_REPEAT_RATE = 5;

/**
 * Keyboard state. Raw DOM events are accumulated between simulation steps and turned into a
 * per-step snapshot by `tick()`, so a key tapped and released inside one frame is never lost.
 */
export class Input {
  readonly held = {} as Record<Action, boolean>;
  readonly pressed = {} as Record<Action, boolean>;
  readonly nav: Nav = { up: false, down: false, left: false, right: false, confirm: false, cancel: false };
  /** True when any non-modifier key went down since the previous step. */
  anyPressed = false;
  /** When true, printable characters are queued for `takeTyped()` (name entry). */
  textMode = false;

  private bindings: Bindings = cloneBindings(DEFAULT_BINDINGS);
  private readonly down = new Set<string>();
  private readonly edge = new Set<string>();
  private readonly holdFrames: Record<NavKey, number> = { up: 0, down: 0, left: 0, right: 0, confirm: 0, cancel: 0 };
  private typed: string[] = [];
  private capture: ((code: string) => void) | null = null;
  private onFirstGesture: (() => void) | null = null;

  constructor() {
    for (const a of ACTIONS) {
      this.held[a] = false;
      this.pressed[a] = false;
    }
  }

  attach(target: Window): void {
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.clearAll);
    target.addEventListener('pointerdown', this.onPointer);
  }

  setBindings(b: Bindings): void {
    this.bindings = cloneBindings(b);
  }

  getBindings(): Bindings {
    return cloneBindings(this.bindings);
  }

  /** Register a callback fired on every user gesture (used to unlock and resume audio). */
  onGesture(cb: () => void): void {
    this.onFirstGesture = cb;
  }

  /** The next key press is delivered to `cb` instead of being treated as input. */
  captureNextKey(cb: (code: string) => void): void {
    this.capture = cb;
  }

  cancelCapture(): void {
    this.capture = null;
  }

  isCapturing(): boolean {
    return this.capture !== null;
  }

  takeTyped(): string[] {
    const t = this.typed;
    this.typed = [];
    return t;
  }

  /** Is any physical key bound to `action` currently down? (ignores per-step snapshot) */
  rawHeld(action: Action): boolean {
    return this.bindings[action].some((c) => this.down.has(c));
  }

  private fireGesture(): void {
    this.onFirstGesture?.();
  }

  private onPointer = (): void => {
    this.fireGesture();
  };

  /** Escape is also queued in text mode so name entry can react to it. */
  private queueText(e: KeyboardEvent): void {
    if (e.key.length === 1) this.typed.push(e.key);
    else if (e.key === 'Backspace' || e.key === 'Enter' || e.key === 'Escape') this.typed.push(e.key);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.fireGesture();
    if (this.capture) {
      e.preventDefault();
      if (!e.repeat && !isReservedKey(e.code)) {
        const cb = this.capture;
        this.capture = null;
        cb(e.code);
      }
      return;
    }
    if (this.shouldPrevent(e)) e.preventDefault();
    if (this.textMode && !e.ctrlKey && !e.metaKey && !e.altKey) this.queueText(e);
    if (e.repeat) return;
    this.down.add(e.code);
    this.edge.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.down.delete(e.code);
    if (this.shouldPrevent(e)) e.preventDefault();
  };

  private clearAll = (): void => {
    this.down.clear();
    this.edge.clear();
  };

  private shouldPrevent(e: KeyboardEvent): boolean {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (isReservedKey(e.code)) return false;
    if (e.code.startsWith('Arrow') || e.code === 'Space' || e.code === 'Tab' || e.code === 'Backspace') return true;
    for (const a of ACTIONS) if (this.bindings[a].includes(e.code)) return true;
    return e.code === 'Enter';
  }

  /** Convert accumulated raw events into this step's snapshot. Call once per simulation step. */
  tick(): void {
    this.anyPressed = false;
    for (const code of this.edge) {
      if (!code.startsWith('Shift') && !code.startsWith('Control') && !code.startsWith('Alt')) this.anyPressed = true;
    }

    for (const a of ACTIONS) {
      let h = false;
      let p = false;
      for (const c of this.bindings[a]) {
        if (this.down.has(c)) h = true;
        if (this.edge.has(c)) {
          p = true;
          h = true;
        }
      }
      this.held[a] = h;
      this.pressed[a] = p;
    }

    const k = (...codes: string[]): [boolean, boolean] => {
      let h = false;
      let p = false;
      for (const c of codes) {
        if (this.down.has(c)) h = true;
        if (this.edge.has(c)) {
          h = true;
          p = true;
        }
      }
      return [h, p];
    };
    const b = this.bindings;
    this.navStep('up', ...k('ArrowUp', ...b.up));
    this.navStep('down', ...k('ArrowDown', ...b.down));
    this.navStep('left', ...k('ArrowLeft', ...b.left));
    this.navStep('right', ...k('ArrowRight', ...b.right));
    this.navStep('confirm', ...k('Enter', 'NumpadEnter', ...b.shoot));
    this.navStep('cancel', ...k('Escape', ...b.bomb));

    this.edge.clear();
  }

  private navStep(key: NavKey, held: boolean, edge: boolean): void {
    if (!held) {
      this.holdFrames[key] = 0;
      this.nav[key] = false;
      return;
    }
    const f = ++this.holdFrames[key];
    const repeating = key !== 'confirm' && key !== 'cancel' && f > NAV_REPEAT_DELAY && (f - NAV_REPEAT_DELAY) % NAV_REPEAT_RATE === 0;
    this.nav[key] = edge || repeating;
    if (edge) this.holdFrames[key] = 1;
  }

  /** Reset edges and holds, e.g. after changing scenes so a held key does not leak through. */
  flush(): void {
    this.edge.clear();
    for (const a of ACTIONS) this.pressed[a] = false;
    for (const key of Object.keys(this.nav) as NavKey[]) this.nav[key] = false;
    this.anyPressed = false;
  }
}

/** Neutral per-step control state consumed by the simulation. */
export interface PlayerInput {
  dx: number;
  dy: number;
  shoot: boolean;
  bomb: boolean;
  focus: boolean;
}

export function neutralInput(): PlayerInput {
  return { dx: 0, dy: 0, shoot: false, bomb: false, focus: false };
}

export function readPlayerInput(input: Input, out: PlayerInput): PlayerInput {
  out.dx = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);
  out.dy = (input.held.down ? 1 : 0) - (input.held.up ? 1 : 0);
  out.shoot = input.held.shoot;
  out.bomb = input.pressed.bomb;
  out.focus = input.held.focus;
  return out;
}
