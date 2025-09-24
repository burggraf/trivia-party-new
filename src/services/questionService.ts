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
    const fallbackAnswers = ['Answer A', 'Answer B', 'Answer C', 'Answer D']

    // Create array of answers with their original positions. Fill in any missing
    // answer text so that we always persist valid strings to Postgres.
    const answers = [
      { text: question.a ?? fallbackAnswers[0], original: 'a', isCorrect: true },
      { text: question.b ?? fallbackAnswers[1], original: 'b', isCorrect: false },
      { text: question.c ?? fallbackAnswers[2], original: 'c', isCorrect: false },
      { text: question.d ?? fallbackAnswers[3], original: 'd', isCorrect: false }
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
  static async addQuestionToGame(
    gameId: string,
    questionId: string,
    roundNumber: number,
    questionNumber: number,
    questionData?: Question
  ): Promise<ApiResponse<GameQuestion>> {
    try {
      let question = questionData

      if (!question) {
        // Get the question to randomize answers
        const questionResponse = await this.getQuestion(questionId)
        if (questionResponse.error || !questionResponse.data) {
          return questionResponse as ApiResponse<GameQuestion>
        }

        question = questionResponse.data
      }

      // Generate a deterministic seed based on game and question for consistent randomization
      const randomizationSeed = `${gameId}-${questionId}-${roundNumber}-${questionNumber}`
      const randomized = this.randomizeAnswers(question, randomizationSeed)

      // Store shuffled answers and correct position
      const shuffledAnswers = [
        randomized.answers.a,
        randomized.answers.b,
        randomized.answers.c,
        randomized.answers.d
      ].map(answer => typeof answer === 'string' ? answer : '')

      const correctPosition = ['a', 'b', 'c', 'd'].indexOf(randomized.correct_answer)

      const basePayload = {
        game_id: gameId,
        question_id: questionId,
        round_number: roundNumber,
        shuffled_answers: shuffledAnswers,
        correct_position: correctPosition
      }

      const attemptInsert = (positionField: 'question_order' | 'question_number') => (
        supabase
          .from('game_questions')
          .insert([{ ...basePayload, [positionField]: questionNumber }])
          .select()
          .single()
      )

      let insertResult = await attemptInsert('question_order')

      if (this.shouldRetryWithAlternateColumn(insertResult.error, 'question_order')) {
        insertResult = await attemptInsert('question_number')
      }

      if (insertResult.error || !insertResult.data) {
        const message = this.getErrorMessage(insertResult.error, 'Failed to insert game question')

        return {
          data: null,
          error: { message, code: 'DATABASE_ERROR', details: insertResult.error ?? undefined }
        }
      }

      const normalizedRecord = this.normalizeGameQuestionRecord(insertResult.data, questionNumber)

      return { data: normalizedRecord, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to add question to game', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  private static async clearExistingGameQuestions(gameId: string): Promise<ApiResponse<boolean>> {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('game_questions')
        .select('id')
        .eq('game_id', gameId)

      if (fetchError) {
        return {
          data: null,
          error: { message: fetchError.message, code: 'DATABASE_ERROR', details: fetchError }
        }
      }

      if (!existing || existing.length === 0) {
        return { data: true, error: null }
      }

      const { error: deleteError } = await supabase
        .from('game_questions')
        .delete()
        .eq('game_id', gameId)

      if (deleteError) {
        return {
          data: null,
          error: { message: deleteError.message, code: 'DATABASE_ERROR', details: deleteError }
        }
      }

      return { data: true, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to clear existing game questions', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get game question with randomized answers
  static async getGameQuestion(gameId: string, roundNumber: number, questionNumber: number): Promise<ApiResponse<QuestionWithAnswers>> {
    try {
      const fetchQuestion = (positionField: 'question_order' | 'question_number') => (
        supabase
          .from('game_questions')
          .select(`
            *,
            questions (*)
          `)
          .eq('game_id', gameId)
          .eq('round_number', roundNumber)
          .eq(positionField, questionNumber)
          .single()
      )

      let response = await fetchQuestion('question_order')

      if (this.shouldRetryWithAlternateColumn(response.error, 'question_order')) {
        response = await fetchQuestion('question_number')
      }

      if (response.error || !response.data) {
        const message = this.getErrorMessage(response.error, 'Question not found')

        return {
          data: null,
          error: { message, code: 'QUESTION_NOT_FOUND', details: response.error ?? undefined }
        }
      }

      const normalizedRecord = this.normalizeGameQuestionRecord(response.data, questionNumber) as GameQuestion & { questions: Question }
      const question = normalizedRecord.questions

      if (!question) {
        return {
          data: null,
          error: { message: 'Question data not found', code: 'QUESTION_DATA_NOT_FOUND' }
        }
      }

      // Use stored shuffled answers and correct position
      const shuffledAnswers = normalizedRecord.shuffled_answers
      const correctPosition = normalizedRecord.correct_position
      const correctLetter = ['a', 'b', 'c', 'd'][correctPosition]

      const questionWithAnswers: QuestionWithAnswers = {
        game_question_id: normalizedRecord.id,
        game_id: gameId,
        round_number: roundNumber,
        question_number: normalizedRecord.question_order,
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
        displayed_at: normalizedRecord.displayed_at,
        time_limit: normalizedRecord.time_limit ?? 30 // Default time limit when not stored
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
      const updateQuestion = (positionField: 'question_order' | 'question_number') => (
        supabase
          .from('game_questions')
          .update({
            displayed_at: new Date().toISOString()
          })
          .eq('game_id', gameId)
          .eq('round_number', roundNumber)
          .eq(positionField, questionNumber)
          .select()
          .single()
      )

      let response = await updateQuestion('question_order')

      if (this.shouldRetryWithAlternateColumn(response.error, 'question_order')) {
        response = await updateQuestion('question_number')
      }

      if (response.error || !response.data) {
        const message = this.getErrorMessage(response.error, 'Failed to mark question displayed')

        return {
          data: null,
          error: { message, code: 'DATABASE_ERROR', details: response.error ?? undefined }
        }
      }

      const normalizedRecord = this.normalizeGameQuestionRecord(response.data, questionNumber)

      return { data: normalizedRecord, error: null }
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

      // Ensure we start from a clean slate if questions already exist
      const clearResponse = await this.clearExistingGameQuestions(gameId)
      if (clearResponse.error) {
        return clearResponse
      }

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
          const response = await this.addQuestionToGame(gameId, question.id, round, questionNum, question)

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
      const usageResult = await this.markQuestionsAsUsed(hostId, gameId, selectedQuestions.map(q => q.id))
      if (usageResult.error) {
        return {
          data: null,
          error: usageResult.error
        }
      }

      return { data: gameQuestions, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to preselect questions', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Mark questions as used by host
  static async markQuestionsAsUsed(hostId: string, gameId: string, questionIds: string[]): Promise<ApiResponse<boolean>> {
    try {
      if (questionIds.length === 0) {
        return { data: true, error: null }
      }

      const timestamp = new Date().toISOString()
      const usageRecords = questionIds.map(questionId => ({
        host_id: hostId,
        question_id: questionId,
        used_in_game_id: gameId,
        used_at: timestamp
      }))

      const { error } = await supabase
        .from('question_usage')
        .upsert(usageRecords, { onConflict: 'host_id,question_id' })

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
      const fetchQuestions = (orderField: 'question_order' | 'question_number') => (
        supabase
          .from('game_questions')
          .select(`
            *,
            questions (*)
          `)
          .eq('game_id', gameId)
          .order('round_number', { ascending: true })
          .order(orderField, { ascending: true })
      )

      let response = await fetchQuestions('question_order')

      if (this.shouldRetryWithAlternateColumn(response.error, 'question_order')) {
        response = await fetchQuestions('question_number')
      }

      if (response.error) {
        const message = this.getErrorMessage(response.error, 'Failed to get game questions')

        return {
          data: null,
          error: { message, code: 'DATABASE_ERROR', details: response.error ?? undefined }
        }
      }

      const questionsWithAnswers = response.data?.map(gameQuestion => {
        const orderSource = gameQuestion as { question_order?: number | null; question_number?: number | null }
        const fallbackOrder = orderSource.question_order ?? orderSource.question_number ?? 1
        const normalizedRecord = this.normalizeGameQuestionRecord(gameQuestion, fallbackOrder) as GameQuestion & { questions: Question }
        const shuffledAnswers = normalizedRecord.shuffled_answers || []
        const correctLetter = ['a', 'b', 'c', 'd'][normalizedRecord.correct_position] as 'a' | 'b' | 'c' | 'd'

        return {
          game_question_id: normalizedRecord.id,
          game_id: gameId,
          round_number: normalizedRecord.round_number,
          question_number: normalizedRecord.question_order,
          question: normalizedRecord.questions.question,
          category: normalizedRecord.questions.category,
          difficulty: normalizedRecord.questions.difficulty,
          answers: {
            a: shuffledAnswers[0] ?? '',
            b: shuffledAnswers[1] ?? '',
            c: shuffledAnswers[2] ?? '',
            d: shuffledAnswers[3] ?? ''
          },
          correct_answer: correctLetter,
          displayed_at: normalizedRecord.displayed_at,
          time_limit: normalizedRecord.time_limit ?? 30
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
      const fetchPosition = (positionField: 'question_order' | 'question_number') => (
        supabase
          .from('game_questions')
          .select('correct_position')
          .eq('game_id', gameId)
          .eq('round_number', roundNumber)
          .eq(positionField, questionNumber)
          .single()
      )

      let response = await fetchPosition('question_order')

      if (this.shouldRetryWithAlternateColumn(response.error, 'question_order')) {
        response = await fetchPosition('question_number')
      }

      if (response.error || !response.data) {
        const message = this.getErrorMessage(response.error, 'Question not found')

        return {
          data: null,
          error: { message, code: 'QUESTION_NOT_FOUND', details: response.error ?? undefined }
        }
      }

      const correctPosition = (response.data as GameQuestion).correct_position
      const answerIndex = ['a', 'b', 'c', 'd'].indexOf(selectedAnswer)
      const isCorrect = answerIndex === correctPosition

      return {
        data: {
          isCorrect,
          correctAnswer: ['a', 'b', 'c', 'd'][correctPosition] as 'a' | 'b' | 'c' | 'd'
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
  private static normalizeGameQuestionRecord(record: Record<string, unknown>, fallbackOrder: number): GameQuestion {
    const recordWithFields = record as {
      question_order?: number | null
      question_number?: number | null
      shuffled_answers?: unknown
      time_limit?: number | null
    }

    const normalizedOrder = recordWithFields.question_order ?? recordWithFields.question_number ?? fallbackOrder
    const rawAnswers = Array.isArray(recordWithFields.shuffled_answers) ? recordWithFields.shuffled_answers : []
    const sanitizedAnswers = [0, 1, 2, 3].map(index => {
      const value = rawAnswers[index]
      return typeof value === 'string' ? value : ''
    })

    return {
      ...record,
      question_order: normalizedOrder,
      question_number: recordWithFields.question_number ?? normalizedOrder,
      shuffled_answers: sanitizedAnswers,
      time_limit: recordWithFields.time_limit ?? null
    } as GameQuestion
  }

  private static getErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === 'object') {
      const maybeMessage = (error as { message?: unknown }).message
      if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
        return maybeMessage
      }
    }

    if (typeof error === 'string' && error.trim().length > 0) {
      return error
    }

    return fallback
  }

  private static shouldRetryWithAlternateColumn(error: unknown, column: string): boolean {
    if (!error) {
      return false
    }

    const errorWithMetadata = error as { code?: unknown; message?: unknown }
    const code = typeof errorWithMetadata?.code === 'string' ? errorWithMetadata.code as string : ''
    const message = typeof errorWithMetadata?.message === 'string' ? errorWithMetadata.message as string : ''
    const lowered = message.toLowerCase()

    return code === '42703' ||
      lowered.includes(`column "${column.toLowerCase()}`) ||
      lowered.includes(`column '${column.toLowerCase()}`) ||
      lowered.includes(`${column.toLowerCase()} does not exist`)
  }

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