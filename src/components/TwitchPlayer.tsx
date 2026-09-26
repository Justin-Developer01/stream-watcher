import { useEffect, useMemo, useRef } from 'react'
import { log } from '../lib/log'
import { pickQuality } from '../lib/quality'
import { isWindowHidden, onWindowVisibility } from '../lib/windowVisibility'
import { getEmbedParent } from '../lib/twitch'

type Props = {
  channel: string
  muted: boolean
  volume?: number
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
    script.onerror = () => {
      // Forget the failure so the next tile (or a reconnect) tries the script again.
      twitchScriptPromise = null
      script.remove()
      reject(new Error('Twitch embed failed to load'))
    }
    document.body.appendChild(script)
  })
  return twitchScriptPromise
}

const RESIZE_SETTLE_MS = 800

export function TwitchPlayer({ channel, muted, volume = 1, interactive, paused, lowQuality }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<InstanceType<NonNullable<typeof window.Twitch>['Player']> | null>(null)
  const parent = useMemo(() => getEmbedParent(), [])
  const live = useRef({ muted, volume, paused, lowQuality })
  live.current = { muted, volume, paused, lowQuality }
  const appliedQuality = useRef<string | null>(null)
  const hiddenPause = useRef(false)

  // Request the smallest quality that covers the tile (Performance: the lowest), instead of
  // letting every tile decode source quality. Re-checked when the tile settles after a resize.
  const applyQuality = () => {
    const player = playerRef.current
    const el = containerRef.current
    if (!player?.setQuality || !player.getQualities || !el) return
    const needed = el.clientHeight * (window.devicePixelRatio || 1)
    const next = pickQuality(player.getQualities(), needed, Boolean(live.current.lowQuality))
    if (!next || next === appliedQuality.current) return
    appliedQuality.current = next
    player.setQuality(next)
  }

  useEffect(() => {
    let disposed = false
    appliedQuality.current = null
    loadTwitchScript().then(() => {
      const Player = window.Twitch?.Player
      if (disposed || !containerRef.current || !Player) return
      containerRef.current.innerHTML = ''
      const mount = document.createElement('div')
      mount.style.width = '100%'
      mount.style.height = '100%'
      containerRef.current.appendChild(mount)
      const player = new Player(mount, {
        channel,
        width: '100%',
        height: '100%',
        parent: [parent, 'localhost', '127.0.0.1'],
        muted: live.current.muted,
        autoplay: !live.current.paused,
      })
      playerRef.current = player
      // Twitch remembers one volume for every embed, so each tile sets its own level once ready.
      if (Player.READY) player.addEventListener?.(Player.READY, () => player.setVolume?.(live.current.volume))
      // Qualities are only known once the stream plays.
      if (Player.PLAYING) player.addEventListener?.(Player.PLAYING, applyQuality)
    }, (err: unknown) => {
      if (!disposed) log.warn(`#${channel} player not started:`, err)
    })
    return () => {
      disposed = true
      playerRef.current = null
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
    // A new player only for a new channel; mute, volume, pause, and quality are applied by the effects below.
  }, [channel, parent])

  useEffect(() => {
    playerRef.current?.setMuted(muted)
  }, [muted])

  useEffect(() => {
    playerRef.current?.setVolume?.(volume)
  }, [volume])

  useEffect(() => {
    if (!playerRef.current) return
    if (paused) playerRef.current.pause()
    else playerRef.current.play()
  }, [paused])

  useEffect(() => {
    applyQuality()
  }, [lowQuality])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let timer = 0
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer)
      timer = window.setTimeout(applyQuality, RESIZE_SETTLE_MS)
    })
    observer.observe(el)
    return () => {
      window.clearTimeout(timer)
      observer.disconnect()
    }
  }, [])

  // While the desk is minimized or hidden, muted tiles stop decoding; audible ones keep playing.
  useEffect(() => {
    const onVisibility = () => {
      const player = playerRef.current
      if (!player) return
      if (isWindowHidden()) {
        if (live.current.muted && !live.current.paused) {
          hiddenPause.current = true
          player.pause()
        }
      } else if (hiddenPause.current) {
        hiddenPause.current = false
        if (!live.current.paused) player.play()
      }
    }
    return onWindowVisibility(onVisibility)
  }, [])

  return <div className={`twitch-player${interactive ? '' : ' is-blocked'}`} ref={containerRef} />
}
