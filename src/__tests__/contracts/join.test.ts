import { describe, it, expect, beforeEach } from 'vitest'
import { supabase } from '../../lib/supabase'

describe('POST /games/{id}/join - Player Joining Contract', () => {
  let testGameId: string

  beforeEach(async () => {
    // Create a test game for joining
    const { data } = await supabase
      .from('games')
      .insert([{
        title: 'Test Game for Joining',
        max_rounds: 3,
        questions_per_round: 5,
        status: 'setup'
      }])
      .select()
      .single()

    testGameId = data?.id
  })

  it('should allow player to join game with valid display name', async () => {
    const playerData = {
      game_id: testGameId,
      display_name: 'TestPlayer1',
      user_id: null // Anonymous player
    }

    const { data, error } = await supabase
      .from('players')
      .insert([playerData])
      .select()
      .single()

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.id).toBeDefined()
    expect(data.display_name).toBe('TestPlayer1')
    expect(data.game_id).toBe(testGameId)
    expect(data.is_online).toBe(false) // Default value
    expect(data.joined_at).toBeDefined()
  })

  it('should reject duplicate display names in same game', async () => {
    // Add first player
    await supabase
      .from('players')
      .insert([{
        game_id: testGameId,
        display_name: 'DuplicateName',
        user_id: null
      }])

    // Try to add second player with same name
    const { data, error } = await supabase
      .from('players')
      .insert([{
        game_id: testGameId,
        display_name: 'DuplicateName',
        user_id: null
      }])
      .select()

    expect(error).toBeDefined()
    expect(error?.message).toContain('unique')
    expect(data).toBeNull()
  })

  it('should reject invalid display name length', async () => {
    const invalidPlayerData = {
      game_id: testGameId,
      display_name: 'X', // Too short (min 2 chars)
      user_id: null
    }

    const { data, error } = await supabase
      .from('players')
      .insert([invalidPlayerData])
      .select()

    expect(error).toBeDefined()
    expect(data).toBeNull()
  })

  it('should allow joining with team code', async () => {
    // First create a team
    const { data: teamData } = await supabase
      .from('teams')
      .insert([{
        game_id: testGameId,
        name: 'Test Team',
        join_code: 'ABC123'
      }])
      .select()
      .single()

    // Then join player to that team
    const playerData = {
      game_id: testGameId,
      display_name: 'TeamPlayer',
      team_id: teamData.id,
      user_id: null
    }

    const { data, error } = await supabase
      .from('players')
      .insert([playerData])
      .select()
      .single()

    expect(error).toBeNull()
    expect(data.team_id).toBe(teamData.id)
  })

  it('should prevent joining non-existent game', async () => {
    const fakeGameId = '00000000-0000-0000-0000-000000000000'

    const playerData = {
      game_id: fakeGameId,
      display_name: 'TestPlayer',
      user_id: null
    }

    const { data, error } = await supabase
      .from('players')
      .insert([playerData])
      .select()

    expect(error).toBeDefined()
    expect(data).toBeNull()
  })

  it('should prevent joining completed games when late joins disabled', async () => {
    // Update game to completed status and disable late joins
    await supabase
      .from('games')
      .update({
        status: 'completed',
        settings: { allowLateJoins: false }
      })
      .eq('id', testGameId)

    const playerData = {
      game_id: testGameId,
      display_name: 'LatePlayer',
      user_id: null
    }

    const { data, error } = await supabase
      .from('players')
      .insert([playerData])
      .select()

    // This should be blocked by application logic (not just database)
    expect(error).toBeDefined()
  })

  it('should set correct default values for new players', async () => {
    const playerData = {
      game_id: testGameId,
      display_name: 'DefaultsPlayer',
      user_id: null
    }

    const { data, error } = await supabase
      .from('players')
      .insert([playerData])
      .select()
      .single()

    expect(error).toBeNull()
    expect(data.is_online).toBe(false)
    expect(data.team_id).toBeNull()
    expect(data.joined_at).toBeDefined()
    expect(data.last_seen).toBeDefined()
  })
})