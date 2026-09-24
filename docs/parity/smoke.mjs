// Smoke test for Vesper Desk: launches the BUILT app (out/main/index.js, file:// renderer, like a
// packaged build) under Xvfb via Playwright's Electron driver. Usage:
//   npm i --no-save playwright-core@1 && npm run build
//   xvfb-run -a -s "-screen 0 1600x1000x24" node docs/parity/smoke.mjs "$PWD" /tmp/shots after
//   (VD_EXEC=release/linux-unpacked/vesper-desk runs the packaged build instead.)
import { _electron as electron } from 'playwright-core'
import { mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [repo, shots, label = 'run'] = process.argv.slice(2)
mkdirSync(shots, { recursive: true })
const cfgHome = mkdtempSync(join(tmpdir(), 'vd-cfg-'))
const results = []
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}
const step = async (name, fn) => {
  try {
    const r = await fn()
    if (r === false) record(name, false)
    else if (typeof r === 'string') record(name, true, r)
    else if (r && typeof r === 'object') record(name, r.ok, r.detail)
    else record(name, true)
  } catch (e) {
    record(name, false, String(e?.message ?? e).split('\n')[0])
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function launch() {
  const app = await electron.launch({
    executablePath: process.env.VD_EXEC || join(repo, 'node_modules/electron/dist/electron'),
    args: process.env.VD_EXEC ? ['--no-sandbox'] : ['--no-sandbox', join(repo, 'out/main/index.js')],
    env: { ...process.env, XDG_CONFIG_HOME: cfgHome, ELECTRON_RENDERER_URL: '' },
    cwd: repo,
  })
  const page = await app.firstWindow()
  await page.waitForSelector('.desk', { timeout: 20000 })
  await sleep(600)
  return { app, page }
}
const state = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('vesper-desk:v1') || 'null'))
const shot = (page, name) => page.screenshot({ path: join(shots, `${label}-${name}.png`) })
const styleOf = (page, sel, props) =>
  page.evaluate(
    ([sel, props]) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const cs = getComputedStyle(el)
      return Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]))
    },
    [sel, props],
  )

async function openSettings(page) {
  await page.keyboard.press('Control+Comma')
  await page.waitForSelector('.modal-card', { timeout: 3000 })
}
async function settingsRadio(page, name, text) {
  await page.locator(`.modal-card label.choice:has(input[name="${name}"])`, { hasText: text }).locator('input').check()
}
async function footer(page, text) {
  await page.locator('.modal-footer button', { hasText: text }).click()
  await page.waitForSelector('.modal-card', { state: 'detached', timeout: 3000 })
}
async function saveSetting(page, name, text) {
  await openSettings(page)
  await settingsRadio(page, name, text)
  await footer(page, 'Save')
  await sleep(250)
}

let { app, page } = await launch()
await page.mouse.move(5, 500)

