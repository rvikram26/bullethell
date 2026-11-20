import { STEP_MS } from './constants';

export interface LoopStats {
  fps: number;
  updateMs: number;
  renderMs: number;
  updatesPerSecond: number;
}

/**
 * Fixed-timestep loop: the simulation always advances in exact 1/60 s steps, rendering happens
 * once per displayed frame that follows at least one step. A time accumulator decouples the two,
 * so a 144 Hz monitor still simulates 60 steps per second and a slow frame catches up with a
 * bounded number of steps.
 */
export class GameLoop {
  readonly stats: LoopStats = { fps: 0, updateMs: 0, renderMs: 0, updatesPerSecond: 0 };

  private raf = 0;
  private running = false;
  private last = 0;
  private acc = 0;
  private frames = 0;
  private updates = 0;
  private windowStart = 0;
  private readonly maxStepsPerFrame = 5;

  constructor(
    private readonly update: () => void,
    private readonly render: () => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.windowStart = this.last;
    this.acc = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** Forget accumulated time (call after the tab was hidden or the window resized). */
  resetClock(): void {
    this.last = performance.now();
    this.acc = 0;
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);

    let dt = now - this.last;
    this.last = now;
    if (dt > 250) dt = STEP_MS; // tab was suspended; do not fast-forward
    // Snap near-60Hz frame times to exactly one step to avoid periodic double/skipped updates.
    if (Math.abs(dt - STEP_MS) < 1.2) dt = STEP_MS;
    this.acc += dt;

    let steps = 0;
    const t0 = performance.now();
    while (this.acc >= STEP_MS && steps < this.maxStepsPerFrame) {
      this.update();
      this.acc -= STEP_MS;
      steps++;
    }
    if (steps === this.maxStepsPerFrame) this.acc = 0; // give up catching up instead of spiralling
    const t1 = performance.now();

    if (steps > 0) {
      this.render();
      this.frames++;
      this.updates += steps;
      const t2 = performance.now();
      const s = this.stats;
      s.updateMs += (t1 - t0 - s.updateMs) * 0.1;
      s.renderMs += (t2 - t1 - s.renderMs) * 0.1;
    }

    if (now - this.windowStart >= 500) {
      const secs = (now - this.windowStart) / 1000;
      this.stats.fps = this.frames / secs;
      this.stats.updatesPerSecond = this.updates / secs;
      this.frames = 0;
      this.updates = 0;
      this.windowStart = now;
    }
  };
}
