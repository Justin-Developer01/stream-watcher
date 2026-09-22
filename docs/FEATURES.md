# Stream Watcher features

[Home](index.md) · [How to use](USAGE.md)

Desktop multi-stream Twitch viewer. The Windows EXE is the primary path.

## Watching
- Add channels from the top-bar title. Layouts: 1, 1×2, 2×2, 1+3. The grid always fills the window (no page scroll).
- Drag the handle and resize tiles. Disabled in Focus mode.
- Save channels from a tile star for later.
- **Focus mode** — hero ~72% / bottom strip ~28%. Click a strip tile to promote it.
- Fullscreen from the top bar (F11 by default). The bar can pin or auto-hide.

## Chat (in-app drawer)
- **Open chat** / **Open #channel chat** slides a drawer that **pushes** the grid (Slide right / Slide left / Dock bottom) or **Float**. This stays in the main window.
- **Hide chat** / **Close chat** puts the drawer away. Streams stay on the desk.
- Send messages after **Login to Twitch**.

## Multi-monitor (desktop pop-out windows)
Pop-outs are separate windows. Browser builds show the icons but say **Desktop app only**.

**Quick start:** park on another monitor → **Lock window (click-through)** when you need the UI → **Dock back** to the main desk.

- **Chat window:** **Pop out chat** (thin top bar, tile, or drawer).
- **Stream window:** **Pop out stream** (tile monitor icon). The grid tile reads **On another monitor**.
- **Dock back** on the pop-out (or the tile, for a popped stream) returns chat to the drawer / the player to the tile. Window **X** also docks; chat drawer does not auto-open.
- **Always on top** (pin) is per pop-out only. Tooltip: **Always on top** / **Disable always on top**. The main desk stays unpinned and thin.
- Last **monitor, position, size, and always-on-top** are remembered per channel (`popout-windows.json` in app user data). Chat and stream for the same channel are stored separately.
- First pop-out with nothing saved prefers a second monitor. If that display is unplugged, the window clamps onto a remaining screen. The main desk opens on the **primary** display and snaps back if that screen goes away.

## Login
- One top-bar control: **Login to Twitch** (tooltip **Login for Prime + chat.**).
- Settings → Advanced: Reconnect chat, Refresh Prime session, Developer Client ID.

## Appearance
Settings modal → **Appearance**
- Presets: Dark / Dim / Light
- Colors: Accent, Surface, Text
- Background: Color or Image + overlay opacity
- **Window → See desktop behind app.** Empty stage shows the desktop. Top bar, tiles, and chat stay solid. Twitch embeds are not transparent.
- Reset restores Dark.

## Chat type
Settings → **Chat**
- Font: System / IBM Plex Sans / Inter / Mono
- Size: 12 / 13 / 14 / 16 (default 13)
- Applies to chat lines and the composer only. An open drawer updates live.

## Click-through + Lock window (click-through)
With See desktop on, empty-stage clicks pass through to the desktop. **Lock window (click-through)** on the top bar freezes that. Unlock to pass through again.

## Performance Mode
Top-bar gauge toggle.
- Focused stream plays at full quality (and is the unmuted audio).
- Other / strip tiles pause at low quality and show a **paused / low** chip.
- Frosted glass blur is eased so the thin bar stays cheap to draw.

## Hotkeys
Settings → **Hotkeys**. Click a keychip to rebind. Conflict warning. Reset defaults. Defaults include Focus mode, Fullscreen, Toggle chat, Lock window, Open Settings, Add stream, Mute focus.

## Updates
Settings → **Updates**. Checks GitHub Releases, including pre-releases. NSIS Setup can install and restart. Portable builds download a new EXE.

## Help
Settings → **Help**. Short in-app panel (add streams, Focus mode, chat dock vs pop-out, multi-monitor + **Dock back** + **Always on top**, **Lock window (click-through)**, Settings, **Login to Twitch**). **Show tips** replays the four first-run tips. Links out to these docs.

## First run
No wizard. Four dismissible tips once: Focus mode, Open chat vs Pop out chat, Lock window (click-through), Dock back.