// ---------- Toolbar hover / drag region ----------
await step('chrome: bar is a drag region, controls are no-drag', async () => {
  const bar = await styleOf(page, '.chrome-bar', ['-webkit-app-region'])
  const btn = await styleOf(page, '.chrome-bar .text-btn', ['-webkit-app-region'])
  const search = await styleOf(page, '.chrome-search input', ['-webkit-app-region'])
  return {
    ok: bar?.['-webkit-app-region'] === 'drag' && btn?.['-webkit-app-region'] === 'no-drag' && search?.['-webkit-app-region'] === 'no-drag',
    detail: `bar=${bar?.['-webkit-app-region']} button=${btn?.['-webkit-app-region']} search=${search?.['-webkit-app-region']}`,
  }
})
await step('chrome: hover lifts border + background on a toolbar chip (Dark)', async () => {
  const sel = '.chrome-bar .text-btn'
  const props = ['background-color', 'border-color', 'cursor']
  const before = await styleOf(page, sel, props)
  await page.hover(sel)
  await sleep(250)
  const after = await styleOf(page, sel, props)
  await shot(page, 'dark-hover-change-layout')
  await page.mouse.move(5, 500)
  const changed = before['background-color'] !== after['background-color'] && before['border-color'] !== after['border-color']
  return { ok: changed && after.cursor === 'pointer', detail: `before=${JSON.stringify(before)} hover=${JSON.stringify(after)}` }
})
await step('chrome: selected mode is soft cyan and stays cyan on hover', async () => {
  const sel = '.chrome-bar .mode-btn.is-on'
  const a = await styleOf(page, sel, ['border-color', 'background-color'])
  await page.hover(sel)
  await sleep(200)
  const b = await styleOf(page, sel, ['border-color', 'background-color'])
  await page.mouse.move(5, 500)
  return { ok: a['border-color'] === 'rgb(126, 200, 216)' && b['border-color'] === 'rgb(126, 200, 216)', detail: `idle=${JSON.stringify(a)} hover=${JSON.stringify(b)}` }
})
await step('chrome: logo mark + wordmark render (30px mark, "Vesper Desk")', async () => {
  const box = await page.locator('.chrome-mark').boundingBox()
  const word = await page.locator('.chrome-wordmark').textContent()
  const title = await page.title()
  await page.locator('.chrome-bar').screenshot({ path: join(shots, `${label}-chrome-dark.png`) })
  return { ok: Math.round(box.width) === 30 && word === 'Vesper Desk' && title === 'Vesper Desk', detail: `mark=${box.width}x${box.height} word=${word} title=${title}` }
})
await step('chrome: no Exit button anywhere in the chrome', async () => {
  const txt = await page.locator('.chrome-bar').innerText()
  return { ok: !/exit/i.test(txt), detail: txt.replace(/\s+/g, ' ').trim() }
})
await shot(page, 'dark-desk')

// ---------- Settings: Save / Cancel / Reset ----------
await step('settings: Cancel drops a draft theme change', async () => {
  await openSettings(page)
  await settingsRadio(page, 'theme', 'Light')
  await sleep(150)
  await shot(page, 'settings-light-draft-preview')
  await footer(page, 'Cancel')
  const s = await state(page)
  const desk = await page.getAttribute('.desk', 'data-theme')
  return { ok: desk === 'dark' && (s == null || s.settings.theme === 'dark'), detail: `desk=${desk} stored=${s?.settings?.theme ?? '(nothing stored)'}` }
})
await step('settings: Save writes the theme', async () => {
  await saveSetting(page, 'theme', 'Light')
  const s = await state(page)
  return { ok: s.settings.theme === 'light', detail: `stored=${s.settings.theme}` }
})
await step('settings: Reset changes only the draft; Cancel keeps storage', async () => {
  await openSettings(page)
  await page.locator('.settings-actions button', { hasText: 'Reset' }).click()
  const draftChecked = await page.locator('.modal-card label.choice:has(input[name="theme"])', { hasText: 'Dark' }).locator('input').isChecked()
  const s1 = await state(page)
  await footer(page, 'Cancel')
  const s2 = await state(page)
  return { ok: draftChecked && s1.settings.theme === 'light' && s2.settings.theme === 'light', detail: `draft→dark=${draftChecked} storedDuring=${s1.settings.theme} storedAfterCancel=${s2.settings.theme}` }
})

