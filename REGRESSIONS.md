# Vesper Desk parity repair: regressions from pre.17 to PR #2

## Baseline

**BASELINE = `b5586ee`**, tag `v1.0.1-pre.17` ("Release 1.0.1-pre.17: label alignment (Exit Vesper Desk, Toggle toolbar)"), on PR #1 (`cursor/top-toolbar-fullscreen-chat-e708`).

- `git rev-list -n1 v1.0.1-pre.17` = `b5586ee`, and `package.json` there is `1.0.1-pre.17`.
- PR #1's tip (`825801b`) is one commit later and only renames an Appearance checkbox label, so the pre.17 tag is the last build Justin actually ran.
- `v1.0.1-pre.18` (`855a87c`) and `v1.0.1-pre.19` (`8fab99c`) are on PR #2. The next unused prerelease number is **pre.20**.

**Compared against:** the PR #2 tip, `4115121` (`cursor/vesper-desk-ui-rebuild`).

The two trees share no files after the electron-vite/Radix rebuild (`6b3bc29`): `electron/main.ts` became `src/main/index.ts`, and `TopBar.tsx` became `ChromeBar.tsx`. The evidence below therefore quotes the specific rule or handler on each side instead of a line diff.

**How each row was verified.** A Playwright script, [`docs/parity/smoke.mjs`](docs/parity/smoke.mjs), drives the **built** app (`out/main`, renderer over `file://`, like a packaged build) under Xvfb on Linux. It ran against the PR #2 tip and against this branch: **26/32 checks pass on the tip and 32/32 on this branch.** It also ran against an unpacked `electron-builder --linux dir` build with `app.asar` (packaged, `app.isPackaged === true`): 32/32 on 2 of 3 runs. The first packaged run had one harness-timing failure in the Dock back step, and it did not reproduce on the next two runs. None of this ran on Windows.

## Regressions and bugs

