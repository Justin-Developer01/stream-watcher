# Stream Watcher

Desktop multi-stream Twitch viewer. The **primary “just works” path is the Windows EXE**: download, install, open, use. A browser/Vite mode exists for development and for watching without Electron.

## For most people (Windows)

You do **not** need Node, Git, or `npm install`.

1. Get the unsigned installer from a GitHub Actions artifact or a Release:
   - **Stream Watcher Setup 1.0.1-pre.1.exe** — one-click NSIS installer (desktop + Start Menu shortcuts)
   - **Stream Watcher Portable 1.0.1-pre.1.exe** — no install, just run
2. Open **Stream Watcher**. You land on the thin top-bar shell — no wizard. A one-time toast points at **Login to Twitch**; dismiss it and it does not come back.
3. Click the title to add Twitch channels.
4. **Login to Twitch** (log-in icon) — tooltip **Login for Prime + chat.** One OAuth flow (`chat:read` + `chat:edit`) that also shares the Electron cookie session with embeds. Paste a Twitch Client ID in Settings first (gear). Redirect URL: `http://localhost:5173/oauth/callback`.
5. If that flow only half-works, Settings has **Reconnect chat** and **Refresh Prime session**.
6. **Check for Updates** (top bar or Settings) looks at GitHub Releases, including pre-releases. Download, then **Install and restart** (NSIS). Unsigned SmartScreen prompts are expected.

Windows SmartScreen may warn because the build is **unsigned**. “More info” → “Run anyway” is expected until a code-signing cert is added. In-app updates use the same unsigned GitHub assets, so SmartScreen can also appear when installing an update.

`npm install` is **for developers only**.

## Features

- 42px frosted top bar: truncated stream title + Lucide icon controls
- Hover tooltips (~200ms) plus native `title` on every icon
- Layouts always fill the window (1, 1×2, 2×2, 1+3) — no page scroll
- Per-stream chat as a slide-over drawer; pop out to another monitor (desktop)
- Fullscreen with optional pinned / auto-hiding chrome
- **Login to Twitch** — one top-bar control for Prime + chat OAuth
- **Check for Updates** — GitHub Releases (pre-releases included) for the installed Setup app
- First run: the app opens on the thin top-bar shell. Optional one-time toast: **Login to Twitch**. Dismiss it and it does not return. No setup wizard.

## Browser vs desktop

The renderer detects Electron with `window.streamWatcher`. Desktop-only icons **stay visible** in the browser; hover or click shows **Desktop app only**.

| Capability | Browser (`npm run dev` / `npm run preview`) | Electron (EXE / `npm run dev:desktop`) |
|---|---|---|
| Stream grid, layouts, thin top bar | Yes | Yes |
| Fullscreen-in-tab | Yes | Yes (window fullscreen) |
| Chat drawer + tmi.js | Yes | Yes |
| Chat OAuth (send messages) + Client ID | Yes | Yes |
| Prime / ads session (same login flow) | Chat OAuth only | OAuth also sets defaultSession cookies for embeds |
| Pop-out chat on another monitor | Visible, **Desktop app only** | Works (`chat:open-popout`) |
| Check for Updates | Visible, **Desktop app only** | NSIS Setup vs GitHub Releases |

## Developers

```bash
npm install
npm run dev           # Vite in the browser — no Electron required
npm run dev:desktop   # Vite + Electron window
npm run build
npm run preview       # Browser preview of the production build
```

### Twitch Developer App (for chat login)

1. Open [Twitch Developer Console](https://dev.twitch.tv/console)
2. Create an application
3. Set OAuth Redirect URL to `http://localhost:5173/oauth/callback`
4. Paste the **Client ID** into Settings (gear)

### Package a Windows EXE

On a **Windows** machine (or GitHub Actions `windows-latest`):

```bash
npm run dist
# same as: npm run build:win
```

electron-builder writes unsigned **NSIS** (`Stream Watcher Setup 1.0.1-pre.1.exe`) and **portable** (`Stream Watcher Portable 1.0.1-pre.1.exe`) files to `release/`, plus `latest.yml` / `.blockmap` for `electron-updater`. `appId` is `com.justin.streamwatcher`; product name is **Stream Watcher**. Binaries are gitignored — do not commit them.

`npm run dist` uses `--publish never` so CI does not need a GitHub token for electron-builder. GitHub Actions on `windows-latest` uploads the `stream-watcher-windows` artifact; pushing a `v*` tag attaches those EXEs **and** `latest.yml` to a GitHub Release so **Check for Updates** can find them. Pre-release tags (`pre` / `rc`) are marked as GitHub pre-releases; the app still checks them.

This Linux/macOS checkout can package the app, but the NSIS/portable EXEs need Windows (or Wine).

## Usage

- Click the **title** to add / switch streams
- **Open chat** toggles the per-stream drawer
- **Open chat on another monitor** pops out a dedicated Electron window (desktop). In the browser the icon stays; hover/click says **Desktop app only**.
- **Login to Twitch** is one OAuth control (`chat:read` + `chat:edit`). In the desktop app that window uses the same Electron session as the embeds, so Prime/ads follow. Settings has **Reconnect chat** / **Refresh Prime session** if the combined flow fails.
- **Check for Updates** queries GitHub Releases (including pre-releases). Download, then Install and restart. Works for the NSIS Setup app. Portable users download a new EXE. No code-signing cert is required; SmartScreen may still warn.
- **F11** fullscreen, **Escape** exits; pin the bar if you do not want it to auto-hide

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server in the browser |
| `npm run dev:desktop` | Dev server + Electron |
| `npm run dev:web` | Alias of `npm run dev` |
| `npm run build` | Production renderer + Electron main |
| `npm run preview` | Browser preview of the production build |
| `npm run dist` / `npm run build:win` | Windows NSIS installer + portable EXE |