// ---------- Light mode visibility ----------
await step('light: controls cream with dark text; hover lift; no black buttons', async () => {
  await shot(page, 'light-desk')
  const sel = '.chrome-bar .text-btn'
  const idle = await styleOf(page, sel, ['background-color', 'color', 'border-color'])
  await page.hover(sel)
  await sleep(200)
  const hov = await styleOf(page, sel, ['background-color', 'color', 'border-color'])
  await page.locator('.chrome-bar').screenshot({ path: join(shots, `${label}-chrome-light-hover.png`) })
  await page.mouse.move(5, 500)
  const blacks = await page.evaluate(() =>
    [...document.querySelectorAll('button')].filter((b) => {
      const c = getComputedStyle(b).backgroundColor
      const m = c.match(/\d+/g)
      return m && +m[0] < 40 && +m[1] < 40 && +m[2] < 40 && (m[3] === undefined || +m[3] > 0)
    }).length,
  )
  return { ok: blacks === 0 && idle['background-color'] !== hov['background-color'], detail: `idle=${JSON.stringify(idle)} hover=${JSON.stringify(hov)} blackButtons=${blacks}` }
})
await step('light: portaled ⋯ menu is cream with dark text', async () => {
  await page.click('.chrome-bar button[aria-label="More"]')
  await page.waitForSelector('.menu', { timeout: 2000 })
  const m = await styleOf(page, '.menu', ['background-color', 'color'])
  const item = page.locator('.menu .menu__item').first()
  await item.hover()
  await sleep(150)
  const it = await styleOf(page, '.menu .menu__item[data-highlighted]', ['background-color', 'color'])
  const theme = await page.getAttribute('.menu', 'data-theme')
  const hit = await page.getAttribute('.menu', 'data-hit')
  await shot(page, 'light-more-menu')
  await page.keyboard.press('Escape')
  return { ok: theme === 'light' && hit !== null && m.color === 'rgb(42, 33, 24)', detail: `menu=${JSON.stringify(m)} highlighted=${JSON.stringify(it)} data-theme=${theme} data-hit=${hit !== null}` }
})
await step('light: tooltip is cream', async () => {
  await page.hover('.chrome-bar .window-controls .win-btn--close')
  await page.waitForSelector('.vd-tooltip', { timeout: 3000 })
  const t = await styleOf(page, '.vd-tooltip', ['background-color', 'color'])
  const close = await styleOf(page, '.win-btn--close', ['background-color', 'color'])
  await shot(page, 'light-close-hover-tooltip')
  await page.mouse.move(5, 500)
  return { ok: t.color === 'rgb(42, 33, 24)', detail: `tooltip=${JSON.stringify(t)} closeHover=${JSON.stringify(close)}` }
})
await step('light: Settings dialog visible (cream)', async () => {
  await openSettings(page)
  await shot(page, 'light-settings')
  const d = await styleOf(page, '.modal-card', ['background-color', 'color'])
  await footer(page, 'Cancel')
  return { ok: d.color === 'rgb(42, 33, 24)', detail: JSON.stringify(d) }
})

// ---------- Dim ----------
await step('dim: theme saves and renders', async () => {
  await saveSetting(page, 'theme', 'Dim')
  await shot(page, 'dim-desk')
  await page.hover('.chrome-bar .text-btn')
  await sleep(200)
  await page.locator('.chrome-bar').screenshot({ path: join(shots, `${label}-chrome-dim-hover.png`) })
  await page.mouse.move(5, 500)
  return (await page.getAttribute('.desk', 'data-theme')) === 'dim'
})

// ---------- Persistence across restart ----------
await step('settings persist across restart', async () => {
  await sleep(400)
  await app.close()
  ;({ app, page } = await launch())
  return { ok: (await page.getAttribute('.desk', 'data-theme')) === 'dim', detail: `after restart data-theme=${await page.getAttribute('.desk', 'data-theme')}` }
})
await saveSetting(page, 'theme', 'Dark')

