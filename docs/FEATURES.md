# Stream Watcher features

Desktop multi-stream Twitch viewer. The Windows EXE is the primary path.

## Watching
- Add channels from the top-bar title. Layouts: 1, 1×2, 2×2, 1+3. The grid always fills the window (no page scroll).
- Drag the handle and resize tiles. Disabled in Focus Mode.
- **Focus Mode** — hero ~72% / bottom strip ~28%. Click a strip tile to promote it.

## Chat
- **Open chat** slides a drawer that **pushes** the grid (left / right / bottom), or float.
- Pop out chat to another monitor (desktop). Position and size are remembered.
- Send messages after **Login to Twitch**.

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

## Click-through + Lock
With See desktop on, empty-stage clicks pass through to the desktop. **Lock window** on the top bar freezes that. Unlock to pass through again.

## Performance Mode
Top-bar gauge toggle.
- Focused stream plays at full quality (and is the unmuted audio).
- Other / strip tiles pause at low quality and show a **paused / low** chip.
- Frosted glass blur is eased so the thin bar stays cheap to draw.

## Hotkeys
Settings → **Hotkeys**. Click a keychip to rebind. Conflict warning. Reset defaults. Defaults include Focus Mode, Fullscreen, Toggle chat, Lock window, Open Settings, Add stream, Mute focus.

## Updates
Settings → **Updates**. Checks GitHub Releases, including pre-releases. NSIS Setup can install and restart. Portable builds download a new EXE.

## First run
No wizard. Optional one-time toast pointing at Login to Twitch.
