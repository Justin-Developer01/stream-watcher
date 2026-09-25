# Vesper Desk

Frameless multi-stream Twitch desk for Windows. Electron + React + electron-vite + Radix primitives + Lucide.

## Run

```bash
npm install
npm run dev
```

## Notes

- **Login to Twitch** is in the ☰ menu (Prime session + chat OAuth).
- Put a Twitch Client ID in Settings → Advanced, then **Save**.
- OAuth redirect: `http://localhost:5173/oauth/callback`
- Settings persist only after **Save**.
- There is no Exit button; quit with **Ctrl+Q** or the window Close control.
