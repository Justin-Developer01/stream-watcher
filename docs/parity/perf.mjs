// Measures the built app: process working sets (getAppMetrics), renderer JS heap, and how many
// times StreamGrid's subtree is touched while the user works the chrome (menus, chat, see-through).
import { _electron as electron } from 'playwright-core'
import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path'
const repo = process.argv[2]
const app = await electron.launch({ executablePath: join(repo, 'node_modules/electron/dist/electron'), args: ['--no-sandbox', '--js-flags=--expose-gc', join(repo, 'out/main/index.js')], env: { ...process.env, XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), 'perf')) } })
await app.context().addInitScript(() => {
  // Minimal React DevTools hook: count commits in which a StreamTile (the component whose host
  // child is article.stream-tile) actually re-rendered.
  window.__tileRenders = 0
  const walk = (fiber) => {
    for (let f = fiber; f; f = f.sibling) {
      if (f.tag === 0 || f.tag === 15 || f.tag === 14) {
        const child = f.child
        if (child && child.type === 'article' && String(child.memoizedProps?.className ?? '').includes('stream-tile') && f.alternate && (f.flags & 1)) window.__tileRenders++
      }
      if (f.child) walk(f.child)
    }
  }
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true, renderers: new Map(), inject() { return 1 }, onCommitFiberRoot(_id, root) { walk(root.current.child) }, onCommitFiberUnmount() {}, onPostCommitFiberRoot() {}, checkDCE() {},
  }
})
const page = await app.firstWindow(); await page.waitForSelector('.desk'); await page.reload(); await page.waitForSelector('.desk')
for (const ch of ['pokimane', 'hasanabi']) { await page.locator('.chrome-search input').fill(ch); await page.keyboard.press('Enter') }
await page.waitForTimeout(3000)
const metrics = async () => app.evaluate(({ app }) => { const by = {}; for (const m of app.getAppMetrics()) by[m.type] = (by[m.type] ?? 0) + m.memory.workingSetSize; return Object.fromEntries(Object.entries(by).map(([k, v]) => [k, Math.round(v / 1024)])) })
const heap = async () => page.evaluate(() => { globalThis.gc?.(); return Math.round(performance.memory.usedJSHeapSize / 1048576 * 10) / 10 })
const idle = { metrics: await metrics(), heapMB: await heap() }
// Count React commits that reach the tiles: patch the tile player effect via a DOM probe is not
// possible in prod, so count StreamTile renders through React DevTools hook instead.
await page.evaluate(() => {
  window.__tileRenders = 0
  const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__
  if (!hook) return
})
await page.evaluate(() => (window.__tileRenders = 0))
const t0 = Date.now()
for (let i = 0; i < 6; i++) {
  await page.click('.chrome-bar button[aria-label="Menu"]'); await page.mouse.click(700, 700)
  await page.keyboard.press('Control+Shift+C'); await page.waitForTimeout(150); await page.keyboard.press('Control+Shift+C')
}
const uiMs = Date.now() - t0
const tileRenders = await page.evaluate(() => window.__tileRenders)
console.log(JSON.stringify({ idle, uiLoopMs: uiMs, tileRendersDuringChromeUse: tileRenders, after: { metrics: await metrics(), heapMB: await heap() } }))
app.process().kill('SIGKILL'); process.exit(0)
