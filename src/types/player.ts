export interface Player {
  id: string
  user_id: string | null
  game_id: string
  team_id: string | null
  display_name: string
  is_online: boolean
  joined_at: string
  last_seen: string
}

export interface CreatePlayerRequest {
  game_id: string
  display_name: string
  team_join_code?: string
}

export interface UpdatePlayerRequest {
  team_id?: string | null
  is_online?: boolean
  last_seen?: string
}

// Validation functions
export const validateDisplayName = (name: string): boolean => {
  return name.length >= 2 && name.length <= 20
}

export const isValidPlayerName = (name: string): boolean => {
  // Check for inappropriate content (basic filter)
  const blocked = ['admin', 'host', 'system', 'bot']
  const lowerName = name.toLowerCase()
  return !blocked.some(word => lowerName.includes(word))
}

// Player status
export type PlayerStatus = 'online' | 'offline' | 'away'

export const getPlayerStatus = (player: Player): PlayerStatus => {
  if (!player.is_online) return 'offline'

  const lastSeen = new Date(player.last_seen)
  const now = new Date()
  const minutesAgo = (now.getTime() - lastSeen.getTime()) / (1000 * 60)

  if (minutesAgo > 5) return 'away'
  return 'online'
}

// Player presence tracking
export interface PlayerPresence {
  player_id: string
  display_name: string
  team_id: string | null
  team_name: string | null
  online_at: string
}

// Player statistics
export interface PlayerStats {
  player: Player
  answers_submitted: number
  correct_answers: number
  points_earned: number
  average_response_time: number
}

// Team membership
export const canJoinGame = (gameStatus: string, allowLateJoins: boolean): boolean => {
  if (gameStatus === 'setup') return true
  if (gameStatus === 'active' && allowLateJoins) return true
  return false
}

export const canSwitchTeams = (gameStatus: string): boolean => {
  return gameStatus === 'setup'
}

export const hasTeam = (player: Player): boolean => {
  return player.team_id !== null
}