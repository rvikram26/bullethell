# Lantern Tide

A vertical-scrolling bullet-hell shooter (danmaku) for the browser, written in TypeScript on a
plain HTML5 canvas. Every character, story line, sprite, sound and song is original. All art is
drawn in code and all audio is synthesised at runtime, so the game ships no image or audio files.

The lamplighter Wren carries the last lit lantern of the city of Halcyra up to its dark Beacon,
through the Marsh of Wicks, the Cloudway Observatory and the Beacon Spire.

## Running it

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check and build to dist/
npm run preview    # serve the production build
npm test           # unit tests, data validation and bot playthroughs
npm run smoke      # build, then drive the game in a local Chrome/Edge (screenshots in smoke-output/)
```

Requires Node 22.12 or newer (Vitest and puppeteer-core need it; the dev server alone runs on 20.19+). `npm run smoke` looks for Chrome or Edge in the usual install paths; set
`CHROME_PATH` to use another Chromium-based browser.

## Controls

| Key            | Action                                                       |
| -------------- | ------------------------------------------------------------ |
| Arrow keys     | Move                                                         |
| Z (hold)       | Shoot; confirm in menus                                      |
| X              | Bomb; back in menus; skip dialogue                           |
| Shift (hold)   | Focus: slower movement, visible hitbox, tighter shot         |
| Esc            | Pause                                                        |

All game keys can be rebound under Options > Key Config. Menus always accept the arrow keys,
Enter and Esc as well, so a bad binding can never lock you out.

## How it plays

- **Hitbox.** Only the small dot at the centre of Wren counts. It is shown while focusing.
- **Power.** Power items raise power from 0 to 128. The shot gains levels at 16, 40, 72 and
  100: single, double, a three-way spread with options, homing sparks, then a five-way spread
  with four options. Focusing narrows the spread and turns the homing sparks into straight shots.
- **Graze.** A bullet that passes within about 15 px of the hitbox without touching it adds to the
  graze counter and gives 100 points (once per bullet).
- **Bombs.** X clears bullets in an expanding ring, damages every enemy and gives about three
  seconds of invulnerability. Bombing within 9 frames of being hit still saves you (a deathbomb).
  Five bomb fragments make a bomb.
- **Lives.** Being hit clears nearby bullets, costs a life and up to 24 power (it scatters as
  power items you can grab back) and gives a short respawn invulnerability. Extra lives come at 2, 5,
  10 and 18 million points, then every 10 million, and from 1-up items.
- **Items.** Power (P), points (star), bomb fragments (B) and 1-ups (heart). Point items are worth
  more the higher you collect them. Flying into the top quarter of the playfield collects every item
  on screen at full value.
- **Bosses.** Each stage has a mid-boss and a boss. Every phase is a named spell rite with its own
  health bar and time limit. Defeating a rite before its time runs out, without dying or bombing,
  pays its rite bonus, which shrinks as the clock runs down.
- **Difficulty.** Easy, Normal, Hard and Lunatic change bullet density, speed, fire rate, enemy
  health and the score multiplier.
- **Continues.** Three per run. A continue resets the score to zero. Clearing the game without
  continuing unlocks the better ending.

High scores (top 10 per difficulty), the last entered name and all settings are saved in
`localStorage`.

## Project layout

```
src/
  core/       loop (fixed 60 Hz step), input, settings, storage, high scores, RNG, math
  data/       everything the designer edits: patterns, paths, enemies, bosses, stages, dialogue
  game/       the simulation: world, bullet pool, pattern compiler and runner, player, boss, items
  render/     canvas drawing: bullet atlas, characters, enemies, backgrounds, HUD, world renderer
  audio/      sound effects, synthesiser, step sequencer and the songs
  scenes/     title, difficulty and stage select, game, options, scores, ending
  ui/         menu widget
