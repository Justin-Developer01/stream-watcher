# Using Stream Watcher

[Home](index.md) · [Features](FEATURES.md)

Start here if you just downloaded the Windows EXE. The same pages open from **Settings → Advanced → Help / Docs**.

1. [Install](#install-windows)
2. [First run](#first-run)
3. [Add streams](#add-streams)
4. [Login to Twitch](#login-to-twitch)
5. [Focus Mode](#focus-mode)
6. [Chat in the main window](#chat-in-the-main-window)
7. [Chat vs stream on another monitor](#chat-vs-stream-on-another-monitor)
8. [Settings](#settings)
9. [See desktop + Lock](#see-desktop--lock-window)
10. [Performance Mode](#performance-mode)
11. [Check for Updates](#check-for-updates)

## Install (Windows)

1. Download **Stream Watcher Setup** or **Portable** from a [GitHub Release](https://github.com/Justin-Developer01/stream-watcher/releases).
2. Open the app. SmartScreen may warn because the build is unsigned — **More info → Run anyway**.
3. You land on the thin top bar. There is no setup wizard.

OAuth redirect used by Login to Twitch: `http://localhost:5173/oauth/callback`.

## First run

A one-time toast points at **Login to Twitch**. Dismiss it and it does not come back.

## Add streams

Click the **title** in the top bar. Paste a channel name or `twitch.tv/...` URL. Save channels for later from the same popover.

## Login to Twitch

Click the log-in icon. Tooltip: **Login for Prime + chat.** One OAuth flow covers chat send and the desktop Prime/ads session.

If that only half-works: **Settings → Advanced → Reconnect chat** or **Refresh Prime session**. Client ID is under **Developer** on that tab (baked into release builds).

## Focus Mode

The **Focus mode** icon makes one stream large and the others a bottom strip. Click a strip tile to promote it. Drag/resize is off while Focus is on.

## Chat in the main window

This is the **in-app drawer**. It is not a second window.

1. Click **Open chat** on the thin top bar, or **Open #channel chat** on a tile.
2. The drawer **pushes** the grid so tiles shrink to make room (not an overlay on top of players), unless you choose Float.
3. **Move chat** (the dropdown) sets where the drawer lives: **Slide right**, **Slide left**, **Dock bottom**, or **Float**.
4. **Hide chat** / **Close chat** puts the drawer away. The streams stay on the main desk.

**Open chat** / **Hide chat** only toggle that drawer. They do not move chat to another monitor.

## Chat vs stream on another monitor

Pop-outs are **separate desktop windows** (Windows EXE / `npm run dev:desktop` only). In the browser the same icons stay visible; hover or click shows **Desktop app only**.

The thin top bar does **not** grow extra monitor controls. Stream pop-out lives on the tile. Chat pop-out is on the tile, in the chat drawer, and as one top-bar icon.

### Pop out chat

| Control | Where | Tooltip / label |
|---|---|---|
| **Open chat on another monitor** | Thin top bar | Opens a chat window for the current channel |
| **Pop out chat to another monitor** | Stream tile, or the chat drawer | Same thing, for that channel |

The drawer closes for that channel. Chat now lives in its own window (`#channel` in the title). Drag that window to any display.

### Pop out a stream (the player)

| Control | Where | Tooltip / label |
|---|---|---|
| **Pop out stream to another monitor** | Stream tile (monitor icon) | Sends **that player** to its own window |

The tile stays in the grid and reads **On another monitor**. The main desk does not play that stream until you dock it. Chat is unchanged — pop the player and the chat separately if you want both on the other monitor.

### On the pop-out window

| Control | What it does |
|---|---|
| **Dock back** | Closes the pop-out and returns chat to the main drawer, or the player to the grid tile |
| **Always on top** (pin) | Keeps **this** pop-out above other windows. Off by default. Does not pin the main desk. Tooltip becomes **Disable always on top** when it is on |

Closing the pop-out with the window **X** also returns that chat/stream to the main desk, without auto-opening the chat drawer.

### Remembered position

Each pop-out is saved **per channel** (chat and stream are stored separately) in app user data (`popout-windows.json`):

- last **monitor**
- **position** and **size**
- **Always on top** on or off

Pop the same channel out again and it should reopen where you left it. A first-time pop-out (nothing saved yet) prefers a **second monitor** if you have one.

### If a display is unplugged

The main desk starts on the **primary** display. If that screen goes away, the main window snaps back onto a remaining screen.

If a pop-out’s monitor is gone, that window clamps onto a remaining display. The next time you pop it out, Stream Watcher uses the saved size and always-on-top, on a monitor that still exists.

## Settings

The gear opens a frosted modal (~560×480). **Esc** or **X** closes it. Left tabs:

| Tab | What it holds |
|---|---|
| Appearance | Dark / Dim / Light, colors, background, **See desktop behind app.** |
| Chat | Font (System / IBM Plex Sans / Inter / Mono) and Size (12 / 13 / 14 / 16) |
| Hotkeys | Label + keychip. **Click to rebind.** Reset defaults. |
| Updates | Check for Updates, download, install and restart |
| Advanced | Developer Client ID, Reconnect / Refresh Prime, Help / Docs |

## See desktop + Lock window

Turn on **See desktop behind app** to show the wallpaper through empty stage. Stream tiles and chat stay solid.

Empty areas then **click through** to the desktop. Use **Lock window** on the top bar when you need to click near gaps. Tooltips: **Lock window (disable click-through)** / **Unlock click-through**. If See desktop is off, the lock icon tooltip is **Lock window (enable See desktop behind app first)**.

Windows may need a relaunch if the desktop does not show through after the first toggle.

## Performance Mode

The **Performance mode** icon on the top bar. Focused stream stays full quality and is the only unmuted audio. Other tiles show **paused / low**. Glass blur is reduced. The bar stays 42px.

## Check for Updates

**Settings → Updates**. Looks at GitHub Releases, including pre-releases. Works for the NSIS Setup app. Portable users download a new EXE.

## Developers

See the [README](../README.md) for `npm run dev`, Client ID, and packaging.
