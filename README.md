# Stream Watcher

Desktop multi-stream Twitch viewer. The **primary “just works” path is the Windows EXE**: download, install, open, use. A browser/Vite mode exists for development and for watching without Electron.

## For most people (Windows)

You do **not** need Node, Git, or `npm install`.

1. Get the unsigned installer from a GitHub Actions artifact or a Release:
   - **Stream Watcher Setup 1.0.1-pre.7.exe** — one-click NSIS installer (desktop + Start Menu shortcuts)
   - **Stream Watcher Portable 1.0.1-pre.7.exe** — no install, just run
2. Open **Stream Watcher**. You land on the thin top-bar shell — no wizard. A one-time toast points at **Login to Twitch**; dismiss it and it does not come back.
3. Click the title to add Twitch channels.
4. **Login to Twitch** (log-in icon) — tooltip **Login for Prime + chat.** One OAuth flow (`chat:read` + `chat:edit`) that also shares the Electron cookie session with embeds. Release builds bake in the public Client ID, so this is just the one button. Redirect URL: `http://localhost:5173/oauth/callback`.
5. If that flow only half-works, Settings → **Advanced** has **Reconnect chat** and **Refresh Prime session**. The Client ID field is under **Settings → Advanced → Developer**.
6. **Check for Updates** is in **Settings → Updates**. It looks at GitHub Releases, including pre-releases. Download, then **Install and restart** (NSIS). Unsigned SmartScreen prompts are expected.
7. The gear opens a **Settings modal** (Esc / X to close) with left tabs: **Appearance · Chat · Hotkeys · Updates · Advanced**.
8. **Appearance** has Dark / Dim / Light, Accent / Surface / Text, Color or Image background, and **Window → See desktop behind app.** Chat **Font** (System / IBM Plex Sans / Inter / Mono) + **Size** (12 / 13 / 14 / 16, default 13) live under the **Chat** tab.
9. **Performance mode** is the gauge icon on the top bar. The focused stream stays full quality and unmuted; other tiles show **paused / low**.

Full walkthrough: [docs/USAGE.md](docs/USAGE.md). Feature list: [docs/FEATURES.md](docs/FEATURES.md).

Windows SmartScreen may warn because the build is **unsigned**. “More info” → “Run anyway” is expected until a code-signing cert is added. In-app updates use the same unsigned GitHub assets, so SmartScreen can also appear when installing an update.

`npm install` is **for developers only**.

## Features

- 42px frosted top bar: truncated stream title + Lucide icon controls
- Hover tooltips (~200ms) plus native `title` on every icon
- Layouts always fill the window (1, 1×2, 2×2, 1+3) — no page scroll
- Per-stream chat as a slide-over drawer; pop out to another monitor (desktop)
- Fullscreen with optional pinned / auto-hiding chrome
- **Login to Twitch** — one top-bar control for Prime + chat OAuth (no Client ID field on first run)
- **Check for Updates** — Settings → Updates; GitHub Releases (pre-releases included) for the installed Setup app
- **Settings modal** — top-bar gear opens a frosted ~560×480 modal with left nav: Appearance · Chat · Hotkeys · Updates · Advanced
- **Appearance** — Dark / Dim / Light, Accent / Surface / Text, Color or Image background, and **See desktop behind app.** Empty stage can show the desktop; top bar, tiles, and chat stay solid. Twitch players are not rethemed.
- **Chat type** — Settings → Chat. Font chips System / IBM Plex Sans / Inter / Mono and Size 12 / 13 / 14 / 16 (default 13) apply only to `.chat-line` and the composer. An open drawer live-updates.
- **Click-through** — with See desktop on, empty stage clicks pass through to the desktop. **Lock window** on the top bar freezes that. Unlock to pass through again.
- **Hotkeys** — remappable chords for Focus Mode, Fullscreen, Toggle chat, Lock window, Open Settings, Add stream, Mute focus. Click a keychip to rebind; Reset defaults.
- **Performance mode** — top-bar gauge. Focused stream full quality + one unmuted audio; other tiles **paused / low**; glass blur eased.
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

electron-builder writes unsigned **NSIS** (`Stream Watcher Setup 1.0.1-pre.7.exe`) and **portable** (`Stream Watcher Portable 1.0.1-pre.7.exe`) files to `release/`, plus `latest.yml` / `.blockmap` for `electron-updater`. `appId` is `com.justin.streamwatcher`; product name is **Stream Watcher**. Binaries are gitignored — do not commit them.

`npm run dist` uses `--publish never` so CI does not need a GitHub token for electron-builder. GitHub Actions on `windows-latest` uploads the `stream-watcher-windows` artifact; pushing a `v*` tag attaches those EXEs **and** `latest.yml` to a GitHub Release so **Check for Updates** can find them. Pre-release tags (`pre` / `rc`) are marked as GitHub pre-releases; the app still checks them.

This Linux/macOS checkout can package the app, but the NSIS/portable EXEs need Windows (or Wine).

## Usage

- Click the **title** to add / switch streams
- **Open chat** toggles the per-stream drawer
- **Open chat on another monitor** pops out a dedicated Electron window (desktop). In the browser the icon stays; hover/click says **Desktop app only**.
- **Login to Twitch** is one OAuth control (`chat:read` + `chat:edit`). In the desktop app that window uses the same Electron session as the embeds, so Prime/ads follow. Settings → Advanced has **Reconnect chat** / **Refresh Prime session** if the combined flow fails. Client ID lives under **Settings → Advanced → Developer**.
- **Check for Updates** lives in Settings → Updates (not the thin top-bar icon row). It queries GitHub Releases (including pre-releases). Download, then Install and restart. Works for the NSIS Setup app. Portable users download a new EXE. No code-signing cert is required; SmartScreen may still warn.
- **Settings** (gear) opens the modal. Appearance includes **See desktop behind app.** Chat tab has Font + Size. Hotkeys are remappable. Lock window on the top bar disables click-through.
- **F11** fullscreen (remappable), **Escape** closes Settings then exits fullscreen / chat; pin the bar if you do not want it to auto-hide

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server in the browser |
| `npm run dev:desktop` | Dev server + Electron |
| `npm run dev:web` | Alias of `npm run dev` |
| `npm run build` | Production renderer + Electron main |
| `npm run preview` | Browser preview of the production build |
| `npm run dist` / `npm run build:win` | Windows NSIS installer + portable EXE |
