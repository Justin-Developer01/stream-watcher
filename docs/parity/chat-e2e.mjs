// End-to-end chat test: the BUILT Vesper Desk app against a mock Twitch.
// - Fake Twitch IRC over WebSocket (tmi.js is redirected to it with an init script).
// - Helix is mocked with a fetch init script (Chromium sends CORS preflights past Playwright routes); CDN images via context.route.
// Usage: npm i --no-save playwright-core@1 ws@8 && npm run build
//        xvfb-run -a -s "-screen 0 1600x1000x24" node docs/parity/chat-e2e.mjs "$PWD" /tmp/chatshots
import { _electron as electron } from 'playwright-core'
import { WebSocketServer } from 'ws'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [repo, shots] = process.argv.slice(2)
mkdirSync(shots, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}
const step = async (name, fn) => {
  try {
    const r = await fn()
    if (r && typeof r === 'object') record(name, r.ok, r.detail)
    else record(name, r !== false, typeof r === 'string' ? r : '')
  } catch (e) {
    record(name, false, String(e?.message ?? e).split('\n')[0])
  }
}

// ---------------- Mock Twitch IRC ----------------
const wss = new WebSocketServer({ port: 0, host: '127.0.0.1' })
await new Promise((r) => wss.once('listening', r))
const port = wss.address().port
const sockets = new Set()
let connections = 0
const received = [] // client → server lines
let nick = 'justinfan'
const send = (line) => sockets.forEach((s) => s.readyState === 1 && s.send(line + '\r\n'))
wss.on('connection', (ws) => {
  connections += 1
  sockets.add(ws)
  ws.on('close', () => sockets.delete(ws))
  ws.on('message', (buf) => {
    for (const line of String(buf).split('\r\n').filter(Boolean)) {
      received.push(line)
      if (line.startsWith('CAP REQ')) ws.send(':tmi.twitch.tv CAP * ACK :twitch.tv/tags twitch.tv/commands\r\n')
      else if (line.startsWith('NICK ')) {
        nick = line.slice(5).trim()
        for (const code of ['001', '002', '003', '004', '375', '372'])
          ws.send(`:tmi.twitch.tv ${code} ${nick} :-\r\n`)
        ws.send(`:tmi.twitch.tv 376 ${nick} :>\r\n`)
        ws.send(`@badge-info=;badges=premium/1;color=#8A2BE2;display-name=Viewer;emote-sets=0;user-id=999;user-type= :tmi.twitch.tv GLOBALUSERSTATE\r\n`)
      } else if (line.startsWith('JOIN ')) {
        for (const ch of line.slice(5).split(',')) {
          ws.send(`:${nick}!${nick}@${nick}.tmi.twitch.tv JOIN ${ch}\r\n`)
          ws.send(`@emote-only=0;followers-only=-1;r9k=0;room-id=1${ch.length};slow=0;subs-only=0 :tmi.twitch.tv ROOMSTATE ${ch}\r\n`)
          ws.send(`@badge-info=;badges=subscriber/12;color=#8A2BE2;display-name=Viewer;emote-sets=0;mod=0 :tmi.twitch.tv USERSTATE ${ch}\r\n`)
        }
      } else if (line.startsWith('PART ')) {
        const ch = line.slice(5)
        ws.send(`:${nick}!${nick}@${nick}.tmi.twitch.tv PART ${ch}\r\n`)
      } else if (line.startsWith('PING')) ws.send(':tmi.twitch.tv PONG tmi.twitch.tv :tmi.twitch.tv\r\n')
    }
  })
})
let seq = 0
const esc = (v) => String(v).replace(/\\/g, '\\\\').replace(/ /g, '\\s').replace(/;/g, '\\:')
function privmsg(channel, login, text, tags = {}) {
  seq += 1
  const all = {
    'badge-info': '',
    badges: '',
    color: '#1E90FF',
    'display-name': login[0].toUpperCase() + login.slice(1),
    emotes: '',
    id: `msg-${seq}`,
    'tmi-sent-ts': String(Date.now()),
    'user-id': String(1000 + seq),
    ...tags,
  }
  const t = Object.entries(all).map(([k, v]) => `${k}=${esc(v)}`).join(';')
  send(`@${t} :${login}!${login}@${login}.tmi.twitch.tv PRIVMSG #${channel} :${text}`)
  return all.id
}
function raw(tags, rest) {
  const t = Object.entries(tags).map(([k, v]) => `${k}=${esc(v)}`).join(';')
  send(`@${t} ${rest}`)
}

