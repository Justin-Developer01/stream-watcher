import { useEffect, useMemo, useRef } from 'react'
import { getEmbedParent } from '../lib/twitch'

type Props = {
  channel: string
  muted: boolean
  interactive: boolean
  paused?: boolean
  lowQuality?: boolean
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

export function TwitchPlayer({ channel, muted, interactive, paused, lowQuality }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<InstanceType<NonNullable<typeof window.Twitch>['Player']> | null>(null)
  const parent = useMemo(() => getEmbedParent(), [])

  useEffect(() => {
    let disposed = false
    void loadTwitchScript().then(() => {
      if (disposed || !containerRef.current || !window.Twitch?.Player) return
      containerRef.current.innerHTML = ''
      const mount = document.createElement('div')
      mount.style.width = '100%'
      mount.style.height = '100%'
      containerRef.current.appendChild(mount)
      playerRef.current = new window.Twitch.Player(mount, {
        channel,
        width: '100%',
        height: '100%',
        parent: [parent, 'localhost', '127.0.0.1'],
        muted,
        autoplay: !paused,
      })
    })
    return () => {
      disposed = true
      playerRef.current = null
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [channel, parent])

  useEffect(() => {
    playerRef.current?.setMuted(muted)
  }, [muted])

  useEffect(() => {
    if (!playerRef.current) return
    if (paused) playerRef.current.pause()
    else playerRef.current.play()
  }, [paused])

  useEffect(() => {
    playerRef.current?.setQuality?.(lowQuality ? '160p' : 'chunked')
  }, [lowQuality])

  return <div className={`twitch-player${interactive ? '' : ' is-blocked'}`} ref={containerRef} />
}
