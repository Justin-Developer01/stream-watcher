# Using Stream Watcher

[Home](index.md) · [Features](FEATURES.md)

Start here if you just downloaded the Windows EXE. The same pages open from **Settings → Advanced → Help / Docs**.

1. [Install](#install-windows)
2. [First run](#first-run)
3. [Add streams](#add-streams)
4. [Login to Twitch](#login-to-twitch)
5. [Focus Mode](#focus-mode)
6. [Chat](#chat)
7. [Settings](#settings)
8. [See desktop + Lock](#see-desktop--lock-window)
9. [Performance Mode](#performance-mode)
10. [Check for Updates](#check-for-updates)

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

The Focus icon makes one stream large and the others a bottom strip. Click a strip tile to promote it. Drag/resize is off while Focus is on.

## Chat

**Open chat** docks a drawer that pushes the grid (right / left / bottom) or floats. **Open chat on another monitor** pops out a separate window (desktop only). Drag that window to any display — Stream Watcher remembers its position, size, and always-on-top. **Dock back** on the pop-out returns chat to the main drawer.

## Multi-monitor (desktop)

The main window starts on your primary display. Chat and stream pop-outs are independent windows so they can live on other monitors. Bounds are saved per channel in the app’s user data (`popout-windows.json`) — last monitor, position, size, and always-on-top.

- First pop-out without a saved position opens on a **second monitor** when one exists.
- Closing a display that held a pop-out clamps it back onto a remaining screen.
- Tile icons (not the thin top bar): **Pop out chat to another monitor** and **Pop out stream to another monitor**. The stream tile stays in the grid as **On another monitor**.
- **Dock back** and the pin (**Always on top**) live on the pop-out only.

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

Empty areas then **click through** to the desktop. Use **Lock window** on the top bar when you need to click near gaps. Tooltips: **Lock window (disable click-through)** / **Unlock click-through**.

Windows may need a relaunch if the desktop does not show through after the first toggle.

## Performance Mode

The gauge icon on the top bar. Focused stream stays full quality and is the only unmuted audio. Other tiles show **paused / low**. Glass blur is reduced. The bar stays 42px.

## Check for Updates

**Settings → Updates**. Looks at GitHub Releases, including pre-releases. Works for the NSIS Setup app. Portable users download a new EXE.

## Developers

See the [README](../README.md) for `npm run dev`, Client ID, and packaging.