// ---------------- Mock Helix ----------------
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const helix = {
  '/helix/users': (u) =>
    u.searchParams.get('login')
      ? { data: [{ id: '4242', login: u.searchParams.get('login') }] }
      : { data: [{ id: '999', login: 'viewer', display_name: 'Viewer' }] },
  '/helix/chat/badges/global': () => ({
    data: [
      { set_id: 'moderator', versions: [{ id: '1', image_url_1x: 'https://static-cdn.jtvnw.net/badges/v1/mod-uuid/1', title: 'Moderator' }] },
      { set_id: 'premium', versions: [{ id: '1', image_url_1x: 'https://static-cdn.jtvnw.net/badges/v1/prime-uuid/1', title: 'Prime Gaming' }] },
    ],
  }),
  '/helix/chat/badges': () => ({
    data: [{ set_id: 'subscriber', versions: [{ id: '12', image_url_1x: 'https://static-cdn.jtvnw.net/badges/v1/sub12-uuid/1', title: 'Subscriber' }] }],
  }),
  '/helix/chat/emotes/global': () => ({ data: [{ id: '25', name: 'Kappa' }, { id: '425618', name: 'LUL' }, { id: '305954156', name: 'PogChamp' }] }),
  '/helix/chat/emotes': () => ({ data: [{ id: 'emotesv2_chan1', name: 'xqcL' }, { id: 'emotesv2_chan2', name: 'xqcLocked' }] }),
  '/helix/chat/emotes/user': () => ({ data: [{ id: 'emotesv2_chan1', name: 'xqcL' }, { id: '25', name: 'Kappa' }] }),
  '/helix/bits/cheermotes': () => ({
    data: [
      {
        prefix: 'Cheer',
        tiers: [1, 100, 1000].map((min, i) => ({
          min_bits: min,
          color: ['#979797', '#9c3ee8', '#1db2a5'][i],
          images: {
            dark: { animated: { 1: `https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/animated/${min}/1.gif` } },
            light: { animated: { 1: `https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/light/animated/${min}/1.gif` } },
          },
        })),
      },
    ],
  }),
}