| # | Area | pre.17 (b5586ee) behavior | PR #2 tip behavior | Files | Evidence | Root cause and origin | Fix |
|---|---|---|---|---|---|---|---|
| 1 | Toolbar hover | Hovering a control lifted its border and background slightly (`button:hover:not(:disabled)`, `.icon-btn:hover`), with `cursor: pointer`. | There is no `:hover` or `:active` rule on `.icon-btn/.text-btn/.mode-btn/.win-btn/.chip`, and the cursor stays `default`. Hovering changes nothing. | `src/index.css` | The tip's computed style for the "Change layout" button is identical before and during hover (`rgba(255,247,236,0.08)` in both states). On the fix, hover goes to about 14% frost with a brighter border. | The hover rules were never ported in the Radix CSS rewrite. **Not** a drag-region problem: see lead 1. | `42c568c` |
| 2 | Window drag | The whole `.topbar` was `app-region: drag`, and its buttons, inputs, and popovers were `no-drag`. | `.chrome-bar` is `no-drag`. Only `.chrome-bar__drag` (the ~30px mark plus the wordmark) is `drag`, and on Left/Right chrome the wordmark is hidden, so only the mark can move the window. | `src/index.css` | Tip: `bar=no-drag`. Fix: `bar=drag`, buttons and search are `no-drag`, and the bar is `no-drag` while Ghost hides it. | Rebuild CSS | `5783737` |
| 3 | **Twitch login (root cause)** | `vite.config.ts` set `VITE_TWITCH_CLIENT_ID` from the CI secret, falling back to the public ID. `env.ts resolveTwitchClientId(saved)` let a saved override win. | `useTwitchAuth(desk.clientId)`, and `desk.clientId` is `''` until someone saves one in Advanced. On a fresh install, Login shows "Add your Twitch Client ID in Settings first" and nothing else happens. `build-windows.yml` passes the secret, but no code reads it. | `src/lib/twitchClientId.ts` (new, a port of `env.ts` and `twitchPublicClientId.ts`), `App.tsx`, `PopoutApp.tsx`, `SettingsModal.tsx`, `vite-env.d.ts`, `.env.example`, `build-windows.yml` | Tip: toast "Add your Twitch Client ID in Settings first", no OAuth window. Fix: the OAuth URL carries `client_id=dqxba57…`. With `VITE_TWITCH_CLIENT_ID=envtestid123 npm run build`, the env value is baked into `out/renderer`. A saved Advanced value (`savedoverrideid`) overrides it. | **The electron-vite migration** (`6b3bc29`) deleted `vite.config.ts` and `env.ts`. Not the Radix work. | `3d44eed` |
| 4 | Twitch login flow | Login to Twitch opened one modal OAuth window. Afterwards, main warmed the twitch.tv cookies and sent `twitch-session-updated`, so embeds kept the Prime session. | `loginToTwitch` calls `loginForPrime()` and then `loginForChat()`. `openTwitchLogin` resolves immediately, so two windows open on top of each other ("Login to Twitch" and "Authorize Vesper Desk"). The cookie warm-up is gone. | `src/hooks/useTwitchAuth.ts`, `src/main/index.ts` | Tip, with a saved Client ID: windows `["Authorize Vesper Desk …", "Login to Twitch twitch.tv/login", "Vesper Desk"]`. Fix: `["Authorize Vesper Desk client_id=savedoverrideid", "Vesper Desk"]`. | Rebuild: the hook was rewritten | `aa7f6ab` |
| 5 | Twitch CSP and scopes | `connect-src` included `player.twitch.tv` and `gql.twitch.tv`. Scopes were `chat:read chat:edit`. | Both hosts were dropped, and the unused `user:read:email` scope was added (an extra consent line). | `index.html`, `src/lib/twitch.ts` | Diff of `index.html` and `twitch.ts` against `b5586ee` | Rebuild | `0322b55` |
| 6 | Chat: Pop out chat | The drawer's Pop out chat popped the channel it was showing and closed the drawer. | It used `desk.chatChannel`, which is `null` until a chip is clicked, so the button did nothing on a fresh desk. The drawer also stayed open. | `src/App.tsx` | Tip: after Pop out chat the main drawer was still open. Fix: the drawer closes and the `?mode=chat` window opens. | Rebuild | `fee4710` |
| 7 | Chat: Dock back | Dock back or Close on a chat pop-out reopened the drawer on that channel. Dock all stayed quiet. | `onDockRequest` ignores `kind === 'chat'`. | `src/App.tsx` | Fix: windows=1, drawer=1, active chip = the docked channel. On the tip the check passes vacuously, because the drawer never closed (row 6). | Rebuild | `fee4710` |
| 8 | Chat: Float | Only a tile's Open chat switched Float to Slide R. The ⋯ menu kept Float. | Every `openChat()` call forces Float to Slide R. | `src/App.tsx` | Tip: after ⋯ → Open chat, `chatDock=right`. Fix: `float`. | Rebuild | `fee4710` |
| 9 | Chat pop-out controls | The pop-out had no drawer controls. | The pop-out showed a Move chat select and a Pop out chat button that did nothing. | `ChatDrawer.tsx`, `PopoutApp.tsx` | Tip: `popoutMoveChatSelect=1`. Fix: `0`. | Rebuild | `fee4710` |
| 10 | Focus strip | Strip tiles were divs with `promoteOnClick`, and the strip player was non-interactive. | The strip wraps each tile in a `<button>`, so buttons nest (7 on the default desk). Action clicks bubble up and promote the tile, and the live player swallows plain clicks. | `StreamGrid.tsx`, `StreamTile.tsx`, `index.css` | Tip: `nestedButtons=7`. Clicking Mute on a strip tile promoted it, and clicking the strip video did nothing. Fix: 0 nested buttons, Mute does not promote, and clicking the video promotes. | Rebuild | `41a5651` |
| 11 | Grid drag feedback | The drag placeholder and resize grip used the accent color. | The library default shows: a **red** placeholder, and a 40% black grip on a black player. | `src/index.css` | `react-grid-layout/css/styles.css` sets `.react-grid-placeholder { background: red }` and the tip never overrides it | Rebuild | `e6015da` |
| 12 | Quit with pop-outs | Main's `closed` handler closed every pop-out. | Pop-outs `preventDefault` their own close (it docks them). After an OS close of the main window (Alt+F4 or the taskbar), the process keeps running with orphan pop-outs. | `src/main/index.ts` | Tip: still running with `mode=stream&channel=xqc` open. Fix: the process exits. The in-app Close and Ctrl+Q already quit on both. | Rebuild | `86c162e` |
| 13 | Settings controls | Native radios and range. | The global `appearance: none` reset plus `.settings-pane input { width:100% }` turned radios into empty boxes, so the selected Theme and Chrome edge were invisible. The range lost its track, and the Switch thumb sat in the middle whether on or off. | `src/index.css` | Screenshots [`before-settings-light-draft-preview.png`](docs/parity/before-settings-light-draft-preview.png) vs [`after-settings-light-radios.png`](docs/parity/after-settings-light-radios.png) | Rebuild CSS | `be0b791` |
| 14 | Disabled chips (Dark/Dim) | Disabled buttons were dimmed. | A disabled chip was *brighter* than an enabled one, so "Dock all pop-outs" read as lifted or selected. | `src/index.css` | [`before-chrome-dark.png`](docs/parity/before-chrome-dark.png) vs [`after-chrome-dark.png`](docs/parity/after-chrome-dark.png) | Rebuild CSS | `39f4905` |
| 15 | Light tile titles | — | The `[data-theme='light'] button` override boxed every channel name in cream with a border. | `src/index.css` | [`before-light-desk.png`](docs/parity/before-light-desk.png) | Rebuild CSS | `5696161` |
| 16 | Pop-out "Always on top" | — | It uses `.icon-btn` (fixed 26px wide) for an icon plus a label, so the text wraps over the bar. `.text-btn.is-on` had no selected style. | `PopoutApp.tsx`, `index.css` | [`before-chat-popout.png`](docs/parity/before-chat-popout.png) vs [`after-chat-popout.png`](docs/parity/after-chat-popout.png) | Rebuild | `a09f7ac` |
| 17 | Chat drawer header | — | `.chrome-select { width:100% }` pushes Pop out chat and Hide chat onto a second row. | `src/index.css` | [`before-chat-right.png`](docs/parity/before-chat-right.png) vs [`after-chat-right.png`](docs/parity/after-chat-right.png) | Rebuild CSS | `b4085c3` |
| 18 | Chat badges | Badges resolved through Helix (`useTwitchChatAssets`). | `badgeUrl(set, version)` builds a CDN path that expects a badge UUID, so badge images 404 and show broken-image glyphs. | `ChatDrawer.tsx` | Code reading. Twitch is unreachable from the test container, so this was not tested live. | Rebuild dropped the Helix lookup | `b908189` hides failed badges. **Partial:** see the open items below. |

