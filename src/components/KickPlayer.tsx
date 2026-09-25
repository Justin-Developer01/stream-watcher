import { useMemo } from 'react'

type Props = {
  channel: string
  muted: boolean
  interactive: boolean
  paused?: boolean
  lowQuality?: boolean
}

/**
 * Kick's public embed (player.kick.com) only exposes autoplay/muted as load-time query
 * params — confirmed against Kick's embed docs, there's no postMessage API to change them
 * afterward, and no quality parameter at all. So unlike TwitchPlayer's in-place
 * setMuted/setQuality, toggling `muted` here remounts the iframe with a fresh src (a brief
 * rebuffer), `paused` unmounts it entirely rather than pausing in place, and `lowQuality`
 * has no Kick equivalent to apply.
 */
export function KickPlayer({ channel, muted, interactive, paused }: Props) {
  const src = useMemo(() => {
    const params = new URLSearchParams({ autoplay: 'true', muted: String(muted) })
    return `https://player.kick.com/${encodeURIComponent(channel)}?${params}`
  }, [channel, muted])

  return (
    <div className={`kick-player${interactive ? '' : ' is-blocked'}`}>
      {!paused && (
        <iframe
          key={src}
          src={src}
          title={`${channel} on Kick`}
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      )}
    </div>
  )
}