function mockImage(url) {
  if (url.includes('/badges/')) {
    const c = url.includes('mod') ? '#00ad03' : url.includes('prime') ? '#1e90ff' : '#9147ff'
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18"><rect x="1" y="1" width="16" height="16" rx="3" fill="${c}"/><path d="M5 9l3 3 5-6" stroke="#fff" stroke-width="2" fill="none"/></svg>`
  }
  if (url.includes('cheer')) {
    const c = url.includes('/1000/') ? '#1db2a5' : url.includes('/100/') ? '#9c3ee8' : '#979797'
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><path d="M14 2l10 9-10 15L4 11z" fill="${c}"/><path d="M14 2l10 9H4z" fill="#fff" opacity=".35"/></svg>`
  }
  const hue = [...url].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="hsl(${hue} 70% 55%)"/><circle cx="10" cy="11" r="2" fill="#222"/><circle cx="18" cy="11" r="2" fill="#222"/><path d="M8 17c3 4 9 4 12 0" stroke="#222" stroke-width="2" fill="none"/></svg>`
}

// ---------------- App ----------------
const cfg = mkdtempSync(join(tmpdir(), 'vd-chat-'))
const app = await electron.launch({
  executablePath: process.env.VD_EXEC || join(repo, 'node_modules/electron/dist/electron'),
  args: process.env.VD_EXEC ? ['--no-sandbox'] : ['--no-sandbox', join(repo, 'out/main/index.js')],
  env: { ...process.env, XDG_CONFIG_HOME: cfg },
})
const ctx = app.context()
await ctx.route(/static-cdn\.jtvnw\.net|cloudfront\.net|embed\.twitch\.tv/, (route) =>
  route.request().url().includes('embed.twitch.tv')
    ? route.fulfill({ status: 200, contentType: 'text/javascript', body: '' })
    : route.fulfill({ status: 200, contentType: 'image/svg+xml', body: mockImage(route.request().url()) }),
)
const helixTable = {}
for (const [path, fn] of Object.entries(helix)) {
  helixTable[path] = fn(new URL('https://api.twitch.tv' + path))
  if (path === '/helix/users') helixTable['/helix/users?login'] = fn(new URL('https://api.twitch.tv/helix/users?login=chan'))
}
await ctx.addInitScript((table) => {
  // Mock Helix inside the page: Chromium sends CORS preflights past Playwright's router.
  const nativeFetch = window.fetch.bind(window)
  window.__helixHits = []
  window.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url)
    // useTwitchAuth() validates/revokes the mock token against id.twitch.tv on launch and on
    // logout — fake it as always-valid so the fake "tok" session doesn't get signed out mid-test.
    if (url.host === 'id.twitch.tv' && (url.pathname === '/oauth2/validate' || url.pathname === '/oauth2/revoke')) {
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (url.host !== 'api.twitch.tv') return nativeFetch(input, init)
    const auth = new Headers(init?.headers).get('authorization')
    window.__helixHits.push(url.pathname + url.search + ' auth=' + auth)
    const key = url.pathname === '/helix/users' && url.searchParams.get('login') ? '/helix/users?login' : url.pathname
    const body = table[key]
    return new Response(JSON.stringify(body ?? {}), { status: body ? 200 : 404, headers: { 'content-type': 'application/json' } })
  }
}, helixTable)
await ctx.addInitScript((p) => {
  const Native = window.WebSocket
  window.WebSocket = class extends Native {
    constructor(url, protocols) {
      super(String(url).startsWith('wss://irc-ws.chat.twitch.tv') ? `ws://127.0.0.1:${p}` : url, protocols)
    }
  }
  if (!localStorage.getItem('vesper-desk:auth:v1'))
    localStorage.setItem('vesper-desk:auth:v1', JSON.stringify({ accessToken: 'tok', username: 'viewer', displayName: 'Viewer', scopes: ['chat:read', 'chat:edit', 'user:read:emotes'] }))
}, port)

const page = await app.firstWindow()
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE', m.type(), m.text().slice(0, 300)) })
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await page.waitForSelector('.desk')
await page.reload()
await page.waitForSelector('.desk')
await page.mouse.move(700, 500)
await sleep(500)
// First-run tips sit over the bottom-right tile; dismiss them like a returning user.
while (await page.locator('.tip-card button[aria-label="Dismiss"]').count()) await page.locator('.tip-card button[aria-label="Dismiss"]').first().click()

const lines = () => page.locator('.chat-drawer .chat-lines')
const lastLine = () => page.locator('.chat-drawer .chat-line').last()

await step('connects once with the saved login and joins both desk channels', async () => {
  await page.keyboard.press('Control+Shift+C')
  await page.waitForSelector('.chat-drawer')
  for (let i = 0; i < 40 && !(received.some((l) => l.includes('#xqc')) && received.some((l) => l.includes('#shroud'))); i++) await sleep(100)
  const pass = received.find((l) => l.startsWith('PASS'))
  const joins = received.filter((l) => l.startsWith('JOIN'))
  await page.waitForSelector('.dot--connected', { timeout: 5000 })
  return { ok: connections === 1 && pass === 'PASS oauth:tok' && joins.length >= 2, detail: `connections=${connections} ${pass} joins=${JSON.stringify(joins)}` }
})

