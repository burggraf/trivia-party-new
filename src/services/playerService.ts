import { supabase } from '../lib/supabase'
import type { Player, CreatePlayerRequest, PlayerWithPresence } from '../types/player'
import type { ApiResponse } from '../types'

export class PlayerService {
  // Join a team (create player)
  static async joinTeam(request: CreatePlayerRequest): Promise<ApiResponse<Player>> {
    try {
      // First get the game_id from the team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('game_id')
        .eq('id', request.team_id)
        .single()

      if (teamError || !team) {
        return {
          data: null,
          error: { message: 'Team not found', code: 'TEAM_NOT_FOUND', details: teamError }
        }
      }

      // Generate a UUID for guest users (since user_id expects UUID)
      const { data: { user } } = await supabase.auth.getUser()
      const playerUserId = user?.id || crypto.randomUUID()

      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('players')
        .insert([{
          game_id: team.game_id,
          team_id: request.team_id,
          display_name: request.name,
          user_id: playerUserId,
          is_online: true,
          joined_at: now,
          last_seen: now
        }])
        .select()
        .single()

      if (error) {
        // Handle unique constraint violations
        if (error.code === '23505') {
          if (error.details?.includes('players_team_id_display_name_key')) {
            return {
              data: null,
              error: { message: 'Player name already taken in this team', code: 'NAME_TAKEN', details: error }
            }
          }
          if (error.details?.includes('players_user_id_key')) {
            return {
              data: null,
              error: { message: 'Device already registered', code: 'DEVICE_REGISTERED', details: error }
            }
          }
        }
        return {
          data: null,
          error: { message: error.message, code: 'DATABASE_ERROR', details: error }
        }
      }

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to join team', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get player by ID
  static async getPlayer(playerId: string): Promise<ApiResponse<Player>> {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single()

      if (error) {
        return {
          data: null,
          error: { message: error.message, code: 'DATABASE_ERROR', details: error }
        }
      }

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to get player', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get player by device ID (now searches by user_id)
  static async getPlayerByDevice(deviceId: string): Promise<ApiResponse<Player>> {
    try {
      // For authenticated users, use their actual user_id
      const { data: { user } } = await supabase.auth.getUser()
      const searchId = user?.id || deviceId

      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', searchId)
        .single()

      if (error) {
        return {
          data: null,
          error: { message: 'Player not found', code: 'PLAYER_NOT_FOUND', details: error }
        }
      }

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to find player', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get all players in a team
  static async getTeamPlayers(teamId: string): Promise<ApiResponse<Player[]>> {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamId)
        .order('joined_at', { ascending: true })

      if (error) {
        return {
          data: null,
          error: { message: error.message, code: 'DATABASE_ERROR', details: error }
        }
      }

      return { data: data || [], error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to get team players', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get all players in a game
  static async getGamePlayers(gameId: string): Promise<ApiResponse<Player[]>> {
    try {
      const { data, error } = await supabase
        .from('players')
        .select(`
          *,
          teams!inner (
            id,
            name,
            game_id
          )
        `)
        .eq('teams.game_id', gameId)
        .order('joined_at', { ascending: true })

      if (error) {
        return {
          data: null,
          error: { message: error.message, code: 'DATABASE_ERROR', details: error }
        }
      }

      // Flatten the nested team data
      const players = data?.map(player => ({
        ...player,
        team_name: (player as any).teams?.name
      })) || []

      return { data: players, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to get game players', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Update player presence
  static async updatePresence(playerId: string, isOnline: boolean): Promise<ApiResponse<Player>> {
    try {
      const updateData: any = {
        is_online: isOnline,
        last_seen: new Date().toISOString()
      }

      // If going offline, clear current question
      if (!isOnline) {
        updateData.current_question_id = null
      }

      const { data, error } = await supabase
        .from('players')
        .update(updateData)
        .eq('id', playerId)
        .select()
        .single()

      if (error) {
        return {
          data: null,
          error: { message: error.message, code: 'DATABASE_ERROR', details: error }
        }
      }

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to update presence', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Update player's current question
  static async updateCurrentQuestion(playerId: string, questionId: string | null): Promise<ApiResponse<Player>> {
    try {
      const { data, error } = await supabase
        .from('players')
        .update({
          current_question_id: questionId,
          last_seen: new Date().toISOString()
        })
        .eq('id', playerId)
        .select()
        .single()

      if (error) {
        return {
          data: null,
          error: { message: error.message, code: 'DATABASE_ERROR', details: error }
        }
      }

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to update current question', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Remove player from team
  static async leaveTeam(playerId: string): Promise<ApiResponse<boolean>> {
    try {
      // Check if player is team captain
      const { data: teams } = await supabase
        .from('teams')
        .select('id, captain_id')
        .eq('captain_id', playerId)

      if (teams && teams.length > 0) {
        return {
          data: null,
          error: { message: 'Cannot leave team while captain', code: 'PLAYER_IS_CAPTAIN' }
        }
      }

      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId)

      if (error) {
        return {
          data: null,
          error: { message: error.message, code: 'DATABASE_ERROR', details: error }
        }
      }

      return { data: true, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to leave team', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get players with presence info for a game
  static async getGamePlayersWithPresence(gameId: string): Promise<ApiResponse<PlayerWithPresence[]>> {
    try {
      const { data, error } = await supabase
        .from('players')
        .select(`
          *,
          teams!inner (
            id,
            name,
            game_id
          )
        `)
        .eq('teams.game_id', gameId)
        .order('last_seen', { ascending: false })

      if (error) {
        return {
          data: null,
          error: { message: error.message, code: 'DATABASE_ERROR', details: error }
        }
      }

      // Calculate presence status
      const now = new Date()
      const playersWithPresence: PlayerWithPresence[] = data?.map(player => {
        const lastActivity = new Date(player.last_seen)
        const minutesSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60)

        return {
          ...player,
          team_name: (player as any).teams?.name,
          presence_status: player.is_online && minutesSinceActivity < 5 ? 'online' :
                          minutesSinceActivity < 15 ? 'away' : 'offline',
          minutes_since_activity: Math.floor(minutesSinceActivity)
        }
      }) || []

      return { data: playersWithPresence, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to get players with presence', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Heartbeat to keep player online
  static async heartbeat(playerId: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('players')
        .update({
          is_online: true,
          last_seen: new Date().toISOString()
        })
        .eq('id', playerId)

      if (error) {
        return {
          data: null,
          error: { message: error.message, code: 'DATABASE_ERROR', details: error }
        }
      }

      return { data: true, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to update heartbeat', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Check if player name is available in team
  static async isPlayerNameAvailable(teamId: string, name: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('players')
        .select('display_name')
        .eq('team_id', teamId)
        .eq('display_name', name)
        .single()

      return !data
    } catch {
      return true
    }
  }

  // Get player statistics
  static async getPlayerStats(playerId: string): Promise<ApiResponse<{
    correctAnswers: number
    totalAnswers: number
    averageResponseTime: number
    gamesPlayed: number
  }>> {
    try {
      // Get player's answers
      const { data: answers, error: answersError } = await supabase
        .from('answers')
        .select(`
          is_correct,
          submitted_at,
          teams!inner (
            id,
            players!inner (
              id
            )
          )
        `)
        .eq('teams.players.id', playerId)

      if (answersError) {
        return {
          data: null,
          error: { message: answersError.message, code: 'DATABASE_ERROR', details: answersError }
        }
      }

      // Get unique games played
      const { data: teams, error: teamsError } = await supabase
        .from('players')
        .select(`
          teams!inner (
            game_id
          )
        `)
        .eq('id', playerId)

      if (teamsError) {
        return {
          data: null,
          error: { message: teamsError.message, code: 'DATABASE_ERROR', details: teamsError }
        }
      }

      const uniqueGameIds = new Set(teams?.map((t: any) => t.teams.game_id) || [])

      const stats = {
        correctAnswers: answers?.filter(a => a.is_correct).length || 0,
        totalAnswers: answers?.length || 0,
        averageResponseTime: 0, // TODO: Calculate based on question display time and submission time
        gamesPlayed: uniqueGameIds.size
      }

      return { data: stats, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to get player stats', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Bulk update presence for offline cleanup
  static async markStalePlayersOffline(minutesThreshold: number = 15): Promise<ApiResponse<number>> {
    try {
      const cutoffTime = new Date(Date.now() - minutesThreshold * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('players')
        .update({ is_online: false })
        .lt('last_seen', cutoffTime)
        .eq('is_online', true)
        .select('id')

      if (error) {
        return {
          data: null,
          error: { message: error.message, code: 'DATABASE_ERROR', details: error }
        }
      }

      return { data: data?.length || 0, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to update stale players', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }
}