import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import path from 'node:path'
import { PUBLIC_TWITCH_CLIENT_ID } from './src/lib/twitchPublicClientId'

function resolveViteTwitchClientId() {
  const fromEnv = (process.env.VITE_TWITCH_CLIENT_ID ?? '').trim()
  return fromEnv || PUBLIC_TWITCH_CLIENT_ID
}

export default defineConfig(({ command }) => {
  const webOnly = process.env.SW_WEB === '1'
  const desktopDev = process.env.SW_DESKTOP === '1'
  // Web-first: `npm run dev` / preview stay browser Vite. Electron is compiled on
  // production build and launched only for `npm run dev:desktop`.
  const useElectron = !webOnly && (command === 'build' || desktopDev)
  // CI / .env override; otherwise bake the public Client ID into production builds
  // and local Vite so first-run Login to Twitch works. Never a Client Secret.
  process.env.VITE_TWITCH_CLIENT_ID = resolveViteTwitchClientId()

  return {
    appType: 'spa',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    plugins: [
      react(),
      useElectron &&
        electron({
          main: {
            entry: 'electron/main.ts',
            vite: {
              build: {
                rollupOptions: {
                  external: ['electron-updater'],
                },
              },
            },
          },
          preload: {
            input: 'electron/preload.ts',
            vite: {
              build: {
                rollupOptions: {
                  output: {
                    format: 'cjs',
                    entryFileNames: 'preload.cjs',
                  },
                },
              },
            },
          },
        }),
    ].filter(Boolean),
    server: {
      port: 5173,
      strictPort: true,
    },
    preview: {
      port: 5173,
      strictPort: true,
    },
  }
})