const active = async () => ((await page.locator('.chat-chips .chip.is-on').textContent()) ?? '').replace('#', '')
let ch
await step('renders emotes after emoji at the right place, with badges from Helix', async () => {
  ch = await active()
  await sleep(600) // let Helix assets land
  privmsg(ch, 'alice', '😀😀 Kappa gg', { emotes: '25:3-7', badges: 'moderator/1,subscriber/12', 'badge-info': 'subscriber/14' })
  await sleep(400)
  const line = lastLine()
  const emote = await line.locator('img.chat-emote').getAttribute('alt')
  const badges = await line.locator('img.chat-badge').evaluateAll((els) => els.map((e) => e.title))
  const text = await line.locator('.chat-line__text').innerText()
  return { ok: emote === 'Kappa' && badges.join('|') === 'Moderator|Subscriber (14 months)' && text.startsWith('😀😀 '), detail: `emote=${emote} badges=${badges} text=${JSON.stringify(text)}` }
})
await step('Bits: cheermote renders with tier color and a cheer highlight', async () => {
  privmsg(ch, 'bob', 'Cheer100 Cheer1 great stream', { bits: '101' })
  await sleep(400)
  const line = lastLine()
  const cls = await line.getAttribute('class')
  const cheers = await line.locator('.chat-cheer').evaluateAll((els) =>
    els.map((e) => `${e.querySelector('img').getAttribute('src').split('/animated/')[1]}:${e.querySelector('strong').textContent}:${getComputedStyle(e.querySelector('strong')).color}`),
  )
  return { ok: cls.includes('is-cheer') && cheers.length === 2 && cheers[0].startsWith('100/1.gif:100'), detail: `${cls} ${JSON.stringify(cheers)}` }
})
await step('/me actions are italic in the user color; replies show "Replying to"', async () => {
  privmsg(ch, 'carol', '\u0001ACTION waves\u0001', { color: '#FF69B4' })
  privmsg(ch, 'dave', '@alice agreed', { 'reply-parent-user-login': 'alice', 'reply-parent-display-name': 'Alice', 'reply-parent-msg-body': 'Kappa gg' })
  await sleep(400)
  const action = page.locator('.chat-line.is-action').last()
  const style = await action.locator('.chat-line__text').evaluate((e) => [getComputedStyle(e).fontStyle, e.style.color])
  const reply = await lastLine().locator('.chat-line__reply').innerText()
  const replyText = await lastLine().locator('.chat-line__text').innerText()
  return { ok: style[0] === 'italic' && reply.startsWith('Replying to @Alice:') && replyText === 'agreed', detail: `action=${style} reply=${JSON.stringify(reply)} text=${JSON.stringify(replyText)}` }
})
await step('mentions of me and first-time chatters are highlighted; links are clickable', async () => {
  privmsg(ch, 'erin', 'hey @viewer check https://twitch.tv', { 'first-msg': '1' })
  await sleep(400)
  const cls = await lastLine().getAttribute('class')
  const tag = await lastLine().locator('.chat-line__tag').innerText()
  const href = await lastLine().locator('a.chat-link').getAttribute('href')
  return { ok: cls.includes('is-mention') && cls.includes('is-first') && tag === 'First-time chat' && href === 'https://twitch.tv', detail: `${cls} tag=${tag} href=${href}` }
})
await step('subs, raids, and announcements render as notices', async () => {
  raw({ 'msg-id': 'resub', 'system-msg': 'Frank subscribed at Tier 1. They\'ve subscribed for 5 months!', 'display-name': 'Frank', login: 'frank', id: 'n1', 'tmi-sent-ts': String(Date.now()), emotes: '' }, `:tmi.twitch.tv USERNOTICE #${ch} :still here LUL`)
  raw({ 'msg-id': 'raid', 'system-msg': '50 raiders from Gina have joined!', login: 'gina', id: 'n2' }, `:tmi.twitch.tv USERNOTICE #${ch}`)
  raw({ 'msg-id': 'announcement', 'msg-param-color': 'PURPLE', 'display-name': 'Mod', login: 'mod', id: 'n3' }, `:tmi.twitch.tv USERNOTICE #${ch} :Giveaway at 5pm`)
  await sleep(400)
  const notices = await page.locator('.chat-notice').evaluateAll((els) => els.map((e) => [e.className, e.querySelector('.chat-notice__system').textContent, e.querySelector('.chat-line__text')?.textContent ?? null]))
  return { ok: notices.length === 3 && notices[0][2] === 'still here LUL' && notices[1][0].includes('raid') && notices[2][0].includes('announcement'), detail: JSON.stringify(notices) }
})
await step('moderation: deleted message and timeout hide text and post a status line', async () => {
  const id = privmsg(ch, 'troll', 'bad words')
  privmsg(ch, 'troll2', 'more bad words')
  await sleep(300)
  raw({ login: 'troll', 'target-msg-id': id }, `:tmi.twitch.tv CLEARMSG #${ch} :bad words`)
  raw({ 'ban-duration': '600', 'target-user-id': '1' }, `:tmi.twitch.tv CLEARCHAT #${ch} :troll2`)
  await sleep(400)
  const deleted = await page.locator('.chat-line.is-deleted').count()
  const status = await page.locator('.chat-status').last().innerText()
  return { ok: deleted === 2 && status === 'troll2 has been timed out for 10 minutes.', detail: `deleted=${deleted} status=${status}` }
})
await step('room modes show under the header (slow, emote-only)', async () => {
  raw({ slow: '30', 'emote-only': '1' }, `:tmi.twitch.tv ROOMSTATE #${ch}`)
  await sleep(300)
  return (await page.locator('.chat-modes').innerText()) === 'Slow mode (30s) · Emote-only'
})
await shot('chat-twitch-dark')
async function shot(name) {
  await page.locator('.chat-drawer').screenshot({ path: join(shots, `${name}.png`) })
}

