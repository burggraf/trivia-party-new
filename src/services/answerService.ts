import { supabase } from '../lib/supabase'
import type { Answer, SubmitAnswerRequest, AnswerWithDetails } from '../types/question'
import type { ApiResponse } from '../types'
import { QuestionService } from './questionService'

export class AnswerService {
  // Submit team answer with validation
  static async submitAnswer(request: SubmitAnswerRequest): Promise<ApiResponse<Answer>> {
    try {
      // First, verify the game question exists and get timing info
      const { data: gameQuestion, error: questionError } = await supabase
        .from('game_questions')
        .select('id, displayed_at, time_limit')
        .eq('game_id', request.game_id)
        .eq('round_number', request.round_number)
        .eq('question_number', request.question_number)
        .single()

      if (questionError) {
        return {
          data: null,
          error: { message: 'Question not found', code: 'QUESTION_NOT_FOUND', details: questionError }
        }
      }

      // Check if question has been displayed
      if (!gameQuestion.displayed_at) {
        return {
          data: null,
          error: { message: 'Question not yet displayed', code: 'QUESTION_NOT_DISPLAYED' }
        }
      }

      // Check if submission is within time limit
      const displayedAt = new Date(gameQuestion.displayed_at)
      const now = new Date()
      const secondsElapsed = (now.getTime() - displayedAt.getTime()) / 1000

      if (gameQuestion.time_limit && secondsElapsed > gameQuestion.time_limit) {
        return {
          data: null,
          error: { message: 'Time limit exceeded', code: 'TIME_LIMIT_EXCEEDED' }
        }
      }

      // Check if team has already answered this question
      const { data: existingAnswer } = await supabase
        .from('answers')
        .select('id')
        .eq('team_id', request.team_id)
        .eq('game_question_id', gameQuestion.id)
        .single()

      if (existingAnswer) {
        return {
          data: null,
          error: { message: 'Team has already answered this question', code: 'ALREADY_ANSWERED' }
        }
      }

      // Verify the answer correctness
      const verificationResponse = await QuestionService.verifyAnswer(
        request.game_id,
        request.round_number,
        request.question_number,
        request.selected_answer
      )

      if (verificationResponse.error) {
        return {
          data: null,
          error: verificationResponse.error
        }
      }

      const { isCorrect } = verificationResponse.data!

      // Calculate points based on correctness and timing
      const pointsEarned = this.calculatePoints(isCorrect, secondsElapsed, gameQuestion.time_limit)

      // Submit the answer
      const { data, error } = await supabase
        .from('answers')
        .insert([{
          team_id: request.team_id,
          game_question_id: gameQuestion.id,
          selected_answer: request.selected_answer,
          is_correct: isCorrect,
          points_earned: pointsEarned,
          response_time: Math.round(secondsElapsed)
        }])
        .select()
        .single()

      if (error) {
        // Handle race condition where another answer was submitted
        if (error.code === '23505') {
          return {
            data: null,
            error: { message: 'Team has already answered this question', code: 'ALREADY_ANSWERED', details: error }
          }
        }
        return {
          data: null,
          error: { message: error.message, code: 'DATABASE_ERROR', details: error }
        }
      }

      // Update team score
      if (pointsEarned > 0) {
        await this.updateTeamScore(request.team_id, pointsEarned)
      }

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to submit answer', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get team's answer for a specific question
  static async getTeamAnswer(teamId: string, gameId: string, roundNumber: number, questionNumber: number): Promise<ApiResponse<Answer>> {
    try {
      const { data, error } = await supabase
        .from('answers')
        .select(`
          *,
          game_questions!inner (
            game_id,
            round_number,
            question_number
          )
        `)
        .eq('team_id', teamId)
        .eq('game_questions.game_id', gameId)
        .eq('game_questions.round_number', roundNumber)
        .eq('game_questions.question_number', questionNumber)
        .single()

      if (error) {
        return {
          data: null,
          error: { message: 'Answer not found', code: 'ANSWER_NOT_FOUND', details: error }
        }
      }

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to get team answer', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get all answers for a specific game question
  static async getQuestionAnswers(gameId: string, roundNumber: number, questionNumber: number): Promise<ApiResponse<AnswerWithDetails[]>> {
    try {
      const { data, error } = await supabase
        .from('answers')
        .select(`
          *,
          teams (
            id,
            name
          ),
          game_questions!inner (
            game_id,
            round_number,
            question_number
          )
        `)
        .eq('game_questions.game_id', gameId)
        .eq('game_questions.round_number', roundNumber)
        .eq('game_questions.question_number', questionNumber)
        .order('submitted_at', { ascending: true })

      if (error) {
        return {
          data: null,
          error: { message: error.message, code: 'DATABASE_ERROR', details: error }
        }
      }

      const answersWithDetails = data?.map(answer => ({
        ...answer,
        team_name: (answer as any).teams?.name || 'Unknown Team'
      })) || []

      return { data: answersWithDetails, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to get question answers', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get all answers for a team in a game
  static async getTeamAnswers(teamId: string, gameId: string): Promise<ApiResponse<Answer[]>> {
    try {
      const { data, error } = await supabase
        .from('answers')
        .select(`
          *,
          game_questions!inner (
            game_id,
            round_number,
            question_number
          )
        `)
        .eq('team_id', teamId)
        .eq('game_questions.game_id', gameId)
        .order('game_questions.round_number', { ascending: true })
        .order('game_questions.question_number', { ascending: true })

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
        error: { message: 'Failed to get team answers', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get game answer statistics
  static async getGameAnswerStats(gameId: string): Promise<ApiResponse<{
    totalAnswers: number
    correctAnswers: number
    averageResponseTime: number
    questionsAnswered: number
    teamsParticipating: number
  }>> {
    try {
      const { data, error } = await supabase
        .from('answers')
        .select(`
          is_correct,
          response_time,
          team_id,
          game_questions!inner (
            game_id,
            id
          )
        `)
        .eq('game_questions.game_id', gameId)

      if (error) {
        return {
          data: null,
          error: { message: error.message, code: 'DATABASE_ERROR', details: error }
        }
      }

      const answers = data || []
      const totalAnswers = answers.length
      const correctAnswers = answers.filter(a => a.is_correct).length
      const totalResponseTime = answers.reduce((sum, a) => sum + (a.response_time || 0), 0)
      const averageResponseTime = totalAnswers > 0 ? totalResponseTime / totalAnswers : 0

      // Count unique questions and teams
      const uniqueQuestions = new Set(answers.map(a => (a as any).game_questions.id))
      const uniqueTeams = new Set(answers.map(a => a.team_id))

      return {
        data: {
          totalAnswers,
          correctAnswers,
          averageResponseTime,
          questionsAnswered: uniqueQuestions.size,
          teamsParticipating: uniqueTeams.size
        },
        error: null
      }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to get answer statistics', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Check if team can submit answer for current question
  static async canSubmitAnswer(teamId: string, gameId: string, roundNumber: number, questionNumber: number): Promise<ApiResponse<{
    canSubmit: boolean
    reason?: string
    timeRemaining?: number
  }>> {
    try {
      // Get game question info
      const { data: gameQuestion, error: questionError } = await supabase
        .from('game_questions')
        .select('id, displayed_at, time_limit')
        .eq('game_id', gameId)
        .eq('round_number', roundNumber)
        .eq('question_number', questionNumber)
        .single()

      if (questionError) {
        return {
          data: {
            canSubmit: false,
            reason: 'Question not found'
          },
          error: null
        }
      }

      // Check if question has been displayed
      if (!gameQuestion.displayed_at) {
        return {
          data: {
            canSubmit: false,
            reason: 'Question not yet displayed'
          },
          error: null
        }
      }

      // Check if team has already answered
      const { data: existingAnswer } = await supabase
        .from('answers')
        .select('id')
        .eq('team_id', teamId)
        .eq('game_question_id', gameQuestion.id)
        .single()

      if (existingAnswer) {
        return {
          data: {
            canSubmit: false,
            reason: 'Already answered'
          },
          error: null
        }
      }

      // Check time limit
      const displayedAt = new Date(gameQuestion.displayed_at)
      const now = new Date()
      const secondsElapsed = (now.getTime() - displayedAt.getTime()) / 1000
      const timeRemaining = gameQuestion.time_limit ? gameQuestion.time_limit - secondsElapsed : null

      if (gameQuestion.time_limit && secondsElapsed > gameQuestion.time_limit) {
        return {
          data: {
            canSubmit: false,
            reason: 'Time limit exceeded',
            timeRemaining: 0
          },
          error: null
        }
      }

      return {
        data: {
          canSubmit: true,
          timeRemaining: timeRemaining || undefined
        },
        error: null
      }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to check submission eligibility', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get answer breakdown for a question (for host dashboard)
  static async getAnswerBreakdown(gameId: string, roundNumber: number, questionNumber: number): Promise<ApiResponse<{
    a: number
    b: number
    c: number
    d: number
    correct: string
    total: number
  }>> {
    try {
      const answersResponse = await this.getQuestionAnswers(gameId, roundNumber, questionNumber)
      if (answersResponse.error) {
        return {
          data: null,
          error: answersResponse.error
        }
      }

      const answers = answersResponse.data || []
      const breakdown = {
        a: answers.filter(a => a.selected_answer === 'a').length,
        b: answers.filter(a => a.selected_answer === 'b').length,
        c: answers.filter(a => a.selected_answer === 'c').length,
        d: answers.filter(a => a.selected_answer === 'd').length,
        correct: '', // Will be filled by getting the correct answer
        total: answers.length
      }

      // Get the correct answer
      const verificationResponse = await QuestionService.verifyAnswer(gameId, roundNumber, questionNumber, 'a')
      if (verificationResponse.data) {
        breakdown.correct = verificationResponse.data.correctAnswer
      }

      return { data: breakdown, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to get answer breakdown', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Private: Calculate points based on correctness and timing
  private static calculatePoints(isCorrect: boolean, responseTime: number, timeLimit?: number): number {
    if (!isCorrect) return 0

    const basePoints = 1000

    // If no time limit, just give base points
    if (!timeLimit) return basePoints

    // Time bonus: faster answers get more points
    // Points scale from 100% (instant) to 50% (at time limit)
    const timeBonus = Math.max(0.5, 1 - (responseTime / timeLimit) * 0.5)

    return Math.round(basePoints * timeBonus)
  }

  // Private: Update team score
  private static async updateTeamScore(teamId: string, pointsToAdd: number): Promise<void> {
    try {
      const { data: team } = await supabase
        .from('teams')
        .select('score')
        .eq('id', teamId)
        .single()

      if (team) {
        await supabase
          .from('teams')
          .update({ score: team.score + pointsToAdd })
          .eq('id', teamId)
      }
    } catch (error) {
      // Log error but don't fail the answer submission
      console.error('Failed to update team score:', error)
    }
  }

  // Delete answer (admin function)
  static async deleteAnswer(answerId: string): Promise<ApiResponse<boolean>> {
    try {
      // Get answer details for score adjustment
      const { data: answer } = await supabase
        .from('answers')
        .select('team_id, points_earned')
        .eq('id', answerId)
        .single()

      // Delete the answer
      const { error } = await supabase
        .from('answers')
        .delete()
        .eq('id', answerId)

      if (error) {
        return {
          data: null,
          error: { message: error.message, code: 'DATABASE_ERROR', details: error }
        }
      }

      // Adjust team score if points were earned
      if (answer && answer.points_earned > 0) {
        await this.updateTeamScore(answer.team_id, -answer.points_earned)
      }

      return { data: true, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to delete answer', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get fastest correct answers for a question
  static async getFastestAnswers(gameId: string, roundNumber: number, questionNumber: number, limit: number = 5): Promise<ApiResponse<AnswerWithDetails[]>> {
    try {
      const { data, error } = await supabase
        .from('answers')
        .select(`
          *,
          teams (
            id,
            name
          ),
          game_questions!inner (
            game_id,
            round_number,
            question_number
          )
        `)
        .eq('game_questions.game_id', gameId)
        .eq('game_questions.round_number', roundNumber)
        .eq('game_questions.question_number', questionNumber)
        .eq('is_correct', true)
        .order('response_time', { ascending: true })
        .limit(limit)

      if (error) {
        return {
          data: null,
          error: { message: error.message, code: 'DATABASE_ERROR', details: error }
        }
      }

      const fastestAnswers = data?.map(answer => ({
        ...answer,
        team_name: (answer as any).teams?.name || 'Unknown Team'
      })) || []

      return { data: fastestAnswers, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to get fastest answers', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }
}