## Step 2 leads

1. **Toolbar hover lost.** Confirmed, but not for the suspected reason. None of the buttons sit in a `drag` region without `no-drag`, because the tip's whole bar was `no-drag`. Radix `[data-state]` selectors and the Light tokens don't override `:hover` either. **There were simply no hover rules** (row 1). The drag area also shrank to the logo (row 2). Both are fixed. After the fix, every control inside the now-draggable bar is `no-drag`, so `:hover` keeps working on Windows.
2. **Twitch.**
   - **(a) Root cause, confirmed:** the Client ID is no longer baked in (row 3). It came from the **electron-vite migration**, not from Radix. Fixed.
   - **(b) OAuth redirect:** ruled out as a regression. Main reads `access_token` from the redirect URL in `will-redirect`, `will-navigate`, and `did-navigate`, then closes the window. Nothing has to serve `localhost:5173`, so the packaged build works the same way. In the packaged Linux build the OAuth window opened with the right `client_id` and `redirect_uri`, and the load then failed with `ERR_TUNNEL_CONNECTION_FAILED` because this container blocks twitch.tv. **The full token round trip is not tested.**
   - **(c) Embed `parent` and CSP:** not a regression. The code is identical in both trees: `parent: [location.hostname || 'localhost', 'localhost', '127.0.0.1']`, and main strips response CSP headers. The meta CSP allows `embed.twitch.tv` and `player.twitch.tv` in `script-src` and `frame-src`. The lost `connect-src` hosts are restored (row 5). Whether Twitch accepts `parent=localhost` from a `file://` document is **untested**, both here and in pre.17.
   - **(d) tmi.js and preload:** OK. The ESM `out/preload/index.mjs` loads with `sandbox: false` (`window.vesper` is present in the packaged build), and tmi gets `oauth:<token>`. Live chat is **untested** because the container blocks twitch.tv.
