# Stream Watcher

Desktop multi-stream Twitch viewer with a thin top bar, fit-to-window layouts, account login, and chat. Also runs in a regular browser for core watching and chat.

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

| Capability | Browser (`npm run dev:web` / preview) | Electron desktop |
|---|---|---|
| Stream grid, layouts, fullscreen-in-tab | Yes | Yes |
| Chat drawer + tmi.js | Yes | Yes |
| Chat OAuth (send messages) | Yes (Client ID + redirect) | Yes |
| Prime / ads session login | Visible, **Desktop app only** | Works |
| Pop-out chat on another monitor | Visible, **Desktop app only** | Works |

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
npm run dev        # Vite + Electron window
npm run dev:web    # Browser only
npm run build
npm run preview    # Browser preview of the production build
```

## Windows installer

```bash
npm run dist
```

Produces an unsigned NSIS installer and portable EXE under `release/`. Install, open, and you land on the thin top-bar shell — no wizard. Sign the installer later if you ship publicly.

Normal users should install the EXE. `npm install` is for development only.

## Usage

- Click the **title** to add / switch streams
- **Open chat** toggles the per-stream drawer
- **Pop out chat** opens (or focuses) a dedicated Electron window you can drag to another monitor; the main drawer closes for that channel so IRC is not duplicated. Size and position are remembered.
- **Login for Prime / fewer ads** is the Twitch cookie session (desktop)
- **Login to send chat** is OAuth (`chat:read` + `chat:edit`)
- **F11** fullscreen, **Escape** exits; pin the bar if you do not want it to auto-hide

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server + Electron |
| `npm run dev:web` | Dev server in the browser |
| `npm run build` | Production renderer + Electron main |
| `npm run dist` | Windows NSIS + portable EXE |
