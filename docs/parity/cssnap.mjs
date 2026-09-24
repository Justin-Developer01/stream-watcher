// Computed-style snapshot of every element across themes, edges, menus, dialogs, chat, and hover.
import { _electron as electron } from 'playwright-core'
import { mkdtempSync, writeFileSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path'
const [repo, out] = process.argv.slice(2)
const PROPS = ['color','background-color','background-image','border-top-color','border-left-color','border-top-width','border-radius','width','height','display','position','top','left','padding-top','padding-left','margin-top','margin-left','font-size','font-weight','font-style','opacity','box-shadow','grid-template-columns','grid-template-rows','z-index','-webkit-app-region','cursor','filter','color-scheme','appearance','accent-color','flex-direction','justify-content','gap','overflow-y','text-align','visibility','outline-color']
const app = await electron.launch({ executablePath: join(repo, 'node_modules/electron/dist/electron'), args: ['--no-sandbox', join(repo, 'out/main/index.js')], env: { ...process.env, XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), 'css')) } })
const page = await app.firstWindow(); await page.waitForSelector('.desk'); await page.mouse.move(700, 600); await page.waitForTimeout(600)
const snap = {}
const take = async (name) => { await page.waitForTimeout(250); snap[name] = await page.evaluate((props) => { const path = (el) => { const p = []; for (let e = el; e && e !== document.documentElement; e = e.parentElement) p.unshift(e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '') + ':' + [...(e.parentElement?.children ?? [])].indexOf(e)); return p.join('>') }; const o = {}; for (const el of document.querySelectorAll('body *')) { if (el.closest('svg') && el.tagName !== 'svg') continue; const cs = getComputedStyle(el); o[path(el)] = props.map((p) => cs.getPropertyValue(p)).join('|') } return o }, PROPS) }
const setting = async (name, text) => { await page.keyboard.press('Control+Comma'); await page.waitForSelector('.modal-card'); await page.locator(`.modal-card label.choice:has(input[name="${name}"])`, { hasText: text }).locator('input').check(); await page.locator('.modal-footer button', { hasText: 'Save' }).click(); await page.waitForTimeout(300) }
for (const theme of ['Dark', 'Dim', 'Light']) {
  await setting('theme', theme)
  await take(`${theme}-desk`)
  await page.hover('.chrome-bar button[aria-label="Change layout"]'); await take(`${theme}-hover-layout`); await page.mouse.move(700, 600)
  await page.hover('.chrome-bar .win-btn--close'); await take(`${theme}-hover-close`); await page.mouse.move(700, 600)
  await page.click('.chrome-bar button[aria-label="Menu"]'); await take(`${theme}-menu`); await page.mouse.click(700, 700)
  await page.click('.chrome-bar button[aria-label="Change layout"]'); await take(`${theme}-layout-menu`); await page.mouse.click(700, 700)
  await page.keyboard.press('Control+Comma'); await page.waitForSelector('.modal-card'); await take(`${theme}-settings`); await page.getByRole('tab', { name: 'Chat' }).click(); await take(`${theme}-settings-chat`); await page.locator('.modal-footer button', { hasText: 'Cancel' }).click()
  await page.keyboard.press('Control+Shift+C'); await page.waitForSelector('.chat-drawer select'); await take(`${theme}-chat`)
  for (const d of ['left', 'bottom', 'float']) { await page.selectOption('.chat-drawer select', d); await take(`${theme}-chat-${d}`) }
  await page.selectOption('.chat-drawer select', 'right'); await page.keyboard.press('Control+Shift+C')
  await page.locator('.mode-btn', { hasText: 'Focus' }).click(); await take(`${theme}-focus`); await page.locator('.mode-btn', { hasText: 'Standard' }).click()
}
for (const edge of ['Left', 'Right', 'Bottom', 'Top']) { await setting('chrome', edge); await take(`edge-${edge}`) }
await page.click('.chrome-bar button[aria-label="See through windows"]'); await take('see-through'); await page.click('.chrome-bar button[aria-label="See through windows"]')
await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.unmaximize(); w.setSize(1000, 700) }); await page.waitForTimeout(600); await take('narrow-1000')
writeFileSync(out, JSON.stringify(snap))
console.log('scenarios', Object.keys(snap).length, 'elements', Object.values(snap).reduce((a, s) => a + Object.keys(s).length, 0))
app.process().kill('SIGKILL'); process.exit(0)
