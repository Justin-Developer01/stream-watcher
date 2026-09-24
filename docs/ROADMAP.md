# Vesper Desk roadmap: development, web app, monetization

**Where the app is today (PR #3):**
- **Stack:** Electron 34 + React 19 + electron-vite, Radix UI with hand-written CSS, tmi.js chat, Helix for emotes, badges and cheermotes, and the Twitch embed player.
- **Built:** Windows Setup and Portable EXEs, unsigned.
- **Checks in CI:** typecheck and unit tests (vitest). The Playwright/Xvfb harnesses in `docs/parity/` run by hand.
- **Not built yet:** backend, accounts, payments, auto-update.

Each item below says why it's needed, what it would add, and a rough size: **S** is under a day, **M** is 1 to 3 days, **L** is a week or more.

## 1. Ship quality (do before any paid release)

| Item | Why | Adds | Size |
| --- | --- | --- | --- |
| Auto-update | pre.17 had it; the rebuild dropped it. The Updates tab only opens GitHub Releases, so testers stay on old builds. | `electron-updater` (GitHub provider; `latest.yml` is already produced by CI), plus Check / Download / Restart in Settings → Updates | M |
| Code signing | Unsigned EXEs trigger SmartScreen, which kills conversion for a paid app. | Azure Trusted Signing (about $10/month) or an OV/EV certificate, wired through `win.signtoolOptions` in CI. Then turn signing back on (`signExecutable` true) | M |
| Crash and error reporting | `main.log` now captures errors on the user's machine, but you can't see them. | Opt-in `@sentry/electron` (main + renderer, source maps uploaded in CI), sharing the token redaction from `src/main/logging.ts`. Also a "Copy diagnostics" button next to Open log folder | M |
| Lint and format | There are no lint rules today. | `eslint` + `typescript-eslint` + `eslint-plugin-react-hooks`, `prettier`, and a CI step | S |
| End-to-end tests in CI | The smoke (34 checks), chat (22) and player (4) harnesses in `docs/parity/` run by hand. | Move them to `e2e/`, add `@playwright/test`, and run them on `ubuntu-latest` with Xvfb on every PR | M |
| Dependency updates | Electron needs regular security updates. | Dependabot or Renovate (weekly, with grouped Electron bumps) | S |
| Release notes | Testers need to know what changed. | Keep a `CHANGELOG.md` and generate release notes from PR titles (already on in `softprops/action-gh-release`) | S |

## 2. Security (before accounts or payments)

| Item | Why | Adds | Size |
| --- | --- | --- | --- |
| Encrypt the Twitch token | The OAuth token sits in renderer `localStorage` (`vesper-desk:auth:v1`) in plain text. | Electron `safeStorage` in main, with the renderer asking for the token over IPC | M |
| Settings in main | `localStorage` is per-origin and fragile. Accounts will need one source of truth. | `electron-store` (JSON schema + migrations) for desk state; keep reading `vesper-desk:v1` once to migrate | M |
| IPC hardening | IPC handlers trust any sender. | Check `event.senderFrame` origin (file:// or the dev server) on every `ipcMain.handle`; validate payloads | S |
| CSP | `index.html` allows `'unsafe-inline'` scripts, and main strips CSP headers from every response. | Remove the inline-script need, and strip CSP only for Twitch embed hosts | S–M |
| Security review | Once before launch. | Electron security checklist (sandbox the pop-outs, `webSecurity`, navigation guards on all windows) | S |

## 3. Path to the web app (vesperdesk.app)

About 70% of the renderer can be shared. What's desktop-only: click-through and see-through, frameless window controls, OS pop-out windows, and main-process OAuth.

- **Monorepo** with npm workspaces or pnpm (M–L):
  - `packages/core`: chat parser (`src/lib/chat/*`), Helix assets, quality picker, desk state (`useDesk`), types, labels
  - `packages/ui`: the React components
  - `apps/desktop`: Electron
  - `apps/web`: a Vite SPA
- **A platform layer** replacing direct `window.vesper` calls (M). One `Platform` interface with a desktop implementation (IPC) and a web implementation:
  - pop-outs via `window.open`
  - fullscreen via the Fullscreen API
  - see-through hidden
- **Web-specific work:**
  - The Twitch embed `parent` must be the site's domain.
  - OAuth: Authorization Code + PKCE, redirecting to `https://vesperdesk.app/oauth/callback`. Register that URL in the Twitch console.
  - A PWA manifest.
  - Responsive layout for smaller screens.
- **State libraries** (optional, M):
  - `zustand` for desk state shared across windows and tabs
  - `@tanstack/react-query` for Helix caching, replacing the hand cache in `lib/chat/assets.ts`
- **Hosting:** Vercel, Netlify or Cloudflare Pages next to the landing site. **The landing page stays "Coming soon" until a public Setup URL exists** (CLAUDE.md).

## 4. Accounts and monetization

**Recommended stack:**
- **Accounts:** Supabase (Postgres, auth, edge functions), keyed by the Twitch user ID from login. Users sign in with Twitch; no separate password.
- **Payments:** a merchant of record, either **Lemon Squeezy** or **Paddle**. They collect and remit sales tax and VAT worldwide and issue license keys, which is simplest for a solo developer. Stripe (Checkout + Customer Portal + Stripe Tax) is the alternative if you want to handle tax registration yourself.
- **Entitlements:**
  - An `entitlements` table (free / pro / lifetime) checked by the app at startup and cached offline with a grace period.
  - Desktop: license key or account check. Web: session.
  - Feature flags for rollouts: PostHog or GrowthBook.
- **Analytics:** opt-in only (PostHog), with a privacy policy, terms of service and a data-deletion path. GDPR and CCPA apply to paid users.

**Candidate Pro features.** Sell the app, not Twitch's content:
- Cloud-synced layouts and settings across machines and the web
- More simultaneous streams (for example, free 4, Pro 9 or more)
- Multi-monitor presets and saved window arrangements
- Extra themes and custom accents
- Priority chat features: 7TV/BTTV/FFZ emotes, highlights, keyword alerts
- A followed-channels-live sidebar with notifications

**Twitch Developer Agreement: check before charging.**
- Pro features must be app features. Don't charge for access to streams.
- Never hide, block or overlay Twitch's ads or player controls.
- Keep embeds at or above Twitch's minimum embed size. Performance mode's small strip tiles need checking.
- Use the official embed and Helix APIs only.
- Display Twitch branding and trademarks as the brand guidelines require.
- Have someone read the current agreement and brand guidelines before launch; this list is a starting point, not legal advice.

## 5. Feature backlog

| Feature | Adds | Size |
| --- | --- | --- |
| Followed channels live (sidebar or menu) | Helix `/streams/followed` + `user:read:follows` scope; later EventSub WebSocket for live notifications | M |
| Third-party emotes (7TV, BTTV, FFZ) | Fetch per-channel sets; the parser already supports name-based emotes (`emoteNames`) | M |
| User cards and chat history | Click a name for the card, recent messages, and follow age (Helix) | M |
| Moderator tools | Twitch retired IRC commands, so these need Helix moderation endpoints plus the `moderator:manage:*` scopes | M |
| Audio mixer | Per-tile volume sliders (Radix Slider is already a dependency) and a "solo" button | S |
| Multi-monitor layouts | Saved window arrangements across displays (`popoutStore` already remembers bounds) | M |
| Localization | Move `uiLabels.ts` to an i18n catalog (`i18next` or `@lingui/core`) | M |
| Accessibility pass | Keyboard navigation across tiles, screen-reader labels (started with the chrome `aria-label`s) | S–M |

## Suggested order

1. **Now (pre-release):** auto-update, e2e tests in CI, lint, encrypted token, IPC checks.
2. **Before charging:** code signing, Sentry opt-in, the platform layer, Supabase accounts, a merchant of record, entitlements, the privacy policy and terms of service, and the Twitch agreement review.
3. **After launch:** the web app (monorepo split), followed-live list, third-party emotes, and Pro features behind flags.
