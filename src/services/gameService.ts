import { supabase } from '../lib/supabase'
import type { Game, CreateGameRequest, UpdateGameRequest, GameSettings } from '../types/game'
import { DEFAULT_GAME_SETTINGS } from '../types/game'
import type { ApiResponse } from '../types'

export class GameService {
  // Create a new game
  static async createGame(request: CreateGameRequest): Promise<ApiResponse<Game>> {
    try {
      console.log('Creating game with request:', request)

      const { data: { user } } = await supabase.auth.getUser()
      console.log('Current user:', user)

      if (!user) {
        console.log('No user found - authentication required')
        return {
          data: null,
          error: { message: 'Authentication required', code: 'AUTH_REQUIRED' }
        }
      }

      const gameData = {
        host_id: user.id,
        title: request.title,
        max_rounds: request.max_rounds,
        questions_per_round: request.questions_per_round,
        settings: { ...DEFAULT_GAME_SETTINGS, ...request.settings }
      }

      console.log('Game data to insert:', gameData)

      const { data, error } = await supabase
        .from('games')
        .insert([gameData])
        .select()
        .single()

      console.log('Insert result:', { data, error })

      if (error) {
        console.error('Database error:', error)
        return {
          data: null,
          error: { message: error.message, code: 'DATABASE_ERROR', details: error }
        }
      }

      console.log('Game created successfully:', data)
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to create game', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get game by ID
  static async getGame(gameId: string): Promise<ApiResponse<Game>> {
    try {
      console.log('Querying database for game:', gameId)
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single()

      console.log('Database query result:', { data, error })

      if (error) {
        console.error('Database error in getGame:', error)
        return {
          data: null,
          error: { message: error.message, code: 'DATABASE_ERROR', details: error }
        }
      }

      console.log('Successfully retrieved game:', data)
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to get game', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get games for current user (as host)
  static async getHostGames(): Promise<ApiResponse<Game[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return {
          data: null,
          error: { message: 'Authentication required', code: 'AUTH_REQUIRED' }
        }
      }

      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false })

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
        error: { message: 'Failed to get games', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Update game
  static async updateGame(gameId: string, updates: UpdateGameRequest): Promise<ApiResponse<Game>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return {
          data: null,
          error: { message: 'Authentication required', code: 'AUTH_REQUIRED' }
        }
      }

      // Add timestamps for status changes
      const updateData: any = { ...updates }
      if (updates.status === 'active' && !updateData.started_at) {
        updateData.started_at = new Date().toISOString()
      }
      if (updates.status === 'completed' && !updateData.ended_at) {
        updateData.ended_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('games')
        .update(updateData)
        .eq('id', gameId)
        .eq('host_id', user.id) // Only host can update
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
        error: { message: 'Failed to update game', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Delete game (soft delete by marking as completed)
  static async deleteGame(gameId: string): Promise<ApiResponse<boolean>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return {
          data: null,
          error: { message: 'Authentication required', code: 'AUTH_REQUIRED' }
        }
      }

      const { error } = await supabase
        .from('games')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString()
        })
        .eq('id', gameId)
        .eq('host_id', user.id) // Only host can delete

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
        error: { message: 'Failed to delete game', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get active games (for joining)
  static async getActiveGames(): Promise<ApiResponse<Game[]>> {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20)

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
        error: { message: 'Failed to get active games', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Start game (change status to active)
  static async startGame(gameId: string): Promise<ApiResponse<Game>> {
    try {
      // Get game details first
      const gameResponse = await this.getGame(gameId)
      if (gameResponse.error || !gameResponse.data) {
        return gameResponse
      }

      const game = gameResponse.data

      // Import QuestionService to preselect questions
      const { QuestionService } = await import('./questionService')

      // Preselect questions for the game
      const questionsResponse = await QuestionService.preselectQuestionsForGame(
        gameId,
        game.questions_per_round,
        game.max_rounds,
        game.host_id
      )

      if (questionsResponse.error) {
        return {
          data: null,
          error: { message: `Failed to prepare questions: ${questionsResponse.error.message}`, code: 'QUESTION_PREPARATION_FAILED', details: questionsResponse.error }
        }
      }

      // Now start the game
      return this.updateGame(gameId, {
        status: 'active',
        started_at: new Date().toISOString()
      })
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to start game', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Pause game
  static async pauseGame(gameId: string): Promise<ApiResponse<Game>> {
    return this.updateGame(gameId, { status: 'paused' })
  }

  // Resume game
  static async resumeGame(gameId: string): Promise<ApiResponse<Game>> {
    return this.updateGame(gameId, { status: 'active' })
  }

  // Complete game
  static async completeGame(gameId: string): Promise<ApiResponse<Game>> {
    return this.updateGame(gameId, {
      status: 'completed',
      ended_at: new Date().toISOString()
    })
  }

  // Advance to next question
  static async advanceQuestion(gameId: string): Promise<ApiResponse<Game>> {
    try {
      const gameResponse = await this.getGame(gameId)
      if (gameResponse.error || !gameResponse.data) {
        return gameResponse
      }

      const game = gameResponse.data
      let updates: UpdateGameRequest = {}

      if (game.current_question < game.questions_per_round) {
        // Move to next question in current round
        updates.current_question = game.current_question + 1
      } else if (game.current_round < game.max_rounds) {
        // Move to next round
        updates.current_round = game.current_round + 1
        updates.current_question = 1
      } else {
        // Game complete
        updates.status = 'completed'
        updates.ended_at = new Date().toISOString()
      }

      return this.updateGame(gameId, updates)
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to advance question', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Check if user is host of game
  static async isHost(gameId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { data } = await supabase
        .from('games')
        .select('host_id')
        .eq('id', gameId)
        .eq('host_id', user.id)
        .single()

      return !!data
    } catch {
      return false
    }
  }
}