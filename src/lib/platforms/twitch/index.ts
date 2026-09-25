import { TwitchPlayer } from '../../../components/TwitchPlayer'
import { normalizeChannel } from '../../storage'
import type { StreamPlatform } from '../types'

export const twitchPlatform: StreamPlatform = {
  id: 'twitch',
  label: 'Twitch',
  Player: TwitchPlayer,
  hasChat: true,
  matchChannelInput: normalizeChannel,
}
