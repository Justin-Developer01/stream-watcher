import { getPlatform } from '../lib/platforms/registry'
import type { StreamPlayerProps } from '../lib/platforms/types'
import type { PlatformId } from '../types'

type Props = StreamPlayerProps & { platform: PlatformId }

export function StreamPlayer({ platform, ...props }: Props) {
  const Player = getPlatform(platform).Player
  return <Player {...props} />
}
