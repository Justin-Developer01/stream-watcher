import { useEffect, useMemo, useRef } from 'react'
import { getEmbedParent } from '../lib/twitch'

type Props = {
  channel: string
  muted: boolean
  interactive: boolean
  paused?: boolean
}

type TwitchPlayerInstance = {
  setChannel: (channel: string) => void
  setMuted: (muted: boolean) => void
  play: () => void
  pause: () => void
  setQuality?: (quality: string) => void
  destroy?: () => void
}

declare global {
  interface Window {
    Twitch?: {
      Player: new (
        element: HTMLElement | string,
        options: {
          channel: string
          width: string | number
          height: string | number
          parent: string[]
          muted?: boolean
          autoplay?: boolean
          quality?: string
        },
      ) => TwitchPlayerInstance
    }
  }
}

let twitchScriptPromise: Promise<void> | null = null

function loadTwitchScript() {
  if (window.Twitch?.Player) return Promise.resolve()
  if (twitchScriptPromise) return twitchScriptPromise

  twitchScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-twitch-embed]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Twitch embed failed to load')))
      return
    }

    const script = document.createElement('script')
    script.src = 'https://embed.twitch.tv/embed/v1.js'
    script.async = true
    script.dataset.twitchEmbed = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Twitch embed failed to load'))
    document.body.appendChild(script)
  })

  return twitchScriptPromise
}

function applyPlayback(player: TwitchPlayerInstance, paused: boolean) {
  try {
    if (paused) {
      player.setQuality?.('160p')
      player.pause()
      return
    }
    player.setQuality?.('auto')
    player.play()
  } catch {
    // Embed methods are best-effort; missing quality APIs are fine.
  }
}

export function TwitchPlayer({ channel, muted, interactive, paused = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<TwitchPlayerInstance | null>(null)
  const parent = useMemo(() => getEmbedParent(), [])

  useEffect(() => {
    let disposed = false

    void loadTwitchScript().then(() => {
      if (disposed || !containerRef.current || !window.Twitch?.Player) return

      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild)
      }

      const player = new window.Twitch.Player(containerRef.current, {
        channel,
        width: '100%',
        height: '100%',
        parent: [parent, 'localhost', '127.0.0.1'],
        muted,
        autoplay: !paused,
        quality: paused ? '160p' : 'auto',
      })

      playerRef.current = player
      applyPlayback(player, paused)
    })

    return () => {
      disposed = true
      const player = playerRef.current
      playerRef.current = null
      try {
        player?.pause()
        player?.destroy?.()
      } catch {
        // Twitch may have already torn the iframe down.
      }
    }
  }, [channel, parent])

  useEffect(() => {
    playerRef.current?.setMuted(muted)
  }, [muted])

  useEffect(() => {
    if (playerRef.current) applyPlayback(playerRef.current, paused)
  }, [paused])

  return (
    <div
      className={`twitch-player${interactive ? '' : ' is-blocked'}${paused ? ' is-paused' : ''}`}
      ref={containerRef}
    />
  )
}
