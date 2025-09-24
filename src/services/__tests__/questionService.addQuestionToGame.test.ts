import { describe, expect, it, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { QuestionService } from '../questionService'
import type { Question, RandomizedQuestion } from '../../types/question'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn()
  }
}))

const { supabase } = await import('../../lib/supabase')

describe('QuestionService.addQuestionToGame', () => {
  const baseQuestion: Question = {
    id: 'question-id',
    category: 'General',
    subcategory: null,
    difficulty: 'medium',
    question: 'What is the answer?',
    a: 'Answer A',
    b: 'Answer B',
    c: 'Answer C',
    d: 'Answer D',
    level: null,
    metadata: null,
    created_at: null,
    updated_at: null
  }

  const randomizedQuestion: RandomizedQuestion = {
    id: baseQuestion.id,
    question: baseQuestion.question,
    category: baseQuestion.category,
    difficulty: baseQuestion.difficulty,
    answers: {
      a: 'Answer A',
      b: 'Answer B',
      c: 'Answer C',
      d: 'Answer D'
    },
    correct_answer: 'b',
    original_correct: 'a',
    randomization_seed: 'seed',
    created_at: baseQuestion.created_at
  }

  const mockRandomize = vi.spyOn(QuestionService, 'randomizeAnswers')

  beforeEach(() => {
    mockRandomize.mockReturnValue(randomizedQuestion)

    ;(supabase.rpc as unknown as Mock).mockReset()
    ;(supabase.from as unknown as Mock).mockReset()
  })

  afterEach(() => {
    mockRandomize.mockReset()
  })

  it('uses the RPC helper when available', async () => {
    const rpcRecord = {
      id: 'game-question-id',
      game_id: 'game-id',
      question_id: baseQuestion.id,
      round_number: 1,
      question_order: 2,
      shuffled_answers: ['Answer A', 'Answer B', 'Answer C', 'Answer D'],
      correct_position: 1
    }

    ;(supabase.rpc as unknown as Mock).mockResolvedValue({ data: rpcRecord, error: null })

    const response = await QuestionService.addQuestionToGame('game-id', baseQuestion.id, 1, 2, baseQuestion)

    expect(response.error).toBeNull()
    expect(response.data?.question_order).toBe(2)
    expect(supabase.rpc).toHaveBeenCalledWith('prepare_game_question', {
      game_id: 'game-id',
      question_id: baseQuestion.id,
      round_number: 1,
      question_number: 2,
      shuffled_answers: ['Answer A', 'Answer B', 'Answer C', 'Answer D'],
      correct_position: 1
    })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('falls back to direct insert when RPC is unavailable', async () => {
    ;(supabase.rpc as unknown as Mock).mockResolvedValue({
      data: null,
      error: { message: 'function prepare_game_question does not exist', code: 'PGRST102' }
    })

    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'fallback-id',
        game_id: 'game-id',
        question_id: baseQuestion.id,
        round_number: 1,
        question_order: 2,
        shuffled_answers: ['Answer A', 'Answer B', 'Answer C', 'Answer D'],
        correct_position: 1
      },
      error: null
    })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    ;(supabase.from as unknown as Mock).mockReturnValue({ insert })

    const response = await QuestionService.addQuestionToGame('game-id', baseQuestion.id, 1, 2, baseQuestion)

    expect(response.error).toBeNull()
    expect(response.data?.id).toBe('fallback-id')
    expect(insert).toHaveBeenCalledWith([
      {
        game_id: 'game-id',
        question_id: baseQuestion.id,
        round_number: 1,
        shuffled_answers: ['Answer A', 'Answer B', 'Answer C', 'Answer D'],
        correct_position: 1,
        question_order: 2
      }
    ])
  })

  it('returns an error when RPC fails with a real database issue', async () => {
    ;(supabase.rpc as unknown as Mock).mockResolvedValue({
      data: null,
      error: { message: 'Not authorized', code: '42501' }
    })

    const response = await QuestionService.addQuestionToGame('game-id', baseQuestion.id, 1, 2, baseQuestion)

    expect(response.data).toBeNull()
    expect(response.error?.message).toBe('Not authorized')
    expect(supabase.from).not.toHaveBeenCalled()
  })
})
