import { supabase } from '../lib/supabase'
import { isDemoMode, demoTeams, demoLeaderboard, createDemoResponse } from '../lib/demoData'
import type { Team, CreateTeamRequest, LeaderboardEntry } from '../types/team'
import type { ApiResponse } from '../types'
import { generateJoinCode } from '../types/team'

export class TeamService {
  // Create a new team
  static async createTeam(request: CreateTeamRequest): Promise<ApiResponse<Team>> {
    try {
      const joinCode = await this.generateUniqueJoinCode(request.game_id)

      const { data, error } = await supabase
        .from('teams')
        .insert([{
          game_id: request.game_id,
          name: request.name,
          join_code: joinCode
        }])
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
        error: { message: 'Failed to create team', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get team by ID
  static async getTeam(teamId: string): Promise<ApiResponse<Team>> {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
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
        error: { message: 'Failed to get team', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get team by join code
  static async getTeamByJoinCode(gameId: string, joinCode: string): Promise<ApiResponse<Team>> {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('game_id', gameId)
        .eq('join_code', joinCode.toUpperCase())
        .single()

      if (error) {
        return {
          data: null,
          error: { message: 'Team not found', code: 'TEAM_NOT_FOUND', details: error }
        }
      }

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to find team', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get all teams in a game
  static async getGameTeams(gameId: string): Promise<ApiResponse<Team[]>> {
    if (isDemoMode()) {
      return createDemoResponse(demoTeams)
    }

    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true })

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
        error: { message: 'Failed to get teams', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Update team score
  static async updateTeamScore(teamId: string, scoreChange: number): Promise<ApiResponse<Team>> {
    try {
      // First get current score
      const { data: currentTeam, error: getError } = await supabase
        .from('teams')
        .select('score')
        .eq('id', teamId)
        .single()

      if (getError || !currentTeam) {
        return {
          data: null,
          error: { message: 'Team not found', code: 'TEAM_NOT_FOUND', details: getError }
        }
      }

      const newScore = Math.max(0, currentTeam.score + scoreChange)

      const { data, error } = await supabase
        .from('teams')
        .update({ score: newScore })
        .eq('id', teamId)
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
        error: { message: 'Failed to update score', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Set team captain
  static async setTeamCaptain(teamId: string, playerId: string): Promise<ApiResponse<Team>> {
    try {
      const { data, error } = await supabase
        .from('teams')
        .update({ captain_id: playerId })
        .eq('id', teamId)
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
        error: { message: 'Failed to set captain', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get leaderboard for a game
  static async getLeaderboard(gameId: string): Promise<ApiResponse<LeaderboardEntry[]>> {
    if (isDemoMode()) {
      return createDemoResponse(demoLeaderboard)
    }

    try {
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          players (count),
          answers (
            is_correct,
            points_earned
          )
        `)
        .eq('game_id', gameId)
        .order('score', { ascending: false })

      if (teamsError) {
        return {
          data: null,
          error: { message: teamsError.message, code: 'DATABASE_ERROR', details: teamsError }
        }
      }

      // Calculate leaderboard entries with ranking
      const leaderboard: LeaderboardEntry[] = (teams || []).map((team: any, index: number) => {
        const correctAnswers = team.answers?.filter((a: any) => a.is_correct).length || 0
        const totalAnswers = team.answers?.length || 0
        const playerCount = team.players?.[0]?.count || 0

        return {
          team: {
            id: team.id,
            game_id: team.game_id,
            name: team.name,
            join_code: team.join_code,
            captain_id: team.captain_id,
            score: team.score,
            created_at: team.created_at
          },
          rank: index + 1,
          score: team.score,
          correct_count: correctAnswers,
          total_count: totalAnswers,
          player_count: playerCount
        }
      })

      return { data: leaderboard, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to get leaderboard', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Generate a unique join code for the game
  static async generateUniqueJoinCode(gameId: string): Promise<string> {
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      const code = generateJoinCode()

      // Check if code is already used in this game
      const { data } = await supabase
        .from('teams')
        .select('join_code')
        .eq('game_id', gameId)
        .eq('join_code', code)
        .single()

      if (!data) {
        return code
      }

      attempts++
    }

    // Fallback: add timestamp to ensure uniqueness
    const timestamp = Date.now().toString().slice(-4)
    return `${generateJoinCode().slice(0, 2)}${timestamp}`
  }

  // Check if team name is available
  static async isTeamNameAvailable(gameId: string, name: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('teams')
        .select('name')
        .eq('game_id', gameId)
        .eq('name', name)
        .single()

      return !data
    } catch {
      return true
    }
  }

  // Delete team (only if no players)
  static async deleteTeam(teamId: string): Promise<ApiResponse<boolean>> {
    try {
      // Check if team has players
      const { data: players } = await supabase
        .from('players')
        .select('id')
        .eq('team_id', teamId)

      if (players && players.length > 0) {
        return {
          data: null,
          error: { message: 'Cannot delete team with players', code: 'TEAM_HAS_PLAYERS' }
        }
      }

      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)

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
        error: { message: 'Failed to delete team', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get team statistics
  static async getTeamStats(teamId: string): Promise<ApiResponse<{
    correctAnswers: number
    totalAnswers: number
    averageResponseTime: number
    totalPoints: number
  }>> {
    try {
      const { data: answers, error } = await supabase
        .from('answers')
        .select('is_correct, points_earned, submitted_at')
        .eq('team_id', teamId)

      if (error) {
        return {
          data: null,
          error: { message: error.message, code: 'DATABASE_ERROR', details: error }
        }
      }

      const stats = {
        correctAnswers: answers?.filter(a => a.is_correct).length || 0,
        totalAnswers: answers?.length || 0,
        averageResponseTime: 0, // TODO: Calculate based on question display time
        totalPoints: answers?.reduce((sum, a) => sum + a.points_earned, 0) || 0
      }

      return { data: stats, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to get team stats', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }
}