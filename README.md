# Stream Watcher

Desktop multi-stream Twitch viewer with drag-and-resize layouts, account login, and chat.

## Features

- Add multiple Twitch channels (name or `twitch.tv/...` URL)
- Arrange streams with [react-grid-layout](https://github.com/react-grid-layout/react-grid-layout)
- Layout presets: 1, 1×2, 2×2, 1+3
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

4. Copy the **Client ID** into Stream Watcher → Settings

> "Login for Prime / ads" opens a normal Twitch login window and shares the session with embeds.  
> "Login for chat" uses OAuth with `chat:read` and `chat:edit`.

## Run

```bash
npm run dev
```

This starts Vite and launches the Electron window.

## Usage tips

- Drag tiles with the **⋮⋮** handle
- Double-click a player (or click the channel name) to focus / unmute
- Use **Chat** on a tile to switch the chat panel to that channel
- Keep only one stream unmuted for better performance

## Scripts

| Command        | Description                |
|----------------|----------------------------|
| `npm run dev`  | Dev server + Electron      |
| `npm run build`| Production renderer build  |
