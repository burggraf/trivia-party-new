import { describe, it, expect } from 'vitest'
import { supabase } from '../../lib/supabase'

describe('Integration: Players join teams and answer questions', () => {
  it('should complete full player workflow', async () => {
    // Setup game and question
    const { data: game } = await supabase
      .from('games')
      .insert([{ title: 'Player Test Game', max_rounds: 1, questions_per_round: 1 }])
      .select().single()

    const { data: team } = await supabase
      .from('teams')
      .insert([{ game_id: game.id, name: 'Test Team', join_code: 'TEST12' }])
      .select().single()

    // Player joins game and team
    const { data: player } = await supabase
      .from('players')
      .insert([{
        game_id: game.id,
        team_id: team.id,
        display_name: 'Test Player',
        user_id: null
      }])
      .select().single()

    expect(player.team_id).toBe(team.id)

    // Question displayed
    const { data: gameQuestion } = await supabase
      .from('game_questions')
      .insert([{
        game_id: game.id,
        question_id: '00000000-0000-0000-0000-000000000001',
        round_number: 1,
        question_order: 1,
        shuffled_answers: ['A', 'B', 'C', 'D'],
        correct_position: 2
      }])
      .select().single()

    // Player submits answer
    const { data: answer, error: answerError } = await supabase
      .from('answers')
      .insert([{
        game_id: game.id,
        team_id: team.id,
        game_question_id: gameQuestion.id,
        selected_position: 2,
        is_correct: true,
        points_earned: 100,
        submitted_by: player.id
      }])
      .select().single()

    expect(answerError).toBeNull()
    expect(answer.is_correct).toBe(true)
  })
})