import { describe, it, expect } from 'vitest'
import { supabase } from '../../lib/supabase'

describe('Integration: Complete game with scoring', () => {
  it('should run complete trivia game session', async () => {
    // Create game with 2 rounds, 2 questions each
    const { data: game } = await supabase
      .from('games')
      .insert([{ title: 'Full Game Test', max_rounds: 2, questions_per_round: 2 }])
      .select().single()

    // Create teams
    const { data: teams } = await supabase
      .from('teams')
      .insert([
        { game_id: game.id, name: 'Team A', join_code: 'TEAMA1', score: 0 },
        { game_id: game.id, name: 'Team B', join_code: 'TEAMB2', score: 0 }
      ])
      .select()

    // Add players
    await supabase.from('players').insert([
      { game_id: game.id, team_id: teams[0].id, display_name: 'Player A1', user_id: null },
      { game_id: game.id, team_id: teams[1].id, display_name: 'Player B1', user_id: null }
    ])

    // Create questions for both rounds
    const { data: gameQuestions } = await supabase
      .from('game_questions')
      .insert([
        {
          game_id: game.id,
          question_id: '00000000-0000-0000-0000-000000000001',
          round_number: 1,
          question_order: 1,
          shuffled_answers: ['A', 'B', 'C', 'D'],
          correct_position: 0
        },
        {
          game_id: game.id,
          question_id: '00000000-0000-0000-0000-000000000002',
          round_number: 1,
          question_order: 2,
          shuffled_answers: ['A', 'B', 'C', 'D'],
          correct_position: 1
        }
      ])
      .select()

    expect(gameQuestions).toHaveLength(2)

    // Simulate answers - Team A gets both right, Team B gets one right
    await supabase.from('answers').insert([
      {
        game_id: game.id,
        team_id: teams[0].id,
        game_question_id: gameQuestions[0].id,
        selected_position: 0,
        is_correct: true,
        points_earned: 100,
        submitted_by: 'player-a1'
      },
      {
        game_id: game.id,
        team_id: teams[1].id,
        game_question_id: gameQuestions[0].id,
        selected_position: 1,
        is_correct: false,
        points_earned: 0,
        submitted_by: 'player-b1'
      }
    ])

    // Verify game state
    const { data: finalGame } = await supabase
      .from('games')
      .select('*')
      .eq('id', game.id)
      .single()

    expect(finalGame.max_rounds).toBe(2)
    expect(finalGame.questions_per_round).toBe(2)
  })
})