await step('send: message goes to Twitch and echoes with our badges and emotes', async () => {
  raw({ slow: '0', 'emote-only': '0' }, `:tmi.twitch.tv ROOMSTATE #${ch}`)
  await sleep(200)
  const input = page.locator('.chat-composer input')
  await input.fill('hello Kappa xqcL')
  await input.press('Enter')
  await sleep(400)
  const sent = received.filter((l) => l.startsWith('PRIVMSG')).at(-1)
  const line = page.locator('.chat-line.is-self').last()
  const emotes = await line.locator('img.chat-emote').evaluateAll((els) => els.map((e) => e.alt))
  const badges = await line.locator('img.chat-badge').count()
  return { ok: sent === `PRIVMSG #${ch} :hello Kappa xqcL` && emotes.join() === 'Kappa,xqcL' && badges === 1 && (await input.inputValue()) === '', detail: `sent=${sent} echoEmotes=${emotes} badges=${badges}` }
})
await step('send: /me goes out as ACTION; other commands are refused', async () => {
  const input = page.locator('.chat-composer input')
  await input.fill('/me dances')
  await input.press('Enter')
  await sleep(300)
  const sent = received.filter((l) => l.startsWith('PRIVMSG')).at(-1)
  await input.fill('/ban someone')
  await input.press('Enter')
  await sleep(200)
  const err = await page.locator('.chat-drawer .field-error').innerText()
  const nothing = received.filter((l) => l.includes('/ban')).length
  await input.fill('')
  return { ok: sent === `PRIVMSG #${ch} :\u0001ACTION dances\u0001` && nothing === 0 && /Only \/me/.test(err), detail: `sent=${JSON.stringify(sent)} err=${err}` }
})
await step('slow mode blocks a second message and says how long to wait', async () => {
  raw({ slow: '30' }, `:tmi.twitch.tv ROOMSTATE #${ch}`)
  await sleep(200)
  const input = page.locator('.chat-composer input')
  await input.fill('one')
  await input.press('Enter')
  await sleep(200)
  await input.fill('two')
  await input.press('Enter')
  await sleep(200)
  const err = await page.locator('.chat-drawer .field-error').innerText()
  raw({ slow: '0' }, `:tmi.twitch.tv ROOMSTATE #${ch}`)
  await input.fill('')
  return { ok: /Slow mode: wait \d+s/.test(err) && !received.some((l) => l.endsWith(':two')), detail: err }
})
await step('Tab completes emotes and @chatters; ArrowUp recalls the last message', async () => {
  const input = page.locator('.chat-composer input')
  await input.fill('Kap')
  await input.press('Tab')
  const a = await input.inputValue()
  await input.fill('hi @ali')
  await input.press('Tab')
  const b = await input.inputValue()
  await input.fill('')
  await input.press('ArrowUp')
  const c = await input.inputValue()
  await input.fill('')
  return { ok: a === 'Kappa ' && b === 'hi @Alice ' && c === '/me dances', detail: JSON.stringify([a, b, c]) }
})
await step('emote picker: your / channel / global sections, locked emotes, click inserts', async () => {
  await page.click('.chat-composer button[aria-label="Emotes"]')
  await page.waitForSelector('.emote-picker')
  await sleep(300)
  await page.screenshot({ path: join(shots, 'chat-emote-picker-open.png') })
  console.log('DBG drawer', await page.locator('.chat-drawer').count(), 'search', await page.locator('.emote-picker__search').count(), 'active', await page.evaluate(() => document.activeElement?.className), 'pickerHTMLlen', await page.locator('.emote-picker').evaluate((e) => e.innerHTML.length))
  const sections = await page.locator('.emote-picker__title').allInnerTexts()
  const locked = await page.locator('.emote-picker__item.is-locked').evaluateAll((els) => els.map((e) => e.querySelector('img').alt))
  await page.locator(".emote-picker__search").fill("pog", { timeout: 5000 }).catch(async (e) => { console.log("DBGFILL", e.message.split("\n").slice(0,14).join(" | ")); throw e })
  const found = await page.locator('.emote-picker__item img').evaluateAll((els) => els.map((e) => e.alt))
  await page.screenshot({ path: join(shots, 'chat-emote-picker.png') })
  await page.locator('.emote-picker__item').first().click()
  const draft = await page.locator('.chat-composer input').inputValue()
  await page.keyboard.press('Escape')
  await page.locator('.chat-composer input').fill('')
  return { ok: sections.join('|') === 'Your emotes|Channel emotes|Global emotes' && locked.join() === 'xqcLocked' && found.join() === 'PogChamp' && draft === 'PogChamp ', detail: `sections=${sections} locked=${locked} search=${found} draft=${JSON.stringify(draft)}` }
})
await step('scrolling up pauses chat; the button jumps back to the newest line', async () => {
  for (let i = 0; i < 60; i++) privmsg(ch, `spam${i % 5}`, `line ${i}`)
  await sleep(500)
  await lines().evaluate((e) => e.scrollTo(0, 0))
  await sleep(200)
  privmsg(ch, 'late', 'newest line')
  await sleep(400)
  const pausedTop = await lines().evaluate((e) => e.scrollTop)
  const button = await page.locator('.chat-paused').isVisible()
  await page.click('.chat-paused')
  await sleep(200)
  const atBottom = await lines().evaluate((e) => e.scrollHeight - e.scrollTop - e.clientHeight < 32)
  return { ok: pausedTop === 0 && button && atBottom, detail: `stayedAtTop=${pausedTop === 0} pausedButton=${button} backAtBottom=${atBottom}` }
})
await step('moving the drawer (Slide L/R, bottom, Float) keeps history and the connection', async () => {
  const before = await page.locator('.chat-drawer .chat-line').count()
  for (const v of ['left', 'bottom', 'float', 'right']) {
    await page.selectOption('.chat-drawer select', v)
    await sleep(250)
  }
  const after = await page.locator('.chat-drawer .chat-line').count()
  return { ok: before > 50 && after === before && connections === 1, detail: `lines ${before} → ${after}, connections=${connections}` }
})
await step('switching channel chips keeps each channel\'s own history', async () => {
  const other = (await page.locator('.chat-chips .chip:not(.is-on)').first().textContent()).replace('#', '')
  privmsg(other, 'zed', 'over here')
  await sleep(300)
  await page.locator('.chat-chips .chip', { hasText: `#${other}` }).click()
  await sleep(300)
  const otherText = await page.locator('.chat-drawer .chat-line').allInnerTexts()
  await page.locator('.chat-chips .chip', { hasText: `#${ch}` }).click()
  await sleep(300)
  const backCount = await page.locator('.chat-drawer .chat-line').count()
  return { ok: otherText.length === 1 && otherText[0].includes('over here') && backCount > 50, detail: `#${other} lines=${otherText.length}; back on #${ch} lines=${backCount}` }
})
await step('adding a stream joins its chat on the same connection (no reconnect)', async () => {
  await page.locator('.chrome-search input').fill('pokimane')
  await page.locator('.chrome-search input').press('Enter')
  await sleep(800)
  return { ok: received.some((l) => l === 'JOIN #pokimane') && connections === 1, detail: `connections=${connections} joins=${received.filter((l) => l.startsWith('JOIN')).join(' ')}` }
})
await step('removing a stream parts its chat', async () => {
  await page.locator('.stream-grid__item', { hasText: 'pokimane' }).locator('.stream-tile__actions .icon-btn.danger').click()
  await sleep(600)
  return { ok: received.some((l) => l === 'PART #pokimane') && connections === 1, detail: `connections=${connections}` }
})
await step('Settings → Reconnect chat opens a fresh connection', async () => {
  await page.keyboard.press('Control+Comma')
  await page.getByRole('tab', { name: 'Advanced' }).click()
  await page.locator('.modal-card button', { hasText: 'Reconnect chat' }).click()
  await page.locator('.modal-footer button', { hasText: 'Cancel' }).click()
  await sleep(1500)
  return { ok: connections === 2 && (await page.locator('.dot--connected').count()) === 1, detail: `connections=${connections}` }
})
await step('chat messages do not re-render the stream tiles', async () => {
  // Tag the player mounts; a desk re-render that remounted players would drop the tag.
  await page.evaluate(() => document.querySelectorAll('.twitch-player').forEach((e) => (e.dataset.probe = '1')))
  const before = await page.evaluate(() => {
    window.__mut = 0
    const obs = new MutationObserver((m) => (window.__mut += m.length))
    document.querySelectorAll('.stream-grid').forEach((g) => obs.observe(g, { subtree: true, childList: true, attributes: true }))
    return true
  })
  for (let i = 0; i < 30; i++) privmsg(ch, 'fast', `burst ${i}`)
  await sleep(800)
  const mut = await page.evaluate(() => window.__mut)
  const probes = await page.locator('.twitch-player[data-probe="1"]').count()
  return { ok: before && mut === 0 && probes >= 2, detail: `gridMutationsDuringBurst=${mut} playersKept=${probes}` }
})
await step('Helix: badges, emotes, cheermotes, and user emotes were requested with the token', async () => {
  const helixHits = await page.evaluate(() => window.__helixHits)
  const paths = [...new Set(helixHits.map((h) => h.split(/[? ]/)[0]))].sort()
  const allAuthed = helixHits.every((h) => h.endsWith('auth=Bearer tok'))
  return { ok: ['/helix/bits/cheermotes', '/helix/chat/badges', '/helix/chat/badges/global', '/helix/chat/emotes', '/helix/chat/emotes/global', '/helix/chat/emotes/user'].every((p) => paths.includes(p)) && allAuthed, detail: paths.join(' ') + ' allAuthed=' + allAuthed }
})

// Light theme screenshot
await page.keyboard.press('Control+Comma')
await page.locator('.modal-card label.choice', { hasText: 'Light' }).locator('input').check()
await page.locator('.modal-footer button', { hasText: 'Save' }).click()
await sleep(500)
await step('light theme: chat readable, names darkened, emotes use the light variant', async () => {
  privmsg(ch, 'lime', 'light Kappa', { color: '#00FF7F', emotes: '25:6-10' })
  await sleep(400)
  const color = await lastLine().locator('.chat-line__user').evaluate((e) => getComputedStyle(e).color)
  const src = await lastLine().locator('img.chat-emote').getAttribute('src')
  await lines().evaluate((e) => (e.scrollTop = e.scrollHeight))
  await shot('chat-twitch-light')
  return { ok: color !== 'rgb(0, 255, 127)' && src.includes('/light/'), detail: `name=${color} emote=${src}` }
})

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`)
writeFileSync(join(shots, 'chat-results.json'), JSON.stringify(results, null, 2))
await app.close().catch(() => undefined)
wss.close()
process.exit(0)
