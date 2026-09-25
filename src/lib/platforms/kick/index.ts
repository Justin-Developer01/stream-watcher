import { KickPlayer } from '../../../components/KickPlayer'
import type { StreamPlatform } from '../types'
import { matchKickInput } from './match'

export const kickPlatform: StreamPlatform = {
  id: 'kick',
  label: 'Kick',
  Player: KickPlayer,
  hasChat: false,
  matchChannelInput: matchKickInput,
}
