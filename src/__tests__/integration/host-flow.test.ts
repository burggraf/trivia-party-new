import { describe, it, expect } from 'vitest'
import { supabase } from '../../lib/supabase'

describe('Integration: Host creates and starts game', () => {
  it('should complete full host workflow', async () => {
    // This test will fail until implementation is complete
    // 1. Host creates game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert([{
        title: 'Integration Test Game',
        max_rounds: 2,
        questions_per_round: 3
      }])
      .select()
      .single()

    expect(gameError).toBeNull()
    expect(game.status).toBe('setup')

    // 2. Host starts game
    const { error: updateError } = await supabase
      .from('games')
      .update({ status: 'active' })
      .eq('id', game.id)

    expect(updateError).toBeNull()

    // 3. Host displays first question
    const { data: gameQuestion } = await supabase
      .from('game_questions')
      .insert([{
        game_id: game.id,
        question_id: '00000000-0000-0000-0000-000000000001',
        round_number: 1,
        question_order: 1,
        shuffled_answers: ['A', 'B', 'C', 'D'],
        correct_position: 0,
        displayed_at: new Date().toISOString()
      }])
      .select()
      .single()

    expect(gameQuestion).toBeDefined()
  })
})