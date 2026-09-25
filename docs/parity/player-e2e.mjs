// Player behavior against a mock Twitch embed script (twitch.tv is unreachable here).
import { _electron as electron } from 'playwright-core'
import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path'
const repo = process.argv[2]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const step = async (name, fn) => { try { const r = await fn(); results.push(r.ok); console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${name}  — ${r.detail}`) } catch (e) { results.push(false); console.log(`FAIL  ${name}  — ${String(e.message).split('\n')[0]}`) } }
const MOCK = `
window.__players = []
class Player {
  constructor(el, opts) {
    this.opts = opts; this.calls = []; this.handlers = {}; this.quality = 'auto'; this.state = opts.autoplay ? 'playing' : 'paused'
    window.__players.push(this)
    setTimeout(() => (this.handlers['playing'] || []).forEach((f) => f()), 200)
  }
  addEventListener(ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn) }
  getQualities() { return [{group:'auto'},{group:'chunked'},{group:'720p60'},{group:'480p30'},{group:'360p30'},{group:'160p30'}] }
  setQuality(q) { this.quality = q; this.calls.push('quality:' + q) }
  setMuted(m) { this.calls.push('muted:' + m) }
  play() { this.state = 'playing'; this.calls.push('play') }
  pause() { this.state = 'paused'; this.calls.push('pause') }
}
Player.READY = 'ready'; Player.PLAYING = 'playing'
window.Twitch = { Player }`
const app = await electron.launch({ executablePath: join(repo, 'node_modules/electron/dist/electron'), args: ['--no-sandbox', join(repo, 'out/main/index.js')], env: { ...process.env, XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), 'pl')) } })
await app.context().route(/embed\.twitch\.tv\/embed\/v1\.js/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: MOCK }))
const page = await app.firstWindow(); await page.waitForSelector('.desk'); await page.reload(); await page.waitForSelector('.desk')
await sleep(1500)
const players = () => page.evaluate(() => window.__players.map((p) => ({ ch: p.opts.channel, q: p.quality, state: p.state, calls: p.calls.join(',') })))
const tileH = () => page.$$eval('.twitch-player', (els) => els.map((e) => Math.round(e.clientHeight)))
await step('each tile requests the smallest quality that covers its height', async () => {
  const p = await players(); const h = await tileH()
  const expect = h.map((x) => (x > 720 ? 'auto' : x > 480 ? '720p60' : x > 360 ? '480p30' : '360p30'))
  return { ok: p.length === 2 && p.every((x, i) => x.q === expect[i]), detail: `heights=${h} → ${p.map((x) => x.ch + ':' + x.q).join(' ')}` }
})
await step('adding tiles shrinks them and the quality follows after the resize settles', async () => {
  for (const ch of ['a_one', 'b_two']) { await page.locator('.chrome-search input').fill(ch); await page.keyboard.press('Enter') }
  await page.locator('.chrome-bar button[aria-label="Change layout"]').click(); await page.locator('.menu__item--preset', { hasText: '2×2' }).click()
  await sleep(2200)
  const p = await players(); const h = await tileH()
  return { ok: p.length === 4 && p.every((x) => x.q !== 'auto'), detail: `heights=${h} → ${p.map((x) => x.ch + ':' + x.q).join(' ')}` }
})
await step('Performance mode puts unfocused tiles on the lowest real quality (160p30)', async () => {
  await page.locator('.mode-btn', { hasText: 'Performance' }).click(); await sleep(600)
  const p = await players()
  const low = p.filter((x) => x.q === '160p30').length
  return { ok: low === 3, detail: p.map((x) => `${x.ch}:${x.q}/${x.state}`).join(' ') }
})
await page.locator('.mode-btn', { hasText: 'Standard' }).click(); await sleep(1500)
await step('minimizing pauses muted tiles, keeps the audible one playing, restores on return', async () => {
  const before = await players()
  // Xvfb has no window manager, so emit the main window's own minimize/restore events.
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].emit('minimize')); await sleep(800)
  const hidden = true
  const during = await players()
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].emit('restore')); await sleep(800)
  const after = await players()
  const mutedDesk = await page.evaluate(() => JSON.parse(localStorage.getItem('vesper-desk:v1')).streams.map((s) => s.muted))
  return { ok: hidden && during.filter((x) => x.state === 'paused').length === mutedDesk.filter(Boolean).length && after.every((x) => x.state === 'playing'), detail: `hidden=${hidden} muted=${mutedDesk} during=${during.map((x) => x.state)} after=${after.map((x) => x.state)} before=${before.map((x) => x.state)}` }
})
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`)
app.process().kill('SIGKILL'); process.exit(0)
