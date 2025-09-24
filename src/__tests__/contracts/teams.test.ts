import { describe, it, expect, beforeEach } from 'vitest'
import { supabase } from '../../lib/supabase'

describe('POST /games/{id}/teams - Team Creation Contract', () => {
  let testGameId: string

  beforeEach(async () => {
    // Create a test game for team creation
    const { data } = await supabase
      .from('games')
      .insert([{
        title: 'Test Game for Teams',
        max_rounds: 3,
        questions_per_round: 5
      }])
      .select()
      .single()

    testGameId = data?.id
  })

  it('should create team with valid name', async () => {
    const teamData = {
      game_id: testGameId,
      name: 'Team Alpha',
      join_code: 'ABC123' // Normally auto-generated
    }

    const { data, error } = await supabase
      .from('teams')
      .insert([teamData])
      .select()
      .single()

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.id).toBeDefined()
    expect(data.name).toBe('Team Alpha')
    expect(data.game_id).toBe(testGameId)
    expect(data.join_code).toBe('ABC123')
    expect(data.score).toBe(0) // Default value
    expect(data.created_at).toBeDefined()
  })

  it('should reject duplicate team names in same game', async () => {
    // Create first team
    await supabase
      .from('teams')
      .insert([{
        game_id: testGameId,
        name: 'Duplicate Name',
        join_code: 'ABC123'
      }])

    // Try to create second team with same name
    const { data, error } = await supabase
      .from('teams')
      .insert([{
        game_id: testGameId,
        name: 'Duplicate Name',
        join_code: 'DEF456'
      }])
      .select()

    expect(error).toBeDefined()
    expect(error?.message).toContain('unique')
    expect(data).toBeNull()
  })

  it('should reject duplicate join codes in same game', async () => {
    // Create first team
    await supabase
      .from('teams')
      .insert([{
        game_id: testGameId,
        name: 'Team One',
        join_code: 'SAME12'
      }])

    // Try to create second team with same join code
    const { data, error } = await supabase
      .from('teams')
      .insert([{
        game_id: testGameId,
        name: 'Team Two',
        join_code: 'SAME12'
      }])
      .select()

    expect(error).toBeDefined()
    expect(error?.message).toContain('unique')
    expect(data).toBeNull()
  })

  it('should reject invalid team name length', async () => {
    const invalidTeamData = {
      game_id: testGameId,
      name: 'X', // Too short (min 2 chars)
      join_code: 'ABC123'
    }

    const { data, error } = await supabase
      .from('teams')
      .insert([invalidTeamData])
      .select()

    expect(error).toBeDefined()
    expect(data).toBeNull()
  })

  it('should reject invalid join code format', async () => {
    const invalidTeamData = {
      game_id: testGameId,
      name: 'Valid Name',
      join_code: 'ABC' // Too short (must be 6 chars)
    }

    const { data, error } = await supabase
      .from('teams')
      .insert([invalidTeamData])
      .select()

    expect(error).toBeDefined()
    expect(data).toBeNull()
  })

  it('should allow teams with same name in different games', async () => {
    // Create second game
    const { data: game2 } = await supabase
      .from('games')
      .insert([{
        title: 'Second Game',
        max_rounds: 2,
        questions_per_round: 3
      }])
      .select()
      .single()

    // Create team in first game
    await supabase
      .from('teams')
      .insert([{
        game_id: testGameId,
        name: 'Common Name',
        join_code: 'ABC123'
      }])

    // Create team with same name in second game (should succeed)
    const { data, error } = await supabase
      .from('teams')
      .insert([{
        game_id: game2.id,
        name: 'Common Name',
        join_code: 'DEF456'
      }])
      .select()
      .single()

    expect(error).toBeNull()
    expect(data.name).toBe('Common Name')
    expect(data.game_id).toBe(game2.id)
  })

  it('should set captain when specified', async () => {
    // First create a player
    const { data: playerData } = await supabase
      .from('players')
      .insert([{
        game_id: testGameId,
        display_name: 'Captain Player',
        user_id: null
      }])
      .select()
      .single()

    // Create team with captain
    const teamData = {
      game_id: testGameId,
      name: 'Captained Team',
      join_code: 'CAP123',
      captain_id: playerData.id
    }

    const { data, error } = await supabase
      .from('teams')
      .insert([teamData])
      .select()
      .single()

    expect(error).toBeNull()
    expect(data.captain_id).toBe(playerData.id)
  })

  it('should prevent team creation for non-existent game', async () => {
    const fakeGameId = '00000000-0000-0000-0000-000000000000'

    const teamData = {
      game_id: fakeGameId,
      name: 'Invalid Team',
      join_code: 'INV123'
    }

    const { data, error } = await supabase
      .from('teams')
      .insert([teamData])
      .select()

    expect(error).toBeDefined()
    expect(data).toBeNull()
  })
})