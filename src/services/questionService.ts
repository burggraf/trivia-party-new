import { supabase } from '../lib/supabase'
import type { Question, GameQuestion, QuestionWithAnswers, RandomizedQuestion } from '../types/question'
import type { ApiResponse } from '../types'

export class QuestionService {
  // Get available questions for a host (excluding already used ones)
  static async getAvailableQuestions(hostId: string, limit: number = 50): Promise<ApiResponse<Question[]>> {
    try {
      // For now, just get questions without filtering by usage to test
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .limit(limit)

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
        error: { message: 'Failed to get available questions', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get question by ID with randomized answers
  static async getQuestion(questionId: string): Promise<ApiResponse<Question>> {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', questionId)
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
        error: { message: 'Failed to get question', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Randomize question answers (correct answer is always in field 'a')
  static randomizeAnswers(question: Question, seed?: string): RandomizedQuestion {
    // Create array of answers with their original positions
    const answers = [
      { text: question.a, original: 'a', isCorrect: true },
      { text: question.b, original: 'b', isCorrect: false },
      { text: question.c, original: 'c', isCorrect: false },
      { text: question.d, original: 'd', isCorrect: false }
    ]

    // Use seed for deterministic randomization (same for all players in a game)
    const seedValue = seed ? this.hashCode(seed) : Math.random() * 1000000
    const shuffled = this.shuffleWithSeed(answers, seedValue)

    // Find where the correct answer ended up
    const correctIndex = shuffled.findIndex(answer => answer.isCorrect)
    const correctLetter = ['a', 'b', 'c', 'd'][correctIndex]

    return {
      id: question.id,
      question: question.question,
      category: question.category,
      difficulty: question.difficulty,
      answers: {
        a: shuffled[0].text,
        b: shuffled[1].text,
        c: shuffled[2].text,
        d: shuffled[3].text
      },
      correct_answer: correctLetter as 'a' | 'b' | 'c' | 'd',
      original_correct: 'a',
      randomization_seed: seed || seedValue.toString(),
      created_at: question.created_at
    }
  }

  // Add question to game
  static async addQuestionToGame(gameId: string, questionId: string, roundNumber: number, questionNumber: number): Promise<ApiResponse<GameQuestion>> {
    try {
      // Get the question to randomize answers
      const questionResponse = await this.getQuestion(questionId)
      if (questionResponse.error || !questionResponse.data) {
        return questionResponse as ApiResponse<GameQuestion>
      }

      const question = questionResponse.data

      // Generate a deterministic seed based on game and question for consistent randomization
      const randomizationSeed = `${gameId}-${questionId}-${roundNumber}-${questionNumber}`
      const randomized = this.randomizeAnswers(question, randomizationSeed)

      // Store shuffled answers and correct position
      const shuffledAnswers = [
        randomized.answers.a,
        randomized.answers.b,
        randomized.answers.c,
        randomized.answers.d
      ]

      const correctPosition = ['a', 'b', 'c', 'd'].indexOf(randomized.correct_answer)

      const { data, error } = await supabase
        .from('game_questions')
        .insert([{
          game_id: gameId,
          question_id: questionId,
          round_number: roundNumber,
          question_order: questionNumber,
          shuffled_answers: shuffledAnswers,
          correct_position: correctPosition
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
        error: { message: 'Failed to add question to game', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get game question with randomized answers
  static async getGameQuestion(gameId: string, roundNumber: number, questionNumber: number): Promise<ApiResponse<QuestionWithAnswers>> {
    try {
      const { data, error } = await supabase
        .from('game_questions')
        .select(`
          *,
          questions (*)
        `)
        .eq('game_id', gameId)
        .eq('round_number', roundNumber)
        .eq('question_order', questionNumber)
        .single()

      if (error) {
        return {
          data: null,
          error: { message: 'Question not found', code: 'QUESTION_NOT_FOUND', details: error }
        }
      }

      const gameQuestion = data as any
      const question = gameQuestion.questions

      if (!question) {
        return {
          data: null,
          error: { message: 'Question data not found', code: 'QUESTION_DATA_NOT_FOUND' }
        }
      }

      // Use stored shuffled answers and correct position
      const shuffledAnswers = gameQuestion.shuffled_answers
      const correctPosition = gameQuestion.correct_position
      const correctLetter = ['a', 'b', 'c', 'd'][correctPosition]

      const questionWithAnswers: QuestionWithAnswers = {
        game_question_id: gameQuestion.id,
        game_id: gameId,
        round_number: roundNumber,
        question_number: questionNumber,
        question: question.question,
        category: question.category,
        difficulty: question.difficulty,
        answers: {
          a: shuffledAnswers[0],
          b: shuffledAnswers[1],
          c: shuffledAnswers[2],
          d: shuffledAnswers[3]
        },
        correct_answer: correctLetter as 'a' | 'b' | 'c' | 'd',
        displayed_at: gameQuestion.displayed_at,
        time_limit: 30 // Default time limit since it's not stored in the database
      }

      return { data: questionWithAnswers, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to get game question', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Mark question as displayed
  static async markQuestionDisplayed(gameId: string, roundNumber: number, questionNumber: number): Promise<ApiResponse<GameQuestion>> {
    try {
      const { data, error } = await supabase
        .from('game_questions')
        .update({
          displayed_at: new Date().toISOString()
        })
        .eq('game_id', gameId)
        .eq('round_number', roundNumber)
        .eq('question_order', questionNumber)
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
        error: { message: 'Failed to mark question displayed', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Pre-select questions for a game
  static async preselectQuestionsForGame(gameId: string, questionsPerRound: number, maxRounds: number, hostId: string): Promise<ApiResponse<GameQuestion[]>> {
    try {
      const totalQuestions = questionsPerRound * maxRounds

      // Get available questions for this host
      const availableResponse = await this.getAvailableQuestions(hostId, totalQuestions + 10)
      if (availableResponse.error || !availableResponse.data) {
        return availableResponse as ApiResponse<GameQuestion[]>
      }

      if (availableResponse.data.length < totalQuestions) {
        return {
          data: null,
          error: { message: `Not enough available questions. Need ${totalQuestions}, found ${availableResponse.data.length}`, code: 'INSUFFICIENT_QUESTIONS' }
        }
      }

      // Shuffle and select questions
      const selectedQuestions = this.shuffleArray([...availableResponse.data]).slice(0, totalQuestions)
      const gameQuestions: GameQuestion[] = []

      // Add questions to game
      let questionIndex = 0
      for (let round = 1; round <= maxRounds; round++) {
        for (let questionNum = 1; questionNum <= questionsPerRound; questionNum++) {
          const question = selectedQuestions[questionIndex]
          const response = await this.addQuestionToGame(gameId, question.id, round, questionNum)

          if (response.error) {
            return {
              data: null,
              error: response.error
            }
          }

          gameQuestions.push(response.data!)
          questionIndex++
        }
      }

      // Mark questions as used by this host
      await this.markQuestionsAsUsed(hostId, selectedQuestions.map(q => q.id))

      return { data: gameQuestions, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to preselect questions', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Mark questions as used by host
  static async markQuestionsAsUsed(hostId: string, questionIds: string[]): Promise<ApiResponse<boolean>> {
    try {
      const usageRecords = questionIds.map(questionId => ({
        host_id: hostId,
        question_id: questionId,
        used_at: new Date().toISOString()
      }))

      const { error } = await supabase
        .from('question_usage')
        .insert(usageRecords)

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
        error: { message: 'Failed to mark questions as used', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get all questions for a game
  static async getGameQuestions(gameId: string): Promise<ApiResponse<QuestionWithAnswers[]>> {
    try {
      const { data, error } = await supabase
        .from('game_questions')
        .select(`
          *,
          questions (*)
        `)
        .eq('game_id', gameId)
        .order('round_number', { ascending: true })
        .order('question_order', { ascending: true })

      if (error) {
        return {
          data: null,
          error: { message: error.message, code: 'DATABASE_ERROR', details: error }
        }
      }

      const questionsWithAnswers = data?.map(gameQuestion => {
        const question = (gameQuestion as any).questions
        const randomized = this.randomizeAnswers(question, gameQuestion.randomization_seed)

        return {
          game_question_id: gameQuestion.id,
          game_id: gameId,
          round_number: gameQuestion.round_number,
          question_number: gameQuestion.question_number,
          question: randomized.question,
          category: randomized.category,
          difficulty: randomized.difficulty,
          answers: randomized.answers,
          correct_answer: randomized.correct_answer,
          displayed_at: gameQuestion.displayed_at,
          time_limit: gameQuestion.time_limit
        }
      }) || []

      return { data: questionsWithAnswers, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to get game questions', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Verify answer correctness using original question data
  static async verifyAnswer(gameId: string, roundNumber: number, questionNumber: number, selectedAnswer: 'a' | 'b' | 'c' | 'd'): Promise<ApiResponse<{ isCorrect: boolean; correctAnswer: string }>> {
    try {
      const { data, error } = await supabase
        .from('game_questions')
        .select(`
          randomization_seed,
          questions (
            a, b, c, d
          )
        `)
        .eq('game_id', gameId)
        .eq('round_number', roundNumber)
        .eq('question_order', questionNumber)
        .single()

      if (error) {
        return {
          data: null,
          error: { message: 'Question not found', code: 'QUESTION_NOT_FOUND', details: error }
        }
      }

      const gameQuestion = data as any
      const question = gameQuestion.questions

      // Recreate the randomization to determine correct answer position
      const randomized = this.randomizeAnswers(question, gameQuestion.randomization_seed)
      const isCorrect = selectedAnswer === randomized.correct_answer

      return {
        data: {
          isCorrect,
          correctAnswer: randomized.correct_answer
        },
        error: null
      }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to verify answer', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Utility: Generate hash code from string for seeded randomization
  private static hashCode(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  // Utility: Shuffle array with seed for deterministic randomization
  private static shuffleWithSeed<T>(array: T[], seed: number): T[] {
    const shuffled = [...array]
    let currentIndex = shuffled.length
    let randomIndex: number

    // Use seed-based random number generator
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }

    while (currentIndex !== 0) {
      randomIndex = Math.floor(seededRandom() * currentIndex)
      currentIndex--

      [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]]
    }

    return shuffled
  }

  // Utility: Simple array shuffle
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // Get question statistics
  static async getQuestionStats(questionId: string): Promise<ApiResponse<{
    timesUsed: number
    correctAnswerRate: number
    averageResponseTime: number
  }>> {
    try {
      // Get usage count
      const { data: usageData, error: usageError } = await supabase
        .from('question_usage')
        .select('id')
        .eq('question_id', questionId)

      if (usageError) {
        return {
          data: null,
          error: { message: usageError.message, code: 'DATABASE_ERROR', details: usageError }
        }
      }

      // Get answer statistics
      const { data: answerData, error: answerError } = await supabase
        .from('answers')
        .select('is_correct')
        .eq('game_questions.question_id', questionId)

      if (answerError) {
        return {
          data: null,
          error: { message: answerError.message, code: 'DATABASE_ERROR', details: answerError }
        }
      }

      const timesUsed = usageData?.length || 0
      const totalAnswers = answerData?.length || 0
      const correctAnswers = answerData?.filter(a => a.is_correct).length || 0
      const correctAnswerRate = totalAnswers > 0 ? correctAnswers / totalAnswers : 0

      return {
        data: {
          timesUsed,
          correctAnswerRate,
          averageResponseTime: 0 // TODO: Calculate when we have timing data
        },
        error: null
      }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to get question stats', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }
}