3. **Radix portals.** OK on the tip and on the fix. Menus, the tooltip, the dialog, and the emote popover carry `data-theme`, `data-hit`, and the theme style. Light menus and tooltips measured cream with `#2a2118` text. z-order is 80 for popper content and 100/110 for the modal. Click-through measured `ignore=true` on empty stage and `false` on tiles and the chrome.
4. **Tile drag.** Title-strip drag works and action buttons cancel the drag, on both trees. Focus has no drag handle on either. The Focus strip was broken (row 10) and is fixed.
5. **Settings.** OK on both trees: only Save writes storage, and Reset and Cancel change only the draft (measured through `localStorage`). The controls were unreadable (row 13), which is fixed.
6. **Chat.** The drawer pushes the grid for Slide L, Slide R, and Dock bottom, and Float overlays it (measured stage width 1440 → 1120). The Pop out, Dock back, and Float behavior was broken (rows 6–9) and is fixed.

## Chat rebuilt to work like Twitch (follow-up)

The chat items that were open here (Helix emotes and badges, reconnecting on every channel change, emote ranges vs emoji) are fixed by the chat rebuild: `2e48ba0`, `980b325`, `dd8ddab`. A mock Twitch (IRC WebSocket plus Helix) drives the built app in [`docs/parity/chat-e2e.mjs`](docs/parity/chat-e2e.mjs): 22/22 checks pass on both the built app and the packaged (asar) build, and the 15 parser unit tests pass under `npm test`. It is still untested against the real twitch.tv, which is blocked from this container.

## Still open (not fixed here)

- **Left/Right chrome clips text chips.** "Standard", "Performance", and "Change layout" are cut off inside the 42px side bar ([`after-edge-left.png`](docs/parity/after-edge-left.png)). Fixing it needs icon forms of those chips, which is new UI, so it needs a design decision.
- **Login error toast has no dismiss.** "Login was cancelled" stays until the next attempt.
- **Pop-outs load the theme once** and don't follow a theme saved in the main window until they reopen.

## Checklist

**Verified by running the app** (Linux, Xvfb, built `file://` app, and the unpacked packaged `app.asar` build):

- Dark, Dim, and Light themes. Toolbar hover lifts the chip, and the selected state stays soft cyan on hover. In Light there are no black buttons, and menus, tooltips, and the dialog are cream with dark text.
- Settings: Save writes storage, Reset and Cancel do not, and saved settings survive an app restart.
- Logo mark is 30px with a glow, and the wordmark and window title read "Vesper Desk". There is no Exit control, and Ctrl+Q quits even with a pop-out open.
- Tiles: the title strip drags them, and an action button pressed and moved does not drag and still clicks. Tiles never overlap. Focus mode has no drag handle and the strip promotes correctly.
- Chat: Slide L, Slide R, and Dock bottom push the grid, and Float overlays it. Pop out chat opens a separate window, and Dock back returns it to the drawer.
- Chrome on Top, Left, Right, and Bottom: the bar and stage don't overlap, and the controls stay inside the window. At a 1000×700 resize there are no overlaps and no horizontal scroll.
- See-through keeps the bar always on top. Empty stage ignores the mouse, while tiles and the chrome stay interactive. Lock window shows its chip and stops click-through.
- Ghost overlay hides the bar after idle, and the hidden bar is not a drag region. The edge hot zone reveals it, and Pin keeps it visible.
- Login to Twitch opens one OAuth window with the built-in Client ID, and a saved Client ID overrides it.
- `npm run dev` starts, and the renderer loads from `localhost:5173` with no React errors.

**Not tested:**

- Anything on Windows: hover under a real OS drag region, SmartScreen, and the NSIS/Portable EXEs.
- A live Twitch login, token round trip, player embeds, chat, and emotes. twitch.tv is blocked (403) from this container, so the embed `parent` from `file://` is unverified.

**Still broken:** see "Still open" above.