tests/        unit tests, data validation, a dodging bot that plays whole stages, balance report
scripts/      browser smoke test (puppeteer-core)
```

The simulation in `src/game` never touches the DOM. Tests run the same `World` as the browser,
and a bot can play through every stage headlessly.

### Performance

Enemy bullets live in a struct-of-arrays pool (`src/game/bullets.ts`) with a capacity of 6144
and no allocation during play. Collision is a circle test against the player only, with a cheap
bounding-box rejection first; there are no bullet-bullet tests, so a spatial grid is not needed.
Bullets are drawn with `drawImage` from a single pre-rendered atlas. In headless Chrome, 3000
bullets run at a steady 60 fps, with about 0.3 ms per simulation step and 2.4 ms per frame drawn.

## Adding content

All gameplay content is plain data in `src/data` and is checked by `validateData()`
(`src/game/validate.ts`), which `npm test` runs. A typo in an id fails the tests and names the
broken reference. Units are seconds, pixels, px/s and degrees (0 = right, 90 = down). The
playfield is 384 x 448.

### Patterns (`src/data/patterns/*.ts`)

A pattern is a list of emitters. Each emitter fires volleys on its own schedule:

```ts
'my-flower': pattern(
  // a ring of 24 orbs, rotating 7 degrees per volley, every 0.4 s
  { interval: 0.4, count: 24, angleStep: 7, bullet: orb('pink', 120) },
  // a five-way aimed fan every 1.5 s, starting after 1 s
  { delay: 1, interval: 1.5, aim: 'player', count: 5, spread: 50, bullet: rice('cyan', 180) },
),
```

| Field | Meaning |
| ----- | ------- |
| `interval`, `delay`, `volleys`, `cycle` | Timing. `cycle` restarts the emitter every N seconds, so several emitters can take turns. |
| `aim` | `'fixed'` (use `angle`), `'player'` (aimed) or `'random'`. |
| `count`, `spread` | Bullets per volley. `spread` < 360 makes a fan; 360 (the default) makes a ring. |
| `arms` | Rotationally symmetric copies of the volley (rotating arms with `angleStep`). |
| `angleStep`, `sway`, `angleRand`, `bulletRand` | Spirals, sweeping, random spread. |
| `layers`, `layerSpeed`, `speedRand`, `speedStep` | Stacked bullets at increasing speeds. |
| `origin: 'field'`, `x`, `y`, `xRand`, `yRand`, `orbit` | Where bullets appear. |

Bullets (`orb('red', speed, extra)`, plus `pellet`, `big`, `rice`, `dart`, `needle`, `star`,
`ring`, `gem`) accept `accel`, `minSpeed`, `maxSpeed`, `curve` (deg/s), `life`, `bounce`, `scale`
and timed `events`:

```ts
big('white', 140, {
  accel: -110,                                  // decelerate...
  events: [
    { at: 1.3, do: 'split', count: 20, bullet: ring('white', 95) },        // ...then burst
  ],
}),
```

The event types are `speed` (set speed and acceleration), `turn` (to an angle, by an angle, or
`aim: true` at the player), `curve`, `split` (children in a ring or a fan, relative to the
heading, the player or an absolute angle) and `morph` (become another bullet type).

Any number may be given per difficulty as `[easy, normal, hard, lunatic]`. Plain numbers are
scaled automatically by the difficulty's density, speed and interval multipliers.

### Enemies, paths and bosses

- `src/data/paths.ts`: movement scripts made of `vel`, `to`, `rel`, `rand`, `arc`, `sine` and
  `wait` steps.
- `src/data/enemies.ts`: sprite, hit points, hit radius, score, default path, pattern and drops.
- `src/data/bosses/*.ts`: a boss is a list of phases. Each has `name` (the rite), `hp`, `time`,
  `pattern`, an optional looping `move` script, `bonus` and `drop`.

### Stage timelines (`src/data/stages/*.ts`)

```ts
{ t: 12, type: 'wave', enemy: 'wispShot', count: 4, every: 0.8, x: 90, dx: 70 },
{ t: 17, type: 'spawn', enemy: 'moth', x: 192, pattern: 'my-flower' },
{ t: 48, type: 'waitClear', max: 8 },
{ t: 49, type: 'boss', boss: 'tamsin', before: 's1-mid' },
```

Step types are `spawn`, `wave` (a group with spacing; `alternate` mirrors every other member),
`boss` (holds the timeline until the fight and its dialogue end), `dialogue`, `banner`, `music`,
`waitClear` and `end`. Any spawn can override `path`, `pattern`, `hp`, `drop`, `tint` and `flip`
(mirror left to right). Because the clock stops during boss fights, times after a boss step count
from when the fight ended.

### Music (`src/audio/songs.ts`)

Songs are written as chord progressions, a melody line (`e5:4 a4:2 c5 ...`, lengths in
sixteenths), and per-bar rhythm strings for bass, arpeggio and drums. A test checks that every
melody fits its chords exactly.

## Testing and debug switches

`npm test` covers the bullet pool (motion, events, splitting, collision, culling, capacity), the
pattern compiler, player and boss rules, items and extends, high scores, key rebinding, settings
sanitising, song compilation and data validation. It also runs a simple dodging bot through all
three stages on Easy, Normal and Lunatic, and prints how long every boss phase lasts.

URL switches for testing, for example `http://localhost:5173/?stage=3&boss=1&phase=4&god`:

| Switch | Effect |
| ------ | ------ |
| `stage=1..3`, `diff=easy\|normal\|hard\|lunatic`, `practice` | Start a run directly. |
| `boss=0\|1`, `phase=N` | Skip to the mid-boss (0) or boss (1), optionally at a later phase. |
| `god`, `power=N`, `lives=N`, `seed=N` | Invulnerability, starting power, spare lives, fixed RNG seed. |
| `stress=N` | Keep N bullets on screen. |
| `debug` | Performance overlay and a `window.__lt` handle for scripts; with `scene=options\|keys\|scores\|ending\|name\|difficulty` it opens that screen. |

## Notes

- **Quit.** Browsers only let a page close windows it opened itself, so if `window.close()` is
  refused, Quit shows a farewell screen instead.
- **Fullscreen.** In Chrome, Esc stays bound to pause while fullscreen (hold Esc to leave).
  Other browsers leave fullscreen on Esc and the game pauses itself.
- **Audio.** Browsers start audio only after a user gesture, so sound begins with the first key
  press.