// ---------- Tiles: drag handle vs actions ----------
const layoutOf = async () => JSON.stringify((await state(page))?.layout?.map((l) => [l.x, l.y, l.w, l.h]))
await step('tiles: title strip drags the tile', async () => {
  const before = await layoutOf()
  const bar = page.locator('.stream-grid__item').first().locator('.stream-tile__bar')
  const b = await bar.boundingBox()
  const x = b.x + 60, y = b.y + b.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (let i = 1; i <= 12; i++) await page.mouse.move(x + i * 60, y + i * 10)
  await sleep(100)
  await shot(page, 'tile-dragging')
  await page.mouse.up()
  await sleep(500)
  const after = await layoutOf()
  return { ok: before !== after, detail: `before=${before} after=${after}` }
})
await step('tiles: mousedown+move on an action button does not drag; click still acts', async () => {
  const before = await layoutOf()
  const tile = page.locator('.stream-grid__item').first()
  const muteBtn = tile.locator('.stream-tile__actions .icon-btn').nth(1)
  const b = await muteBtn.boundingBox()
  const mutedBefore = (await state(page)).streams.map((s) => s.muted).join()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  for (let i = 1; i <= 8; i++) await page.mouse.move(b.x + i * 50, b.y + i * 8)
  await page.mouse.up()
  await sleep(400)
  const afterDrag = await layoutOf()
  await muteBtn.click()
  await sleep(400)
  const mutedAfter = (await state(page)).streams.map((s) => s.muted).join()
  return { ok: before === afterDrag && mutedBefore !== mutedAfter, detail: `layoutUnchanged=${before === afterDrag} muted ${mutedBefore} → ${mutedAfter}` }
})
await step('tiles: tile + player boxes never overlap', async () => {
  const boxes = await page.$$eval('.stream-grid__item', (els) => els.map((e) => e.getBoundingClientRect().toJSON()))
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], c = boxes[j]
      if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) return { ok: false, detail: 'overlap' }
    }
  return `${boxes.length} tiles, no overlap`
})

// ---------- Focus mode ----------
await step('focus: no drag handle; strip click promotes; strip action click does not', async () => {
  await page.locator('.mode-btn', { hasText: 'Focus' }).click()
  await sleep(500)
  const handles = await page.locator('.stream-drag-handle').count()
  const nested = await page.locator('button button').count()
  const heroBefore = await page.locator('.focus-hero .stream-tile__channel').textContent()
  const stripTile = page.locator('.focus-strip__item').first()
  await stripTile.locator('.stream-tile__actions .icon-btn').nth(1).click()
  await sleep(300)
  const heroAfterAction = await page.locator('.focus-hero .stream-tile__channel').textContent()
  await stripTile.locator('.stream-tile__player').click()
  await sleep(400)
  const heroAfterClick = await page.locator('.focus-hero .stream-tile__channel').textContent()
  await shot(page, 'focus-mode')
  await page.locator('.mode-btn', { hasText: 'Standard' }).click()
  return {
    ok: handles === 0 && nested === 0 && heroAfterAction === heroBefore && heroAfterClick !== heroBefore,
    detail: `handles=${handles} nestedButtons=${nested} hero ${heroBefore} → (action) ${heroAfterAction} → (click) ${heroAfterClick}`,
  }
})

