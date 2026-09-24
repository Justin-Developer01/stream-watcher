# Vesper Desk

Windows Electron desk for watching several Twitch streams at once. The product name is **Vesper Desk**. It used to be called Stream Watcher. The marketing site is a different repo (`vesper-desk-web`, [www.vesperdesk.app](https://www.vesperdesk.app)) and is not this app.

This repository has no `AGENTS.md`. This file is the instruction set for Claude Code and any other Claude session.

## Design constraints

Lindsey confirmed these. They must stay explicit:

- Soft cyan `#7ec8d8`.
- Transparent mark ~28–32px with glow (no dusk plate).
- Frosted chip hover, not opaque hover plates.
- Light menus use theme surfaces (cream/visible).
- Landing stays Coming soon until a public Setup URL exists.

## Source of truth

- UI truth is draft PR [#2](https://github.com/Justin-Developer01/vesper-desk/pull/2) on branch `cursor/vesper-desk-ui-rebuild` (electron-vite + Radix).
- PR #1 is the older thin-bar tree. Do not copy structure, chrome, or styling from it.
- Interaction truth, until the frosted desk feel is fully restored, is the pre-Radix desk: quiet chrome, frosted chips, light hover, soft cyan on active and selected states.
- Do not mark PR #2 ready or merge it unless Justin explicitly says to.

## Stack

Electron + React 19 + Vite, bundled with **electron-vite** (`electron.vite.config.ts`). Processes:

| Process | Path | Role |
| --- | --- | --- |
| Main | `src/main/index.ts` | Frameless window, pop-outs, click-through, OAuth |
| Pop-out store | `src/main/popoutStore.ts` | Remember pop-out bounds and always-on-top |
| Preload | `src/preload/index.ts` | `contextBridge` → `window.vesper`. ESM preload (`index.mjs`) requires `sandbox: false` |
| Renderer | `src/App.tsx`, `src/renderer.tsx`, `index.html` | Desk UI. Dev server is `http://localhost:5173` (`strictPort`) |

UI primitives are **Radix only** (dialog, dropdown menu, popover, select, slider, switch, tabs, toggle group, tooltip) plus Lucide icons. Hand-written CSS lives in `src/styles/` (`tokens`, `base`, `desk`, `chrome`, `tiles`, `chat`, `overlays`, `light`, `responsive`), imported in that order by `src/index.css`. Order matters: `light.css` wins ties over the component files, and `responsive.css` comes last. Do not install shadcn, Tailwind, or a component kit, and do not restyle the desk into a dense app shell.

Other libraries already in use: `react-grid-layout` (stream grid), `tmi.js` (chat). The player is the Twitch embed script, not a custom player.

```bash
npm install
npm run dev          # electron-vite
npm run typecheck
npm test             # vitest: chat parser
npm run build
npm run dist         # unsigned Windows Setup + Portable; do not run for a docs-only change
```

## Look

Keep the quiet frosted desk.

- Chrome is a ~42px bar (`--chrome`), `backdrop-filter: blur(16px)`, surface mixed with transparency. It can sit on Top, Left, Right, or Bottom.
- The chrome is compact: every button on the bar acts immediately. Left to right: mark + wordmark, Add channel, Standard | Focus | Performance, Change layout ▾ (presets and saved layouts), Open chat, See through windows, Fullscreen, then ☰ and the window controls at the far end. Redock ▾ (Dock all pop-outs plus each Dock back) appears only while something is popped out; Pin toolbar appears only while Ghost overlay or fullscreen can hide the bar. ☰ holds Login to Twitch, Settings, Ghost overlay, Pin toolbar, Lock window (while see-through), and Open log folder. Left/Right chrome shows the same controls as icons.
- Accent is soft cyan `#7ec8d8` (`DEFAULT_SETTINGS.accent` in `src/types.ts`). Active and selected controls use that cyan as a light mix plus an accent edge (`color-mix` into `--btn-bg`, inset ring or border). Menu highlight uses the same light mix.
- Frosted chip hover, not opaque hover plates. Hover is a light border and a slight background lift on the frost.
- The Vesper mark in the chrome (`ChromeBar`, class `chrome-mark`) is a transparent mark ~28–32px with glow (no dusk plate). It is a `currentColor` glyph (30px today): the V/A monogram under a crescent and star, drawn as strokes in `src/assets/vesper-mark.svg`, with a soft cyan `#7ec8d8` glow. No filled plate, amber plate, or dusk plate behind it.
- Wordmark text is `ui.appName` (`Vesper Desk`).

Radix menus, tooltips, dialogs, and the emote popover portal to `document.body`, outside `.desk`. Spread `usePortalThemeProps()` onto that portaled content (`src/components/ui/portalTheme.tsx`) and mark interactive portaled nodes `data-hit`. Tooltips use `outwardSide()` so they open away from the chrome edge.

## Hard product rules

### Quit

There is no Exit button and no "Exit Vesper Desk" footer control. Quit is the window **Close** control (`window.vesper.close`) or the **Quit application** hotkey, default **Ctrl+Q**. Window controls are Minimize, Maximize / Restore, and Close.

### Settings

Settings are a draft until **Save**. Cancel drops the draft. **Reset** stays, and it resets the draft (appearance, or hotkeys) without writing storage. Live preview of the draft theme inside the dialog is correct. Client ID in Advanced persists only after Save.

OAuth redirect: `http://localhost:5173/oauth/callback`. Login to Twitch is in the ☰ menu (Prime session + chat OAuth).

### Labels

User-visible strings come from `src/lib/uiLabels.ts` (`ui`) and hotkey names from `src/lib/hotkeys.ts` (`hotkeyLabels`, `defaultHotkeys`). Use those exact strings. Do not invent synonyms ("Transparent", "Click-through", "Detach chat", "Exit", "Popout" without the space).

A few existing strings are intentionally outside those maps. Leave them unless asked: "Unpin toolbar", "Star save", "Remove", "Cancel", "No saved layouts", "Move chat", "Window locked".

### Ghost overlay and the frameless window

The `BrowserWindow` is always frameless (`frame: false`, transparent, maximized on launch, title `Vesper Desk`). That is the shell, not a user mode.

**Ghost overlay** (`ghostOverlay`, label "Ghost overlay") auto-hides the in-app toolbar after idle, the same path as fullscreen. The CSS class for that hidden bar is `desk--ghost`. Pin toolbar, an open chat drawer, Settings, an open menu, or a forced toolbar (search focus) keeps the bar visible. A 10px `chrome-hotzone` on the chrome edge reveals it again.

### Open chat and Pop out chat

**Open chat** (`openChat` / `hideChat` / `openChannelChat`) pushes the in-app drawer. Dock it with Slide L, Slide R, Dock bottom, or Float.

**Pop out chat** (`popOutChat`) opens a separate window (`openPopout('chat', channel)`). **Pop out stream** does the same for video. Popped streams leave the grid. **Dock back**, the redock menu, **Dock all pop-outs**, or the pop-out window Close returns them. Pop-out bounds and always-on-top are stored on disk.

### Chat behaves like twitch.tv chat

Justin asked for chat to work like Twitch's, emotes and Bits included. Keep it that way:

- `ChatDrawer` owns the chat (`useChat` + `useChatAssets`), not `App`, so messages never re-render the desk or the players. It is mounted once and placed by grid area, so moving the drawer keeps the connection and history.
- One tmi.js connection per login; channel changes join/part on it. Lines are parsed from `raw_message` by `src/lib/chat/parse.ts` (unit-tested, `npm test`). Emote ranges are code-point indices.
- Helix (`src/lib/chat/assets.ts`) supplies badges, global/channel/user emotes, and cheermotes. Login scopes are `chat:read chat:edit user:read:emotes`.
- Shown like Twitch: badges, readable name colors, emotes, animated cheermotes with tier colors, mentions, links, replies, first-time chat, `/me`, sub/raid/announcement notices, deleted messages and timeouts, room modes, and "Chat paused due to scroll". The composer has the emote picker, Tab completion, history, `/me`, and slow mode.

### See through windows

**See through windows** clears the desk background and turns on click-through for empty stage space.

- The chrome stays on top: while click-through is active and unlocked, the main process sets `alwaysOnTop` at level `floating` (`src/main/index.ts`).
- The chrome band and any `[data-hit]` node stay clickable (`src/hooks/useClickThrough.ts`). Ignore-mouse uses `{ forward: true }` so the pointer can move back onto the bar.
- Stream tiles are `[data-hit]`, so they stay interactive. Empty stage (no hit target) passes the click through to the desktop.
- **Lock window** (Ctrl+Shift+L) only applies while see-through is on. It freezes click-through and leaves the window transparent.

### Tiles

In Standard and Performance, the tile title strip (`.stream-tile__bar.stream-drag-handle`) is the react-grid-layout drag handle. Mute, star, Open chat, Pop out chat, Pop out stream, and Remove sit in `.stream-tile__actions` and are `draggableCancel` — they stay clicks. The channel name click focuses that stream.

Focus mode does not add `stream-drag-handle`. Focus keeps one hero at about 72% with a strip for the rest. Switch Focus or a strip click promotes a tile. Performance pauses and lowers quality on tiles that are not focused.

The grid is 12 columns, `compactType="vertical"`, resizable, and its row height comes from the measured stage (`StreamGrid`). Chrome, stage, and drawer are CSS grid areas. Resize must stay fluid: no overlapping tiles, no chrome/drawer overlay bugs, no clipped controls. Keep `overflow: hidden` on the stage and tiles.

### Out of product unless asked

Bits **in chat** are in product: cheermotes render in messages, and typing `Cheer100` sends it like any message. Do not add a Bits purchase flow, a Bits iframe or cheer panel, a channel-points store, or other Twitch Pro surfaces.

## Light mode

Themes are Dark, Dim, and Light (`data-theme` on `.desk`). Light uses cream surfaces and dark text:

- Page `#f3ebe1`, surface `#fff7ec`, controls `#fffdf9`, text `#2a2118`, border `#c9b8a4`, muted `#6d5f50`.
- Selected controls stay readable: dark text, cyan border `#7ec8d8`, fill `#e7f6f8`.
- Primary buttons use cyan fill with dark text. Disabled buttons stay bordered and readable (muted text, cream fill). Danger and Close hover use `#b42318` on a cream button, not a black fill.

Every control, menu row, tooltip, switch, tab, and input must stay visible in Light. Light menus use theme surfaces (cream/visible): cream fill, dark text, and the light border above. That includes portaled Radix menus, tooltips, dialogs, and the emote popover. Those nodes do not inherit `.desk` tokens — spread `usePortalThemeProps()` and keep the `[data-theme='light']` overrides in `src/styles/light.css`. A previous bug painted Light buttons black; do not regress that. When `theme === 'light'`, `themeVars()` also rewrites leftover dark hex values for surface, text, and page background.

## Feature inventory

Preserve these unless Justin asks to remove one:

- Modes: Standard, Focus, Performance.
- Add channel, saved (star) channels, mute / unmute, mute focus, mute all, cycle streams, Switch Focus.
- Layout templates, plus presets 1, 1×2, 2×2, 1+3.
- See through windows, Lock window, Ghost overlay, Pin toolbar, Fullscreen.
- Open chat drawer vs Pop out chat; Pop out stream; Dock back; Dock all pop-outs.
- Chrome edge Top / Left / Right / Bottom. Left and right chrome hides the wordmark and stacks controls.
- Settings tabs: Appearance, Chat, Hotkeys, Updates, Advanced, Help. Fonts, size, drawer width, chat preview.
- Login to Twitch, Refresh Prime session, Reconnect chat, Developer Client ID.
- First-run tips (Focus, Open chat vs Pop out chat, See through windows, Dock back).
- Hotkeys in `defaultHotkeys` (Ctrl+Q quit, Ctrl+, Settings, Ctrl+K search, Ctrl+Shift+C chat, Ctrl+Shift+L lock, Ctrl+\\ toolbar, F11 fullscreen, and the rest of that map).

App data (Chromium storage, pop-out bounds, and the error log `logs/main.log`) lives in `%APPDATA%\vesper-desk\` on Windows: Electron uses the package `name`, since `productName` is only in the electron-builder config. Do not add a top-level `productName` without migrating that folder, or existing installs lose their settings. Settings → Advanced / Help and ☰ have Open log folder.

Desk state persists to `localStorage` key `vesper-desk:v1` (auth: `vesper-desk:auth:v1`). `stream-watcher:v1` and `stream-watcher:auth:v1` are read-only legacy fallbacks. New writes use the Vesper keys. Logout clears Twitch cookies, not the desk layout.

## Branding

Do not revert visible branding to Stream Watcher. That includes the window title, chrome wordmark, `ui.appName`, `productName`, installer shortcut and uninstall names, and artifact names. Legacy storage keys may keep the old name so existing installs still load.

## Releases

Windows artifacts are unsigned (`forceCodeSigning: false`, `signExecutable: false`, `CSC_IDENTITY_AUTO_DISCOVERY=false`). Do not use `signAndEditExecutable: false`: it also skips writing the icon into `Vesper Desk.exe`, so the EXE and shortcuts fall back to the Electron icon. `signExecutable: false` still writes the icon and version info, just without signing:

- `Vesper-Desk-Setup-<version>.exe` (one-click NSIS)
- `Vesper-Desk-Portable-<version>.exe`

SmartScreen warnings are expected (More info → Run anyway). Current package version is the `v1.0.1-pre.N` line (`package.json`). The next cut continues that prerelease sequence. `.github/workflows/build-windows.yml` uploads artifacts on pushes to `main` and `cursor/**`, and publishes a GitHub Release only on `v*` tags (prerelease when the tag contains `pre` or `rc`).

A docs-only change does not need a version bump, tag, or new EXE. The repo may be private: anonymous downloads 404 until it is public. A 404 is not proof the build failed.

## Working style

- Prefer small diffs. Match the surrounding code. Do not drive-by rename or redesign.
- Before deleting a control, check the feature inventory and `uiLabels.ts`.
- After chrome, theme, layout, or hit-testing edits, smoke these: Light and Dark, See through (bar stays on top and clickable; empty stage passes clicks; tiles still work), Focus (no tile drag), chat drawer versus pop-out, Ghost overlay and Pin toolbar.
- `npm run typecheck` after TypeScript edits, and `npm test` after chat parser edits.
- Do not undraft or merge pull requests, or publish the GitHub repo, unless Justin explicitly asks. Landing stays Coming soon until a public Setup URL exists.

## Out of scope unless asked

- Landing site (`vesper-desk-web` / www.vesperdesk.app). Landing stays Coming soon until a public Setup URL exists. Do not wire a download, replace Coming soon, or point the site at a private or 404 asset before that URL is public.
- Making this GitHub repo public.
- Merging or undrafting PR #2 or any other draft.
