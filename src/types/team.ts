export interface Team {
  id: string
  game_id: string
  name: string
  join_code: string
  captain_id: string | null
  score: number
  created_at: string
}

export interface CreateTeamRequest {
  name: string
  game_id: string
}

export interface JoinTeamRequest {
  join_code: string
}

// Validation functions
export const validateTeamName = (name: string): boolean => {
  return name.length >= 2 && name.length <= 30
}

export const validateJoinCode = (code: string): boolean => {
  return /^[A-Z0-9]{6}$/.test(code)
}

// Join code generation
export const generateJoinCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Team statistics
export interface TeamStats {
  team: Team
  rank: number
  total_score: number
  correct_answers: number
  total_answers: number
  accuracy_percentage: number
}

// Leaderboard entry
export interface LeaderboardEntry {
  team: Team
  rank: number
  score: number
  correct_count: number
  total_count: number
  player_count: number
}

// Team management
export const canJoinTeam = (team: Team, gameStatus: string): boolean => {
  return gameStatus === 'setup' || gameStatus === 'active'
}

export const isTeamFull = (team: Team, playerCount: number, maxPlayers?: number): boolean => {
  if (!maxPlayers) return false
  return playerCount >= maxPlayers
}