// ---------- Chat drawer ----------
const stageWidth = () => page.locator('.desk-stage').evaluate((e) => e.getBoundingClientRect().width)
const deskWidth = () => page.locator('.desk').evaluate((e) => e.getBoundingClientRect().width)
await step('chat: drawer pushes the grid for Slide R / Slide L / Dock bottom; Float overlays', async () => {
  const full = await stageWidth()
  await page.keyboard.press('Control+Shift+C')
  await page.waitForSelector('.chat-drawer', { timeout: 2000 })
  await sleep(300)
  const out = {}
  for (const [value, name] of [['right', 'Slide R'], ['left', 'Slide L'], ['bottom', 'Dock bottom'], ['float', 'Float']]) {
    await page.selectOption('.chat-drawer select', value)
    await sleep(300)
    const st = await page.locator('.desk-stage').boundingBox()
    const dr = await page.locator('.chat-drawer').boundingBox()
    const overlap = st.x < dr.x + dr.width - 1 && dr.x < st.x + st.width - 1 && st.y < dr.y + dr.height - 1 && dr.y < st.y + st.height - 1
    out[name] = { stageW: Math.round(st.width), stageH: Math.round(st.height), overlap }
    await shot(page, `chat-${value}`)
  }
  const pushOk = !out['Slide R'].overlap && !out['Slide L'].overlap && !out['Dock bottom'].overlap && out['Slide R'].stageW < full
  return { ok: pushOk && out.Float.overlap, detail: `fullStage=${Math.round(full)} ${JSON.stringify(out)}` }
})
await step('chat: ⋯ Open chat keeps Float', async () => {
  await page.locator('.chat-drawer button[aria-label], .chat-drawer .icon-btn').last().click() // Hide chat
  await sleep(200)
  await page.click('.chrome-bar button[aria-label="More"]')
  await page.locator('.menu .menu__item', { hasText: /Open/ }).click()
  await sleep(300)
  const s = await state(page)
  return { ok: s.chatDock === 'float', detail: `dock after menu Open chat=${s.chatDock}` }
})
await step('chat: Pop out chat opens a separate window and closes the drawer', async () => {
  await page.selectOption('.chat-drawer select', 'right')
  await sleep(200)
  const channel = (await page.locator('.chat-chips .chip.is-on').textContent()).replace('#', '')
  const winP = app.waitForEvent('window', { timeout: 5000 })
  await page.locator('.chat-drawer .chat-drawer__tools .icon-btn').first().click()
  const pop = await winP
  await pop.waitForSelector('.popout-root', { timeout: 10000 })
  await sleep(400)
  await pop.screenshot({ path: join(shots, `${label}-chat-popout.png`) })
  const drawerOpen = await page.locator('.chat-drawer').count()
  const selects = await pop.locator('.chat-drawer select').count()
  globalThis.__pop = pop
  globalThis.__popChannel = channel
  return { ok: drawerOpen === 0 && selects === 0, detail: `popped #${channel}; mainDrawerOpen=${drawerOpen} popoutMoveChatSelect=${selects}` }
})
await step('chat: Dock back closes the pop-out and reopens the drawer on that channel', async () => {
  const pop = globalThis.__pop
  await pop.locator('.popout-bar .text-btn', { hasText: 'Dock back' }).click()
  await sleep(800)
  const windows = app.windows().filter((w) => !w.isClosed()).length
  const drawer = await page.locator('.chat-drawer').count()
  const chip = drawer ? (await page.locator('.chat-chips .chip.is-on').textContent()) : null
  await shot(page, 'chat-docked-back')
  return { ok: windows === 1 && drawer === 1 && chip === `#${globalThis.__popChannel}`, detail: `windows=${windows} drawer=${drawer} active=${chip}` }
})
await page.keyboard.press('Escape')
await sleep(200)

// ---------- Chrome edges ----------
for (const [edge, text] of [['left', 'Left'], ['right', 'Right'], ['bottom', 'Bottom'], ['top', 'Top']]) {
  await step(`chrome edge ${text}: bar/stage don't overlap, all controls inside the window`, async () => {
    await saveSetting(page, 'chrome', text)
    await sleep(300)
    await shot(page, `edge-${edge}`)
    const bar = await page.locator('.chrome-bar').boundingBox()
    const st = await page.locator('.desk-stage').boundingBox()
    const overlap = bar.x < st.x + st.width - 1 && st.x < bar.x + bar.width - 1 && bar.y < st.y + st.height - 1 && st.y < bar.y + bar.height - 1
    const vw = await page.evaluate(() => [innerWidth, innerHeight])
    const clipped = await page.$$eval('.chrome-bar button, .chrome-bar input', (els, vw) =>
      els.filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.left < -1 || r.top < -1 || r.right > vw[0] + 1 || r.bottom > vw[1] + 1) }).length, vw)
    return { ok: !overlap && clipped === 0, detail: `bar=${JSON.stringify(bar)} overlap=${overlap} clippedControls=${clipped}` }
  })
}

