# Stream Watcher

Multi-stream Twitch viewer with a thin top bar, fit-to-window layouts, account login, and chat. The **core app runs in a normal browser**. Electron adds Prime/ads session login and chat pop-out windows.

## Features

- 42px frosted top bar: truncated stream title + Lucide icon controls
- Hover tooltips (~200ms) plus native `title` on every icon
- Layouts always fill the window (1, 1×2, 2×2, 1+3) — no page scroll
- Per-stream chat as a slide-over drawer; pop out to another monitor (desktop)
- Fullscreen with optional pinned / auto-hiding chrome
- Separate **Login for Prime / fewer ads** (desktop session) and **Login to send chat** (OAuth)
- First run: dismissible tip only — no setup wizard
- Windows EXE installer via electron-builder

## Browser vs desktop

The renderer detects Electron with `window.streamWatcher`. Desktop-only icons **stay visible** in the browser; hover or click shows **Desktop app only**.

| Capability | Browser (`npm run dev` / `npm run preview`) | Electron (`npm run dev:desktop`) |
|---|---|---|
| Stream grid, layouts, thin top bar | Yes | Yes |
| Fullscreen-in-tab | Yes | Yes (window fullscreen) |
| Chat drawer + tmi.js | Yes | Yes |
| Chat OAuth (send messages) + Client ID | Yes | Yes |
| Prime / ads session login | Visible, **Desktop app only** | Works (`twitch.tv/login` cookies) |
| Pop-out chat on another monitor | Visible, **Desktop app only** | Works (`chat:open-popout`) |

## Setup (developers)

```bash
npm install
```

### Twitch Developer App (for chat login)

1. Open [Twitch Developer Console](https://dev.twitch.tv/console)
2. Create an application
3. Set OAuth Redirect URL to `http://localhost:5173/oauth/callback`
4. Paste the **Client ID** into Settings (gear)

## Run

```bash
npm run dev           # Vite in the browser — no Electron required
npm run dev:desktop   # Vite + Electron window
npm run build
npm run preview       # Browser preview of the production build
```

Open `http://localhost:5173` for watching, layouts, the chat drawer, and chat OAuth.

## Windows installer

```bash
npm run dist
```

Produces an unsigned NSIS installer and portable EXE under `release/`. Install, open, and you land on the thin top-bar shell — no wizard. Sign the installer later if you ship publicly.

Normal users should install the EXE. `npm install` is for development only.

## Usage

- Click the **title** to add / switch streams
- **Open chat** toggles the per-stream drawer
- **Open chat on another monitor** pops out a dedicated Electron window (desktop). In the browser the icon stays; hover/click says **Desktop app only**.
- **Login for Prime / fewer ads** is the Twitch cookie session (`twitch.tv/login`, desktop) — not OAuth. Same **Desktop app only** tip in the browser.
- **Login to send chat** is a separate OAuth control (`chat:read` + `chat:edit`) and works in the browser.
- **F11** fullscreen, **Escape** exits; pin the bar if you do not want it to auto-hide

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server in the browser |
| `npm run dev:desktop` | Dev server + Electron |
| `npm run dev:web` | Alias of `npm run dev` |
| `npm run build` | Production renderer + Electron main |
| `npm run preview` | Browser preview of the production build |
| `npm run dist` | Windows NSIS + portable EXE |
