# Stream Watcher

Desktop multi-stream Twitch viewer. The **primary “just works” path is the Windows EXE**: download, install, open, use. A browser/Vite mode exists for development and for watching without Electron.

## For most people (Windows)

You do **not** need Node, Git, or `npm install`.

1. Get the unsigned installer from a GitHub Actions artifact or a Release:
   - **Stream Watcher Setup 1.0.1-pre.14.exe** — one-click NSIS installer (desktop + Start Menu shortcuts)
   - **Stream Watcher Portable 1.0.1-pre.14.exe** — no install, just run
2. Open **Stream Watcher**. You land on the thin chrome — no wizard, no OS title bar. Drag the thin bar to move the window. Four short tips appear once (Focus mode, Open chat vs Pop out chat, Lock window, Dock back); Skip / Done dismisses them.
3. Click the title to add Twitch channels.
4. **Login to Twitch** (log-in icon) — tooltip **Login for Prime + chat.** One OAuth flow (`chat:read` + `chat:edit`) that also shares the Electron cookie session with embeds. Release builds bake in the public Client ID, so this is just the one button. Redirect URL: `http://localhost:5173/oauth/callback`.
5. Use **Focus mode** for one large stream and a bottom strip. **Switch Focus** (hotkey) promotes the next strip tile.
6. If that login only half-works, Settings → **Advanced** has **Reconnect chat** and **Refresh Prime session**. The Client ID field is under **Settings → Advanced → Developer**.
7. **Check for Updates** is in **Settings → Updates**. It looks at GitHub Releases, including pre-releases. Download, then **Install and restart** (NSIS). Portable builds can’t auto-update. Check for Updates opens the GitHub Releases page in your browser so you can download a new Setup or Portable EXE. Unsigned SmartScreen prompts are expected.
8. The gear opens a **Settings modal** (Esc / X to close) with left tabs: **Appearance · Chat · Hotkeys · Updates · Advanced · Help**. Appearance → **Chrome: Top | Left** and optional **Ghost overlay** (auto-hide only; the main window is always frameless). **Chat** has Font (including **Custom…**), Size, and Drawer width. Footer **Exit Stream Watcher** quits (or **Quit application**, Ctrl+Q).
9. With several streams open, turn on **Performance mode** (gauge on the thin bar) so only the focused stream stays full quality — other tiles show **paused / low** and use less CPU.
10. **Multi-monitor** — **Open chat** is the in-app drawer (pushes the grid). **Pop out chat** and **Pop out stream** are separate windows. **Dock back** and **Always on top** live on the pop-out. Reset icon tooltip: **Dock all pop-outs back**. How-to: [docs/USAGE.md](docs/USAGE.md#chat-vs-stream-on-another-monitor).

Docs for downloaders: [docs/](docs/index.md) — [How to use](docs/USAGE.md) · [Feature list](docs/FEATURES.md). In-app: **Settings → Help**.

Windows SmartScreen may warn because the build is **unsigned**. “More info” → “Run anyway” is expected until a code-signing cert is added. In-app updates use the same unsigned GitHub assets, so SmartScreen can also appear when installing an update.

`npm install` is **for developers only**.

## Features

- 42px frosted top bar: truncated stream title + Lucide icon controls
- Hover tooltips (~200ms) plus native `title` on every icon
- Layouts always fill the window (1, 1×2, 2×2, 1+3) — no page scroll
- Per-stream chat as a slide-over drawer; pop out chat or a stream tile to another monitor (desktop)
- Frameless main window (drag the thin bar). Fullscreen with optional pinned / auto-hiding chrome. **Ghost overlay** auto-hides the bar until the edge or Pin.
- **Login to Twitch** — one top-bar control for Prime + chat OAuth (no Client ID field on first run)
- **Check for Updates** — Settings → Updates; GitHub Releases (pre-releases included) for the installed Setup app
- **Settings modal** — top-bar gear opens a frosted ~560×480 modal with left nav: Appearance · Chat · Hotkeys · Updates · Advanced · Help
- **Appearance** — Dark / Dim / Light, Accent / Surface / Text, Color or Image background, **Chrome: Top | Left** (Top default), **See desktop behind app.**, and **Ghost overlay** (off by default; auto-hides the thin bar only). The main window is frameless. Empty stage can show the desktop; chrome, tiles, and chat stay solid. Twitch players are not rethemed.
- **Chat** — Settings → Chat. Font: System / IBM Plex Sans / Inter / Mono / Source Sans 3 / Roboto / Geist + **Custom…** (type a Windows-installed family; live preview; falls back to System). Size 12–16 (default 13). **Drawer width** 280–480px for docked side chat. After **Login to Twitch**, emotes render in the list and a composer picker. No Bits control.
- **Click-through** — with See desktop on, empty stage clicks pass through to the desktop. **Lock window (click-through)** on the top bar freezes that. Unlock to pass through again.
- **Hotkeys** — remappable chords including **Switch Focus**, **Cycle streams**, **Mute all**, **Focus search/add stream**, **Toggle chrome**, **Quit application** (Ctrl+Q), Focus mode, Fullscreen, Toggle chat, Lock window, Open Settings, Mute focus. Click a keychip to rebind; Reset defaults.
- **Quit** — Settings footer **Exit Stream Watcher**, or **Quit application** (Ctrl+Q). **Esc** closes Settings only. Required because the main window is frameless.
- **Performance mode** — With several streams open, turn on Performance mode (gauge on the thin bar) so only the focused stream stays full quality — other tiles show paused / low and use less CPU.
- **Layout templates** — thin-bar popover: pick a saved layout, **+** saves the current channels/focus/chat placement, per-row delete removes one. Local persist.
- **Dock all pop-outs back** — reset icon near layout/templates. Docks every chat and stream pop-out.
- **Multi-monitor** — drawer (**Open chat**) vs pop-out windows (**Pop out chat**, **Pop out stream**). **Dock back** + **Always on top** on the pop-out only. Last monitor/position/size remembered. See [docs/USAGE.md](docs/USAGE.md#chat-vs-stream-on-another-monitor).
- **Help** — Settings → Help is a short panel (same names as the tooltips) plus **Show tips**. Links out to full docs.
- First run: the app opens on the thin top-bar shell. Four dismissible tips once: Focus mode, Open chat vs Pop out chat, Lock window (click-through), Dock back. No setup wizard.

## Browser vs desktop

The renderer detects Electron with `window.streamWatcher`. Desktop-only icons **stay visible** in the browser; hover or click shows **Desktop app only**.

| Capability | Browser (`npm run dev` / `npm run preview`) | Electron (EXE / `npm run dev:desktop`) |
|---|---|---|
| Stream grid, layouts, thin top bar | Yes | Yes |
| Fullscreen-in-tab | Yes | Yes (window fullscreen) |
| Chat drawer + tmi.js | Yes | Yes |
| Chat OAuth (send messages) + Client ID | Yes | Yes |
| Prime / ads session (same login flow) | Chat OAuth only | OAuth also sets defaultSession cookies for embeds |
| Pop-out chat on another monitor | Visible, **Desktop app only** | Works (`chat:open-popout`); remembers bounds + always-on-top |
| Pop-out stream tile | Visible, **Desktop app only** | Works (`stream:open-popout`); tile shows **On another monitor** |
| Check for Updates | Settings → Updates | NSIS Setup vs GitHub Releases |
| See desktop behind app | Stage can look transparent | Transparent Electron window; empty stage click-through |
| Lock window | Icon present, no desktop pass-through | Disables click-through while locked |

## Developers

```bash
npm install
npm run dev           # Vite in the browser — no Electron required
npm run dev:desktop   # Vite + Electron window
npm run build
npm run preview       # Browser preview of the production build
```

### Twitch Client ID

Production builds bake a public Twitch Client ID from `VITE_TWITCH_CLIENT_ID` (Vite). First run is just **Login to Twitch**; the field is under **Settings → Developer**. This is a public Client ID, not a Client Secret — never commit a secret.

- **Release / CI:** optional GitHub Actions secret `TWITCH_CLIENT_ID` overrides the build-time default. The Windows workflow passes it as `VITE_TWITCH_CLIENT_ID` to `npm run dist`.
- **Local / dev:** copy `.env.example` to `.env` (gitignored) to override, or leave it empty and use the baked-in ID. Settings → Developer is still the override field.
- OAuth Redirect URL must stay `http://localhost:5173/oauth/callback` to match the Twitch app.

To register your own app:

1. Open [Twitch Developer Console](https://dev.twitch.tv/console)
2. Create an application
3. Set OAuth Redirect URL to `http://localhost:5173/oauth/callback`
4. Paste that app’s **Client ID** into Settings → Developer, or into `.env` as `VITE_TWITCH_CLIENT_ID`

### Package a Windows EXE

On a **Windows** machine (or GitHub Actions `windows-latest`):

```bash
npm run dist
# same as: npm run build:win
```

electron-builder writes unsigned **NSIS** (`Stream Watcher Setup 1.0.1-pre.14.exe`) and **portable** (`Stream Watcher Portable 1.0.1-pre.14.exe`) files to `release/`, plus `latest.yml` / `.blockmap` for `electron-updater`. `appId` is `com.justin.streamwatcher`; product name is **Stream Watcher**. Binaries are gitignored — do not commit them.

`npm run dist` uses `--publish never` so CI does not need a GitHub token for electron-builder. GitHub Actions on `windows-latest` uploads the `stream-watcher-windows` artifact; pushing a `v*` tag attaches those EXEs **and** `latest.yml` to a GitHub Release so **Check for Updates** can find them. Pre-release tags (`pre` / `rc`) are marked as GitHub pre-releases; the app still checks them.

This Linux/macOS checkout can package the app, but the NSIS/portable EXEs need Windows (or Wine).

## Usage

- Click the **title** to add / switch streams
- **Open chat** toggles the in-app drawer (pushes the grid). That is not a second window.
- **Pop out chat** (thin bar, tile, or drawer) opens a chat window. **Pop out stream** (tile) opens the player. **Dock back** and **Always on top** are on the pop-out only. Browser icons say **Desktop app only**. Full how-to: [docs/USAGE.md](docs/USAGE.md#chat-vs-stream-on-another-monitor).
- **Login to Twitch** is one OAuth control (`chat:read` + `chat:edit`). In the desktop app that window uses the same Electron session as the embeds, so Prime/ads follow. Settings → Advanced has **Reconnect chat** / **Refresh Prime session** if the combined flow fails. Client ID lives under **Settings → Advanced → Developer**.
- **Check for Updates** lives in Settings → Updates (not the thin top-bar icon row). It queries GitHub Releases (including pre-releases). Download, then Install and restart. Works for the NSIS Setup app. Portable builds can’t auto-update. Check for Updates opens the GitHub Releases page in your browser so you can download a new Setup or Portable EXE. No code-signing cert is required; SmartScreen may still warn.
- **Settings** (gear) opens the modal. Appearance includes **See desktop behind app.** and **Ghost overlay**. Chat tab has Font (including **Custom…**), Size, and Drawer width. Hotkeys are remappable. Lock window on the top bar disables click-through. **Exit Stream Watcher** in the footer quits.
- **F11** fullscreen (remappable), **Escape** closes Settings then exits fullscreen / chat; pin the bar if you do not want it to auto-hide. **Ctrl+Q** quits (remappable).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server in the browser |
| `npm run dev:desktop` | Dev server + Electron |
| `npm run dev:web` | Alias of `npm run dev` |
| `npm run build` | Production renderer + Electron main |
| `npm run preview` | Browser preview of the production build |
| `npm run dist` / `npm run build:win` | Windows NSIS installer + portable EXE |