// ---------- Fluid resize ----------
await step('resize: 1000x700 window keeps tiles/chrome/drawer from overlapping', async () => {
  await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.unmaximize(); w.setSize(1000, 700) })
  await sleep(800)
  await page.keyboard.press('Control+Shift+C')
  await sleep(400)
  await shot(page, 'resize-1000x700')
  const r = await page.evaluate(() => {
    const q = (s) => document.querySelector(s)?.getBoundingClientRect()
    const bar = q('.chrome-bar'), st = q('.desk-stage'), dr = q('.chat-drawer')
    const ov = (a, b) => a && b && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1
    return { barStage: ov(bar, st), stageDrawer: ov(st, dr), barDrawer: ov(bar, dr), sw: document.documentElement.scrollWidth, w: innerWidth }
  })
  await page.keyboard.press('Control+Shift+C')
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].maximize())
  await sleep(500)
  return { ok: !r.barStage && !r.stageDrawer && !r.barDrawer && r.sw <= r.w, detail: JSON.stringify(r) }
})

// ---------- See-through + Lock ----------
await app.evaluate(({ BrowserWindow }) => {
  const w = BrowserWindow.getAllWindows()[0]
  const orig = w.setIgnoreMouseEvents.bind(w)
  globalThis.__ignore = []
  w.setIgnoreMouseEvents = (v, o) => { globalThis.__ignore.push(v); return orig(v, o) }
})
const lastIgnore = () => app.evaluate(() => globalThis.__ignore.at(-1))
await step('see-through: bar on top; empty stage ignores mouse; bar + tiles stay interactive', async () => {
  await page.locator('.chrome-bar .icon-btn').filter({ has: page.locator('svg') }).nth(0).click() // See through windows (eye)
  await sleep(400)
  const onTop = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isAlwaysOnTop())
  const cls = await page.getAttribute('.desk', 'class')
  // find an empty stage point
  const empty = await page.evaluate(() => {
    const st = document.querySelector('.desk-stage').getBoundingClientRect()
    for (let y = st.bottom - 5; y > st.top; y -= 20)
      for (let x = st.left + 5; x < st.right; x += 20) {
        const el = document.elementFromPoint(x, y)
        if (el && !el.closest('[data-hit]')) return [x, y]
      }
    return null
  })
  const tile = await page.locator('.stream-tile__player').first().boundingBox()
  const barBtn = await page.locator('.chrome-bar .text-btn').first().boundingBox()
  const out = {}
  if (empty) { await page.mouse.move(empty[0], empty[1]); await sleep(150); out.emptyStage = await lastIgnore() }
  await page.mouse.move(tile.x + 30, tile.y + 30); await sleep(150); out.tile = await lastIgnore()
  await page.mouse.move(barBtn.x + 5, barBtn.y + 5); await sleep(150); out.chromeButton = await lastIgnore()
  await shot(page, 'see-through')
  return { ok: onTop && cls.includes('desk--see-through') && out.emptyStage === true && out.tile === false && out.chromeButton === false, detail: `alwaysOnTop=${onTop} ignoreMouse=${JSON.stringify(out)} emptyPoint=${JSON.stringify(empty)}` }
})
await step('see-through: Lock window (Ctrl+Shift+L) stops click-through, shows chip', async () => {
  await page.mouse.move(400, 10)
  await page.keyboard.press('Control+Shift+L')
  await sleep(400)
  const onTop = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isAlwaysOnTop())
  const chip = await page.locator('.lock-chip').count()
  const cls = await page.getAttribute('.desk', 'class')
  await page.keyboard.press('Control+Shift+L')
  await sleep(200)
  await page.locator('.chrome-bar .icon-btn.is-on').first().click() // see-through off
  await sleep(300)
  return { ok: chip === 1 && cls.includes('desk--see-through') && (await lastIgnore()) === false, detail: `lockChip=${chip} stillSeeThrough=${cls.includes('desk--see-through')} alwaysOnTopWhileLocked=${onTop} lastIgnore=${await lastIgnore()}` }
})

