import { useEffect, useRef } from 'react'
import { log } from '../lib/log'

type Props = {
  channel: string
  muted: boolean
  interactive: boolean
  paused?: boolean
  lowQuality?: boolean
}

let youtubeApiPromise: Promise<void> | null = null

/**
 * Unlike TwitchPlayer's script, the IFrame API script's own load event isn't the ready signal —
 * Google's docs say to wait for the global onYouTubeIframeAPIReady callback it calls once
 * window.YT.Player actually exists, so that's what this resolves on.
 */
function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve()
  if (youtubeApiPromise) return youtubeApiPromise
  youtubeApiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve()
    }
    if (document.querySelector<HTMLScriptElement>('script[data-youtube-embed]')) return
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.dataset.youtubeEmbed = 'true'
    script.onerror = () => {
      // Forget the failure so the next tile (or a reconnect) tries the script again.
      youtubeApiPromise = null
      script.remove()
      reject(new Error('YouTube embed failed to load'))
    }
    document.body.appendChild(script)
  })
  return youtubeApiPromise
}

export function YouTubePlayer({ channel, muted, interactive, paused, lowQuality }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<InstanceType<NonNullable<typeof window.YT>['Player']> | null>(null)
  const live = useRef({ muted, paused, lowQuality })
  live.current = { muted, paused, lowQuality }
  // YT.Player has no mute/play methods until onReady; calls before that throw.
  const ready = useRef(false)

  useEffect(() => {
    let disposed = false
    ready.current = false
    loadYouTubeApi().then(() => {
      const YT = window.YT
      if (disposed || !containerRef.current || !YT) return
      containerRef.current.innerHTML = ''
      const mount = document.createElement('div')
      mount.style.width = '100%'
      mount.style.height = '100%'
      containerRef.current.appendChild(mount)
      playerRef.current = new YT.Player(mount, {
        videoId: channel,
        width: '100%',
        height: '100%',
        playerVars: {
          enablejsapi: 1,
          autoplay: live.current.paused ? 0 : 1,
          mute: live.current.muted ? 1 : 0,
          playsinline: 1,
          controls: 1,
        },
        events: {
          onReady: () => {
            const player = playerRef.current
            if (disposed || !player) return
            ready.current = true
            // Props may have changed while the player loaded.
            if (live.current.muted) player.mute()
            else player.unMute()
            if (live.current.paused) player.pauseVideo()
            else player.playVideo()
          },
        },
      })
    }, (err: unknown) => {
      if (!disposed) log.warn(`youtube:${channel} player not started:`, err)
    })
    return () => {
      disposed = true
      ready.current = false
      playerRef.current?.destroy?.()
      playerRef.current = null
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
    // A new player only for a new video; mute, pause, and quality are applied by the effects below.
  }, [channel])

  useEffect(() => {
    const player = playerRef.current
    if (!player || !ready.current) return
    if (muted) player.mute()
    else player.unMute()
  }, [muted])

  useEffect(() => {
    const player = playerRef.current
    if (!player || !ready.current) return
    if (paused) player.pauseVideo()
    else player.playVideo()
  }, [paused])

  useEffect(() => {
    if (ready.current) playerRef.current?.setPlaybackQuality?.(lowQuality ? 'small' : 'default')
  }, [lowQuality])

  return <div className={`youtube-player${interactive ? '' : ' is-blocked'}`} ref={containerRef} />
}
