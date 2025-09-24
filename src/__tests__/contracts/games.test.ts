import { describe, it, expect, beforeEach } from 'vitest'
import { supabase } from '../../lib/supabase'

describe('POST /games - Game Creation Contract', () => {
  beforeEach(async () => {
    // Clear test data (when we have write access)
    // For now, this will fail until we implement the actual API
  })

  it('should create a new game with valid data', async () => {
    const gameData = {
      title: 'Test Trivia Night',
      max_rounds: 3,
      questions_per_round: 5,
      settings: {
        allowLateJoins: true,
        timePerQuestion: 30,
        pointsPerCorrect: 100
      }
    }

    // This will fail until we implement the games table and API
    const { data, error } = await supabase
      .from('games')
      .insert([gameData])
      .select()
      .single()

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.id).toBeDefined()
    expect(data.title).toBe(gameData.title)
    expect(data.status).toBe('setup')
    expect(data.max_rounds).toBe(gameData.max_rounds)
    expect(data.questions_per_round).toBe(gameData.questions_per_round)
    expect(data.current_round).toBe(1)
    expect(data.current_question).toBe(1)
    expect(data.created_at).toBeDefined()
    expect(data.host_id).toBeDefined()
  })

  it('should reject game with invalid title length', async () => {
    const invalidGameData = {
      title: 'ab', // Too short (min 3 chars)
      max_rounds: 3,
      questions_per_round: 5
    }

    const { data, error } = await supabase
      .from('games')
      .insert([invalidGameData])
      .select()

    expect(error).toBeDefined()
    expect(data).toBeNull()
  })

  it('should reject game with invalid rounds count', async () => {
    const invalidGameData = {
      title: 'Valid Title',
      max_rounds: 25, // Too many (max 20)
      questions_per_round: 5
    }

    const { data, error } = await supabase
      .from('games')
      .insert([invalidGameData])
      .select()

    expect(error).toBeDefined()
    expect(data).toBeNull()
  })

  it('should set default values correctly', async () => {
    const minimalGameData = {
      title: 'Minimal Game',
      max_rounds: 2,
      questions_per_round: 3
    }

    const { data, error } = await supabase
      .from('games')
      .insert([minimalGameData])
      .select()
      .single()

    expect(error).toBeNull()
    expect(data.status).toBe('setup')
    expect(data.current_round).toBe(1)
    expect(data.current_question).toBe(1)
    expect(data.settings).toBeDefined()
    expect(data.settings.allowLateJoins).toBe(true)
    expect(data.settings.pointsPerCorrect).toBe(100)
  })

  it('should require authentication for game creation', async () => {
    // Sign out to test unauthenticated access
    await supabase.auth.signOut()

    const gameData = {
      title: 'Unauthorized Game',
      max_rounds: 3,
      questions_per_round: 5
    }

    const { data, error } = await supabase
      .from('games')
      .insert([gameData])
      .select()

    expect(error).toBeDefined()
    expect(error?.message).toContain('authentication')
    expect(data).toBeNull()
  })
})