/** A Twitch embed quality as returned by player.getQualities(). */
export type TwitchQuality = { group: string; name?: string }

export function qualityHeight(group: string) {
  const match = /^(\d{3,4})p/.exec(group)
  return match ? Number(match[1]) : null
}

/**
 * The quality a tile should request.
 * - `lowest`: Performance mode tiles that are not focused.
 * - Otherwise the smallest quality whose height covers the tile's device-pixel height, so a
 *   small tile does not decode 1080p. Tiles taller than 720 device pixels go back to `auto`.
 * Returns null when the player has not reported its qualities yet.
 */
export function pickQuality(qualities: TwitchQuality[], neededHeight: number, lowest = false): string | null {
  const byHeight = qualities
    .map((q) => ({ group: q.group, h: qualityHeight(q.group) }))
    .filter((q): q is { group: string; h: number } => q.h !== null)
    .sort((a, b) => a.h - b.h)
  if (!byHeight.length) return null
  if (lowest) return byHeight[0].group
  const auto = qualities.find((q) => q.group === 'auto')?.group ?? 'chunked'
  if (neededHeight > 720) return auto
  return byHeight.find((q) => q.h >= neededHeight)?.group ?? auto
}
