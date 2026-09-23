# Stream Watcher features

[Home](index.md) · [How to use](USAGE.md)

Desktop multi-stream Twitch viewer. The Windows EXE is the primary path.

## Watching
- Add channels from the top-bar title. Layouts: 1, 1×2, 2×2, 1+3. The grid always fills the window (no page scroll).
- Drag the handle and resize tiles. Disabled in Focus mode.
- Save channels from a tile star for later.
- **Mode** on the bar: **Standard** / **Focus** / **Performance**, mutually exclusive — picking one turns the other off.
  - **Focus** — hero ~72% / bottom strip ~28%. Click a strip tile to promote it.
  - **Performance** — see [Performance](#performance) below.
- Fullscreen from the **More …** menu (F11 by default). **Ghost overlay** (also in **More …**) can pin the bar or let it auto-hide in fullscreen.
- Pop a stream out and its tile leaves the grid entirely — no placeholder, no reserved gap. A **redock** menu with a count badge appears on the bar instead; see [Multi-monitor](#multi-monitor-desktop-pop-out-windows).

## Window
- The main window is **frameless and launches maximized** — no Windows title bar. It draws its own **Minimize / Maximize-Restore / Close** icons at the far end of the bar, and is still resizable from any edge once restored.
- **Exit Stream Watcher** — a danger-styled button in the Settings modal's footer, also bound to **Ctrl+Q**. Quits the app and every pop-out. The window's **Close** icon does the same. Esc only ever closes a modal/drawer, never the app.
- **Edge-snap**: Settings → Appearance → **Chrome** — **Top** (default), **Left**, **Right**, **Bottom**. Left/Right collapse the title to an icon; Top/Bottom keep the text. Popovers always open toward free space; fullscreen auto-hide reveals the bar from whichever edge it's snapped to.

## Chat (in-app drawer)
- **Open chat** / **Open #channel chat** slides a drawer that **pushes** the grid (Slide right / Slide left / Dock bottom) or **Float**. This stays in the main window. **Open chat** lives in the **More …** menu; **Open #channel chat** stays on each tile.
- **Hide chat** / **Close chat** puts the drawer away. Streams stay on the desk.
- Send messages after **Login to Twitch**.
- Twitch emotes render inline in received messages. After logging in, a small emote picker (global emote set) sits next to Send — click one to insert its name into the composer. If the emote list can't load, the picker button simply doesn't appear. No Bits, no cheermotes.
- Each line shows a subtle hover-reveal timestamp.

## Multi-monitor (desktop pop-out windows)
Pop-outs are separate windows. Browser builds show the icons but say **Desktop app only**.

**Quick start:** park on another monitor → **See through windows** when you need the UI (or the Lock window hotkey, `L`, to freeze click-through) → **Dock back** to the main desk.

- **Chat window:** **Pop out chat** (tile, drawer, or **More …** menu).
- **Stream window:** **Pop out stream** (tile monitor icon). The tile is removed from the grid entirely — a **redock** menu (count badge) appears on the bar with one row per popped channel.
- **Dock back** on the pop-out, on the redock menu's row, or **Dock all pop-outs** on the bar for everything at once. Window **X** also docks; chat drawer does not auto-open.
- **Always on top** (pin) is per pop-out only. Tooltip: **Always on top** / **Disable always on top**. The main desk stays unpinned and thin.
- Last **monitor, position, size, and always-on-top** are remembered per channel (`popout-windows.json` in app user data). Chat and stream for the same channel are stored separately.
- First pop-out with nothing saved prefers a second monitor. If that display is unplugged, the window clamps onto a remaining screen. The main desk opens on the **primary** display and snaps back if that screen goes away.

## Login
- One control: **Login to Twitch** (tooltip **Login for Prime + chat.**), in the hamburger **☰** menu.
- Settings → Advanced: Reconnect chat, Refresh Prime session, Developer Client ID.

## Layout menus
There are two different-looking "Change layout" controls — worth knowing apart:
- **Change layout** on the visible bar opens your **named, saved layout templates** and applies one (channels, focus, chat placement). Nothing to save/delete here.
- **☰ → Layout templates** is where you save the current setup as a new named template, or delete an old one.
- **☰ → Change layout** is the older quick preset grid — 1×1 / 1×2 / 2×2 / 1+3 — unrelated to named templates, just a fast rearrange.

## Appearance
Settings modal → **Appearance**
- Presets: Dark / Dim / Light
- Colors: Accent, Surface, Text
- Background: Color or Image + overlay opacity
- **Chrome**: Top / Left / Right / Bottom — see [Window](#window).
- **Window → See desktop behind app.** Empty stage shows the desktop. Top bar, tiles, and chat stay solid. Twitch embeds are not transparent.
- Reset restores Dark.

## Chat type
Settings → **Chat**
- Font: System, IBM Plex Sans, Inter, Mono, Source Sans 3, Roboto, Geist, or **Custom…** (type any installed font-family name; falls back to your system font automatically if it's not installed, with a quiet hint)
- Size: 12 / 13 / 14 / 16 (default 13)
- **Drawer width**: 280–480px slider
- Applies to chat lines and the composer only. An open drawer updates live.

## See through windows
One toggle on the bar does both: turns on **See desktop behind app** and unlocks click-through, in a single click. Turning it off restores both. To freeze click-through while staying see-through (e.g. to click near a gap), use the **Lock window** hotkey (`L` by default) — there's no separate icon for that anymore. Settings → Appearance keeps its own independent **See desktop behind app** checkbox if you only want that half.

## Performance
**Mode → Performance** on the bar.
- Focused stream plays at full quality (and is the unmuted audio).
- Other / strip tiles pause at low quality and show a **paused / low** chip.
- Frosted glass blur is eased so the thin bar stays cheap to draw.

## Hotkeys
Settings → **Hotkeys**. Click a keychip to rebind. Conflict warning. Reset defaults. Defaults include Focus search/add stream, Fullscreen, Toggle chat, Lock window, Open Settings, Mute focus stream, Cycle streams, Mute all, and **Exit Stream Watcher (Ctrl+Q)**.

## Updates
Settings → **Updates**. Checks GitHub Releases, including pre-releases. NSIS Setup can install and restart. Portable builds download a new EXE.

## Help
Settings → **Help**. Short in-app panel (add streams, Mode, chat dock vs pop-out, multi-monitor + **Dock back** + **Always on top**, **See through windows**, Settings, **Login to Twitch**). **Show tips** replays the four first-run tips. Links out to these docs.

## First run
No wizard. Four dismissible tips once: Focus mode, Open chat vs Pop out chat, See through windows, Dock back.
