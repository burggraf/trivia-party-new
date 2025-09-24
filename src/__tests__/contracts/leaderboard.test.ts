import { describe, it, expect, beforeEach } from 'vitest'
import { supabase } from '../../lib/supabase'

describe('GET /games/{id}/leaderboard - Leaderboard Contract', () => {
  let testGameId: string
  let team1Id: string
  let team2Id: string
  let team3Id: string

  beforeEach(async () => {
    // Create test game
    const { data: gameData } = await supabase
      .from('games')
      .insert([{
        title: 'Test Game for Leaderboard',
        max_rounds: 2,
        questions_per_round: 2
      }])
      .select()
      .single()
    testGameId = gameData?.id

    // Create teams with different scores
    const { data: teams } = await supabase
      .from('teams')
      .insert([
        {
          game_id: testGameId,
          name: 'Team Alpha',
          join_code: 'ALPHA1',
          score: 250
        },
        {
          game_id: testGameId,
          name: 'Team Beta',
          join_code: 'BETA12',
          score: 150
        },
        {
          game_id: testGameId,
          name: 'Team Gamma',
          join_code: 'GAMMA3',
          score: 300
        }
      ])
      .select()

    team1Id = teams?.[0]?.id // Alpha - 250 points
    team2Id = teams?.[1]?.id // Beta - 150 points
    team3Id = teams?.[2]?.id // Gamma - 300 points
  })

  it('should return teams ordered by score descending', async () => {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('game_id', testGameId)
      .order('score', { ascending: false })

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data).toHaveLength(3)

    // Should be ordered: Gamma (300), Alpha (250), Beta (150)
    expect(data[0].name).toBe('Team Gamma')
    expect(data[0].score).toBe(300)
    expect(data[1].name).toBe('Team Alpha')
    expect(data[1].score).toBe(250)
    expect(data[2].name).toBe('Team Beta')
    expect(data[2].score).toBe(150)
  })

  it('should calculate team statistics from answers', async () => {
    // Create game questions
    const { data: gameQuestions } = await supabase
      .from('game_questions')
      .insert([
        {
          game_id: testGameId,
          question_id: '00000000-0000-0000-0000-000000000001',
          round_number: 1,
          question_order: 1,
          shuffled_answers: ['A', 'B', 'C', 'D'],
          correct_position: 0
        },
        {
          game_id: testGameId,
          question_id: '00000000-0000-0000-0000-000000000002',
          round_number: 1,
          question_order: 2,
          shuffled_answers: ['A', 'B', 'C', 'D'],
          correct_position: 1
        }
      ])
      .select()

    // Create players
    const { data: players } = await supabase
      .from('players')
      .insert([
        {
          game_id: testGameId,
          team_id: team1Id,
          display_name: 'Player Alpha',
          user_id: null
        },
        {
          game_id: testGameId,
          team_id: team2Id,
          display_name: 'Player Beta',
          user_id: null
        }
      ])
      .select()

    // Create answers - Team Alpha gets both right, Team Beta gets one right
    await supabase
      .from('answers')
      .insert([
        {
          game_id: testGameId,
          team_id: team1Id,
          game_question_id: gameQuestions[0].id,
          selected_position: 0,
          is_correct: true,
          points_earned: 100,
          submitted_by: players[0].id
        },
        {
          game_id: testGameId,
          team_id: team1Id,
          game_question_id: gameQuestions[1].id,
          selected_position: 1,
          is_correct: true,
          points_earned: 100,
          submitted_by: players[0].id
        },
        {
          game_id: testGameId,
          team_id: team2Id,
          game_question_id: gameQuestions[0].id,
          selected_position: 1,
          is_correct: false,
          points_earned: 0,
          submitted_by: players[1].id
        },
        {
          game_id: testGameId,
          team_id: team2Id,
          game_question_id: gameQuestions[1].id,
          selected_position: 1,
          is_correct: true,
          points_earned: 100,
          submitted_by: players[1].id
        }
      ])

    // Query team statistics
    const { data, error } = await supabase
      .from('answers')
      .select(`
        team_id,
        teams:team_id (name, score),
        is_correct,
        points_earned
      `)
      .eq('game_id', testGameId)

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data).toHaveLength(4) // 4 total answers

    // Team Alpha should have 2 correct answers
    const alphaAnswers = data.filter(a => a.team_id === team1Id)
    expect(alphaAnswers).toHaveLength(2)
    expect(alphaAnswers.every(a => a.is_correct)).toBe(true)

    // Team Beta should have 1 correct answer
    const betaAnswers = data.filter(a => a.team_id === team2Id)
    expect(betaAnswers).toHaveLength(2)
    expect(betaAnswers.filter(a => a.is_correct)).toHaveLength(1)
  })

  it('should handle teams with no answers', async () => {
    // Query leaderboard including teams without answers
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        answers (
          is_correct,
          points_earned
        )
      `)
      .eq('game_id', testGameId)
      .order('score', { ascending: false })

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data).toHaveLength(3)

    // All teams should be present even without answers
    data.forEach(team => {
      expect(team.id).toBeDefined()
      expect(team.name).toBeDefined()
      expect(team.score).toBeGreaterThanOrEqual(0)
    })
  })

  it('should return empty array for non-existent game', async () => {
    const fakeGameId = '00000000-0000-0000-0000-000000000000'

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('game_id', fakeGameId)
      .order('score', { ascending: false })

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data).toHaveLength(0)
  })

  it('should calculate ranking correctly for tied scores', async () => {
    // Update two teams to have same score
    await supabase
      .from('teams')
      .update({ score: 200 })
      .in('id', [team1Id, team2Id])

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('game_id', testGameId)
      .order('score', { ascending: false })
      .order('created_at', { ascending: true }) // Tiebreaker

    expect(error).toBeNull()
    expect(data).toBeDefined()

    // Gamma should still be first (300), then the tied teams
    expect(data[0].score).toBe(300)
    expect(data[1].score).toBe(200)
    expect(data[2].score).toBe(200)
  })

  it('should include team member count in leaderboard', async () => {
    // Add players to teams
    await supabase
      .from('players')
      .insert([
        {
          game_id: testGameId,
          team_id: team1Id,
          display_name: 'Alpha Player 1',
          user_id: null
        },
        {
          game_id: testGameId,
          team_id: team1Id,
          display_name: 'Alpha Player 2',
          user_id: null
        },
        {
          game_id: testGameId,
          team_id: team2Id,
          display_name: 'Beta Player 1',
          user_id: null
        }
      ])

    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        players (count)
      `)
      .eq('game_id', testGameId)

    expect(error).toBeNull()
    expect(data).toBeDefined()

    const alphaTeam = data.find(t => t.id === team1Id)
    const betaTeam = data.find(t => t.id === team2Id)
    const gammaTeam = data.find(t => t.id === team3Id)

    expect(alphaTeam?.players).toHaveLength(2)
    expect(betaTeam?.players).toHaveLength(1)
    expect(gammaTeam?.players).toHaveLength(0)
  })
})