import { describe, it, expect, beforeEach } from 'vitest'
import { supabase } from '../../lib/supabase'

describe('GET /games/{id} - Game Retrieval Contract', () => {
  let testGameId: string

  beforeEach(async () => {
    // This will fail until we have the games table implemented
    // Create a test game for retrieval tests
    const { data } = await supabase
      .from('games')
      .insert([{
        title: 'Test Game for Retrieval',
        max_rounds: 3,
        questions_per_round: 5
      }])
      .select()
      .single()

    testGameId = data?.id
  })

  it('should retrieve game by valid ID', async () => {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', testGameId)
      .single()

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.id).toBe(testGameId)
    expect(data.title).toBe('Test Game for Retrieval')
    expect(data.status).toBe('setup')
    expect(data.host_id).toBeDefined()
    expect(data.created_at).toBeDefined()
  })

  it('should return null for non-existent game ID', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000'

    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', fakeId)
      .single()

    expect(data).toBeNull()
    expect(error).toBeDefined()
  })

  it('should include game settings in response', async () => {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', testGameId)
      .single()

    expect(error).toBeNull()
    expect(data.settings).toBeDefined()
    expect(typeof data.settings).toBe('object')
    expect(data.settings.allowLateJoins).toBeDefined()
    expect(data.settings.pointsPerCorrect).toBeDefined()
  })

  it('should respect RLS policies for game access', async () => {
    // Sign out to test anonymous access
    await supabase.auth.signOut()

    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', testGameId)
      .single()

    // Anonymous users should only see active/completed games
    // Setup games should not be visible
    expect(data).toBeNull()
  })

  it('should allow access to active games for anonymous users', async () => {
    // First update game to active status
    await supabase
      .from('games')
      .update({ status: 'active' })
      .eq('id', testGameId)

    // Sign out to test anonymous access
    await supabase.auth.signOut()

    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', testGameId)
      .single()

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.status).toBe('active')
  })

  it('should validate UUID format for game ID', async () => {
    const invalidId = 'not-a-uuid'

    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', invalidId)
      .single()

    expect(error).toBeDefined()
    expect(data).toBeNull()
  })
})