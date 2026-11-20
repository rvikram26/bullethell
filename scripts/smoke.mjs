// Browser smoke test: builds nothing itself (run `npm run build` first), serves dist/ with
// `vite preview`, drives the game in a local Chrome/Edge with puppeteer-core and writes
// screenshots plus a performance and audio-level report to smoke-output/.
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { preview } from 'vite';

const OUT = 'smoke-output';
fs.mkdirSync(OUT, { recursive: true });

const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const executablePath = candidates.find((p) => fs.existsSync(p));
if (!executablePath) {
  console.error('No Chrome or Edge found. Set CHROME_PATH to a Chromium-based browser.');
  process.exit(2);
}

const only = process.argv[2] ?? 'all';
const headless = !process.argv.includes('--headed');
const server = await preview({ preview: { port: 4317, strictPort: false, open: false }, logLevel: 'silent' });
const base = server.resolvedUrls.local[0];
const browser = await puppeteer.launch({
  executablePath,
  headless,
  args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1300,1000', '--ignore-gpu-blocklist'],
  defaultViewport: { width: 1280, height: 960 },
});

const problems = [];
const report = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(query) {
  const page = await browser.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warn' || m.type() === 'warning') problems.push(`[${query}] console ${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`[${query}] page error: ${e.message}`));
  await page.goto(base + query, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__lt, { timeout: 10000 });
  return page;
}
const stats = (page) => page.evaluate(() => window.__lt.stats());
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`) });
async function tap(page, key, hold = 70) {
  await page.keyboard.down(key);
  await sleep(hold);
  await page.keyboard.up(key);
  await sleep(90);
}
function expect(cond, msg) {
  if (!cond) problems.push(`check failed: ${msg}`);
}
async function sample(page, seconds) {
  const fps = [];
  let peak = 0;
  let worstUpdate = 0;
  let worstRender = 0;
  for (let i = 0; i < seconds * 2; i++) {
    await sleep(500);
    const s = await stats(page);
    fps.push(s.fps);
    peak = Math.max(peak, s.bullets);
    worstUpdate = Math.max(worstUpdate, s.updateMs);
    worstRender = Math.max(worstRender, s.renderMs);
  }
  fps.sort((a, b) => a - b);
  return { minFps: fps[0], medianFps: fps[Math.floor(fps.length / 2)], peakBullets: peak, worstUpdateMs: worstUpdate, worstRenderMs: worstRender };
}

const run = (name) => only === 'all' || only === name;

try {
  if (run('flow')) {
    const page = await open('?debug');
    await sleep(1500);
    await shot(page, '01-title');
    await tap(page, 'KeyZ'); // Start Game (also unlocks audio)
    await sleep(700);
    await shot(page, '02-difficulty');
    await tap(page, 'KeyZ'); // Normal
    await sleep(2200);
    let s = await stats(page);
    expect(s.scene === 'game', `game should start, got ${s.scene}`);
    expect(s.audio === true, 'audio context should be unlocked after a key press');
    await page.keyboard.down('KeyZ');
    for (const key of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']) {
      await page.keyboard.down(key);
      await sleep(450);
      await page.keyboard.up(key);
    }
    await sleep(3500);
    await shot(page, '03-stage1');
    await page.keyboard.down('ShiftLeft');
    await sleep(600);
    await shot(page, '04-focus');
    await page.keyboard.up('ShiftLeft');
    await page.keyboard.up('KeyZ');
    await tap(page, 'Escape');
    await sleep(400);
    await shot(page, '05-pause');
    await tap(page, 'Escape');
    await sleep(200);
    await tap(page, 'KeyX');
    await sleep(350);
    await shot(page, '06-bomb');
    s = await stats(page);
    expect(s.scene === 'game' && s.lives >= 2, 'still playing after pause and bomb');
    report.stage1 = await sample(page, 4);
    await page.close();
  }

  if (run('boss')) {
    let page = await open('?debug&stage=1&boss=1&seed=5');
    await sleep(2600);
    await shot(page, '07-dialogue');
    await page.close();

    page = await open('?debug&stage=2&boss=1&phase=1&god&seed=5');
    await sleep(2400);
    await tap(page, 'KeyX'); // skip dialogue
    await sleep(700);
    await shot(page, '08-cutin');
    await page.keyboard.down('KeyZ');
    await sleep(5000);
    await shot(page, '09-spell-stage2');
    await page.keyboard.up('KeyZ');
    await page.close();

    page = await open('?debug&stage=3&boss=1&phase=4&god&diff=lunatic&power=128&seed=9');
    await sleep(2400);
    await tap(page, 'KeyX');
    await page.keyboard.down('KeyZ');
    await sleep(9000);
    await shot(page, '10-final-rite-lunatic');
    report.finalRiteLunatic = await sample(page, 10);
    await shot(page, '11-final-rite-later');
    await page.keyboard.up('KeyZ');
    await page.close();
  }

  if (run('gameover')) {
    // no spare lives and no dodging: the first hit ends the run and opens the continue screen
    const page = await open('?debug&stage=3&boss=1&phase=4&diff=lunatic&lives=0&seed=2');
    await sleep(2400);
    await tap(page, 'KeyX');
    let s = await stats(page);
    for (let i = 0; i < 40 && s.scene === 'game' && !(await page.evaluate(() => window.__lt.app.current.paused)); i++) {
      await sleep(500);
      s = await stats(page);
    }
    await sleep(1600);
    await shot(page, '16-continue');
    expect(await page.evaluate(() => window.__lt.app.current.paused), 'the continue screen should be showing');
    await tap(page, 'KeyZ'); // Continue
    await sleep(600);
    s = await stats(page);
    expect(s.lives >= 2 && s.score === 0, `continuing should refill lives and reset score (lives ${s.lives}, score ${s.score})`);
    await page.close();
  }

  if (run('stress')) {
    const page = await open('?debug&stage=1&god&stress=3000&seed=3');
    await sleep(4000);
    report.stress3000 = await sample(page, 6);
    await shot(page, '12-stress-3000');
    expect(report.stress3000.peakBullets >= 2900, `stress test should hold ~3000 bullets, saw ${report.stress3000.peakBullets}`);
    await page.close();
  }

  if (run('menus')) {
    for (const scene of ['options', 'keys', 'scores', 'ending', 'name', 'difficulty']) {
      const page = await open(`?debug&scene=${scene}`);
      await sleep(scene === 'ending' ? 2500 : 1200);
      await shot(page, `13-${scene}`);
      await page.close();
    }
    const page = await open('?debug&stage=2&practice&seed=4');
    await page.keyboard.down('KeyZ');
    await sleep(7000);
    await shot(page, '14-stage2-practice');
    await page.keyboard.up('KeyZ');
    await page.close();
    const page3 = await open('?debug&stage=3&practice&seed=4');
    await page3.keyboard.down('KeyZ');
    await sleep(7000);
    await shot(page3, '15-stage3-practice');
    await page3.keyboard.up('KeyZ');
    await page3.close();
  }

  if (run('audio')) {
    const page = await open('?debug');
    await tap(page, 'ArrowDown');
    await sleep(300);
    report.audio = await page.evaluate(() => window.__lt.audioReport());
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}

fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ report, problems }, null, 2));
console.log(JSON.stringify(report, (k, v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v), 2));
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(' - ' + p);
  process.exit(1);
}
console.log('\nSmoke test passed. Screenshots in smoke-output/.');
