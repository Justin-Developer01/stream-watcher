# Stream Watcher

Desktop multi-stream Twitch viewer with drag-and-resize layouts, account login, and chat.

## Features

- Thin top toolbar (~44px) with icon buttons and hover tooltips
- Add multiple Twitch channels (name or `twitch.tv/...` URL)
- Arrange streams with [react-grid-layout](https://github.com/react-grid-layout/react-grid-layout)
- Layout presets: 1, 1×2, 2×2, 1+3
- Per-stream chat via tile action or the top-bar channel switcher
- Slide-over / compact chat dock (also float or pop out)
- Fullscreen mode: streams fill the window; chrome is the thin top bar (auto-hides on idle)
- Focus a stream to unmute it (others stay muted)
- Twitch session login so Prime / Turbo ad benefits can apply in embeds
- OAuth login for sending chat via Twitch IRC (`tmi.js`)
- Layout + streams persist in local storage

## Stack

- Electron
- React + TypeScript + Vite
- react-grid-layout
- Twitch Embed + Helix API + IRC chat

## Setup

```bash
npm install
```

If Electron fails to launch with “failed to install correctly”, approve install scripts and reinstall:

```bash
npm install-scripts approve electron
npm install-scripts approve esbuild
node node_modules/electron/install.js
```

### Twitch Developer App (for chat login)

1. Open [Twitch Developer Console](https://dev.twitch.tv/console)
2. Create an application
3. Set OAuth Redirect URL to:

```text
http://localhost:5173/oauth/callback
```

4. Copy the **Client ID** into Stream Watcher → Settings (gear icon)

> "Login for Prime / ads" opens a normal Twitch login window and shares the session with embeds.  
> "Login for chat" uses OAuth with `chat:read` and `chat:edit`.

## Run

```bash
npm run dev
```

This starts Vite and launches the Electron window.

## Usage tips

- Use the **+** button to add a channel; hover any icon for a tooltip
- Open chat from a tile, the chat icon, or the channel switcher
- Drag tiles with the handle on the tile bar
- Double-click a player (or click the channel name) to focus / unmute
- Press **F11** for fullscreen, **Escape** to exit
- Keep only one stream unmuted for better performance

## Scripts

| Command         | Description               |
|-----------------|---------------------------|
| `npm run dev`   | Dev server + Electron     |
| `npm run build` | Production renderer build |