// ---------- Ghost overlay + Pin ----------
await step('ghost: bar hides after idle, hidden bar is no-drag, edge reveals; Pin keeps it', async () => {
  await page.click('.chrome-bar button[aria-label="More"]')
  await page.locator('.menu .menu__item', { hasText: 'Ghost overlay' }).click()
  await page.mouse.move(700, 600)
  await sleep(3000)
  const ghost = (await page.getAttribute('.desk', 'class')).includes('desk--ghost')
  const region = (await styleOf(page, '.chrome-bar', ['-webkit-app-region']))['-webkit-app-region']
  await shot(page, 'ghost-hidden')
  await page.mouse.move(700, 3)
  await sleep(300)
  const revealed = !(await page.getAttribute('.desk', 'class')).includes('desk--ghost')
  await page.keyboard.press('Control+Backslash') // Toggle toolbar = Pin
  await page.mouse.move(700, 600)
  await sleep(3000)
  const pinnedStays = !(await page.getAttribute('.desk', 'class')).includes('desk--ghost')
  await page.keyboard.press('Control+Backslash')
  await page.mouse.move(700, 3)
  await sleep(200)
  await page.click('.chrome-bar button[aria-label="More"]')
  await page.locator('.menu .menu__item', { hasText: 'Ghost overlay' }).click()
  return { ok: ghost && region === 'no-drag' && revealed && pinnedStays, detail: `hidden=${ghost} hiddenBarRegion=${region} edgeReveals=${revealed} pinnedStaysVisible=${pinnedStays}` }
})

// ---------- Twitch login window ----------
await step('twitch: Login to Twitch opens ONE window with a built-in client_id', async () => {
  const before = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)
  await page.click('.chrome-bar button[aria-label="Menu"]')
  await page.locator('.menu .menu__item', { hasText: 'Login to Twitch' }).click()
  await sleep(1500)
  const info = await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows().map((w) => ({ title: w.getTitle(), url: w.webContents.getURL() || w.webContents.getLastWebContents?.()?.getURL?.() })),
  )
  const toast = await page.locator('.toast').textContent().catch(() => null)
  const opened = info.length - before
  await app.evaluate(({ BrowserWindow }) => {
    const main = BrowserWindow.getAllWindows().find((w) => !w.getParentWindow())
    BrowserWindow.getAllWindows().forEach((w) => w !== main && w.getParentWindow() && w.close())
  })
  await sleep(800)
  const alive = !page.isClosed()
  const clientOk = info.some((w) => /client_id=dqxba57by77shem4jb9nzz39rtah2x/.test(w.url || ''))
  return { ok: opened === 1 && alive && clientOk, detail: `mainAliveAfterClosingAuth=${alive} newWindows=${opened} clientIdInUrl=${clientOk} toast=${toast} windows=${JSON.stringify(info.map((i) => i.title))}` }
})

// ---------- Quit with pop-outs open ----------
await step('quit: Ctrl+Q exits even with a stream pop-out open', async () => {
  await page.keyboard.press('Escape')
  const winP = app.waitForEvent('window', { timeout: 5000 })
  await page.locator('.stream-grid__item').first().locator('.stream-tile__actions .icon-btn').nth(4).click()
  const pop = await winP
  await pop.waitForSelector('.popout-root', { timeout: 10000 })
  await pop.screenshot({ path: join(shots, `${label}-stream-popout.png`) })
  const proc = app.process()
  const exited = new Promise((r) => proc.once('exit', () => r(true)))
  const winsBefore = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)
  await page.keyboard.press('Control+q').catch(() => undefined) // the page closes mid-press when quit works
  const ok = await Promise.race([exited, sleep(6000).then(() => false)])
  if (!ok) proc.kill('SIGKILL')
  return { ok, detail: `${winsBefore} windows open; ` + (ok ? 'process exited' : 'process still running after 6s (killed)') }
})

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`)
await import('node:fs').then((fs) => fs.writeFileSync(join(shots, `${label}-results.json`), JSON.stringify(results, null, 2)))
process.exit(0)
