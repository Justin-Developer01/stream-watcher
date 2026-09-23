# Using Stream Watcher

[Home](index.md) · [Features](FEATURES.md)

Start here if you just downloaded the Windows EXE. The same pages open from **Settings → Help**.

1. [Install](#install-windows)
2. [Window controls](#window-controls)
3. [First run](#first-run)
4. [Add streams](#add-streams)
5. [Login to Twitch](#login-to-twitch)
6. [Mode](#mode)
7. [Chat in the main window](#chat-in-the-main-window)
8. [Chat vs stream on another monitor](#chat-vs-stream-on-another-monitor)
9. [Settings](#settings)
10. [See through windows](#see-through-windows)
11. [Edge-snap position](#edge-snap-position)
12. [Check for Updates](#check-for-updates)

## Install (Windows)

1. Download **Stream Watcher Setup** or **Portable** from a [GitHub Release](https://github.com/Justin-Developer01/stream-watcher/releases).
2. Open the app. SmartScreen may warn because the build is unsigned — **More info → Run anyway**.
3. The app opens **frameless and maximized** — a thin bar, no Windows title bar, no setup wizard.

OAuth redirect used by Login to Twitch: `http://localhost:5173/oauth/callback`.

## Window controls

Frameless means Windows draws no title bar, so the app draws its own: three small icons at the far end of the bar — **Minimize**, **Maximize/Restore**, and **Close**. The window still launches maximized and is still resizable from any edge once restored, with the same sensible minimum size as before.

**Exit Stream Watcher** is a separate, danger-styled button in the Settings modal's footer, and the same action is bound to **Ctrl+Q**. Either quits the whole app (and any open pop-outs); the window's own **Close** button does the same. Esc still only closes whatever modal or drawer is open — it never quits.

## First run

Four short tips appear once: **Focus mode**, **Open chat** vs **Pop out chat**, **See through windows**, **Dock back**. Skip or Done dismisses them. Replay from the hamburger **☰ → Settings → Help → Show tips**.

**Settings → Help** is a short panel (not a tour over the streams). It uses the same control names as the tooltips.

## Add streams

Click the **title** in the top bar. Paste a channel name or `twitch.tv/...` URL. Save channels for later from the same popover.

## Login to Twitch

Open the hamburger **☰** menu → **Login to Twitch**. Tooltip: **Login for Prime + chat.** One OAuth flow covers chat send and the desktop Prime/ads session.

If that only half-works: **Settings → Advanced → Reconnect chat** or **Refresh Prime session**. Client ID is under **Developer** on that tab (baked into release builds).

## Mode

**Mode** on the bar is a three-way switch — **Standard**, **Focus**, **Performance** — and only one is on at a time; picking one turns the other off. **Focus** makes one stream large with the rest in a bottom strip (click a strip tile to promote it; drag/resize is off while Focus is on). **Performance** keeps the focused stream at full quality and unmuted while every other tile pauses at low quality (shown as **paused / low**), easing the frosted-glass blur so the thin bar stays cheap to draw. **Standard** is neither — the regular drag/resize grid.

## Chat in the main window

This is the **in-app drawer**. It is not a second window.

1. Click **Open chat** in the **More …** menu on the bar, or **Open #channel chat** on a tile.
2. The drawer **pushes** the grid so tiles shrink to make room (not an overlay on top of players), unless you choose Float.
3. **Move chat** (the dropdown) sets where the drawer lives: **Slide right**, **Slide left**, **Dock bottom**, or **Float**.
4. **Hide chat** / **Close chat** puts the drawer away. The streams stay on the main desk.

**Open chat** / **Hide chat** only toggle that drawer. They do not move chat to another monitor.

Twitch emotes render inline in messages you receive. Once logged in, an emote button next to Send opens a small picker (Twitch's global emote set) — click one to insert its name into your message. Each line also shows a timestamp on hover.

## Chat vs stream on another monitor

Pop-outs are **separate desktop windows** (Windows EXE / `npm run dev:desktop` only). In the browser the same icons stay visible; hover or click shows **Desktop app only**.

**Quick start:** park on another monitor → **See through windows** when you need the UI (or the Lock window hotkey, `L`, to freeze click-through) → **Dock back** to the main desk.

The thin top bar does **not** grow extra monitor controls beyond a compact **redock** menu. Stream pop-out lives on the tile. Chat pop-out is on the tile, in the chat drawer, and in the **More …** menu.

### Pop out chat

| Control | Where | What it does |
|---|---|---|
| **Pop out chat** | Stream tile, the chat drawer, or the **More …** menu | Opens a chat window for that channel |

The drawer closes for that channel. Chat now lives in its own window (`#channel` in the title). Drag that window to any display.

### Pop out stream

| Control | Where | What it does |
|---|---|---|
| **Pop out stream** | Stream tile (monitor icon) | Sends **that player** to its own window |

The tile is removed from the grid entirely — no placeholder, no reserved gap. A **redock** menu appears on the top bar with a count badge; open it to see each popped channel and its own **Dock back** button, or use **Dock all pop-outs** to bring every popped window back at once. The main desk does not play that stream until you dock it. Chat is unchanged — pop the player and the chat separately if you want both on the other monitor.

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

**☰ → Settings** opens a frosted modal (~560×480). **Esc** closes it (never quits the app). Left tabs:

| Tab | What it holds |
|---|---|
| Appearance | Dark / Dim / Light, colors, background, **See desktop behind app**, Chrome edge (Top/Left/Right/Bottom) |
| Chat | Font (7 fonts + Custom…), Size (12 / 13 / 14 / 16), Drawer width (280–480px) |
| Hotkeys | Label + keychip. **Click to rebind.** Reset defaults. |
| Updates | Check for Updates, download, install and restart |
| Advanced | Developer Client ID, Reconnect / Refresh Prime, full docs links |
| Help | Short in-app guide + Show tips + full docs links |

A footer below the tabs has a danger-styled **Exit Stream Watcher** button — see [Window controls](#window-controls).

## See through windows

**See through windows** on the top bar is a single toggle: turning it on shows the wallpaper through the empty stage (turns on **See desktop behind app**) *and* immediately lets clicks pass through empty areas to the desktop. Turning it off restores both. Stream tiles and chat always stay solid either way.

To click near a gap without turning the whole thing off, use the **Lock window** hotkey (`L` by default) to freeze click-through in place — there's no separate icon for this anymore, only the hotkey. Settings → Appearance still has its own **See desktop behind app** checkbox if you'd rather set that half on its own.

Windows may need a relaunch if the desktop does not show through after the first toggle.

## Edge-snap position

Settings → Appearance → **Chrome**: **Top** (default), **Left**, **Right**, or **Bottom**. The bar becomes a full-height 42px strip on Left/Right (title collapses to an icon) or a full-width strip on Top/Bottom (title keeps its text). Popovers always open toward the free side of the screen. Fullscreen's auto-hide reveals the bar again from whichever edge it's snapped to.

## Check for Updates

**Settings → Updates**. Looks at GitHub Releases, including pre-releases. Works for the NSIS Setup app. Portable users download a new EXE.

## Developers

See the [README](../README.md) for `npm run dev`, Client ID, and packaging.
