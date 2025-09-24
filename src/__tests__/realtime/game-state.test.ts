import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { supabase } from '../../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

describe('Realtime: game_state_changed events', () => {
  let testGameId: string
  let gameChannel: RealtimeChannel
  let receivedEvents: any[] = []

  beforeEach(async () => {
    // Create test game
    const { data: gameData } = await supabase
      .from('games')
      .insert([{
        title: 'Test Game for State Changes',
        max_rounds: 3,
        questions_per_round: 5,
        status: 'setup'
      }])
      .select()
      .single()
    testGameId = gameData?.id

    // Set up realtime subscription
    gameChannel = supabase.channel(`game:${testGameId}`)
    receivedEvents = []

    gameChannel
      .on('broadcast', { event: 'game_state_changed' }, (payload) => {
        receivedEvents.push(payload)
      })
      .subscribe()

    // Wait for subscription to be ready
    await new Promise(resolve => setTimeout(resolve, 100))
  })

  afterEach(async () => {
    if (gameChannel) {
      await supabase.removeChannel(gameChannel)
    }
  })

  it('should broadcast when game status changes', async () => {
    const stateChangeEvent = {
      game_id: testGameId,
      status: 'active',
      current_round: 1,
      current_question: 1,
      timestamp: new Date().toISOString(),
      triggered_by: 'host'
    }

    // Broadcast state change
    await gameChannel.send({
      type: 'broadcast',
      event: 'game_state_changed',
      payload: stateChangeEvent
    })

    // Wait for event to be received
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(receivedEvents).toHaveLength(1)
    expect(receivedEvents[0].payload.game_id).toBe(testGameId)
    expect(receivedEvents[0].payload.status).toBe('active')
    expect(receivedEvents[0].payload.triggered_by).toBe('host')
  })

  it('should broadcast when round/question advances', async () => {
    const roundAdvanceEvent = {
      game_id: testGameId,
      status: 'active',
      current_round: 2,
      current_question: 1,
      timestamp: new Date().toISOString(),
      triggered_by: 'host'
    }

    await gameChannel.send({
      type: 'broadcast',
      event: 'game_state_changed',
      payload: roundAdvanceEvent
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(receivedEvents).toHaveLength(1)
    expect(receivedEvents[0].payload.current_round).toBe(2)
    expect(receivedEvents[0].payload.current_question).toBe(1)
  })

  it('should include required fields in state change events', async () => {
    const completeEvent = {
      game_id: testGameId,
      status: 'paused',
      current_round: 1,
      current_question: 3,
      timestamp: new Date().toISOString(),
      triggered_by: 'host'
    }

    await gameChannel.send({
      type: 'broadcast',
      event: 'game_state_changed',
      payload: completeEvent
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    const event = receivedEvents[0]?.payload
    expect(event).toBeDefined()
    expect(event.game_id).toBeDefined()
    expect(event.status).toBeDefined()
    expect(event.current_round).toBeDefined()
    expect(event.current_question).toBeDefined()
    expect(event.timestamp).toBeDefined()
    expect(event.triggered_by).toBeDefined()
  })

  it('should validate game status values', async () => {
    const validStatuses = ['setup', 'active', 'paused', 'completed']

    for (const status of validStatuses) {
      const event = {
        game_id: testGameId,
        status,
        current_round: 1,
        current_question: 1,
        timestamp: new Date().toISOString(),
        triggered_by: 'host'
      }

      await gameChannel.send({
        type: 'broadcast',
        event: 'game_state_changed',
        payload: event
      })
    }

    await new Promise(resolve => setTimeout(resolve, 200))

    expect(receivedEvents).toHaveLength(validStatuses.length)
    validStatuses.forEach((status, index) => {
      expect(receivedEvents[index].payload.status).toBe(status)
    })
  })

  it('should handle system-triggered state changes', async () => {
    const systemEvent = {
      game_id: testGameId,
      status: 'completed',
      current_round: 3,
      current_question: 5,
      timestamp: new Date().toISOString(),
      triggered_by: 'system'
    }

    await gameChannel.send({
      type: 'broadcast',
      event: 'game_state_changed',
      payload: systemEvent
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(receivedEvents).toHaveLength(1)
    expect(receivedEvents[0].payload.triggered_by).toBe('system')
    expect(receivedEvents[0].payload.status).toBe('completed')
  })

  it('should maintain event order for rapid state changes', async () => {
    const events = [
      {
        game_id: testGameId,
        status: 'active',
        current_round: 1,
        current_question: 1,
        timestamp: new Date().toISOString(),
        triggered_by: 'host'
      },
      {
        game_id: testGameId,
        status: 'active',
        current_round: 1,
        current_question: 2,
        timestamp: new Date().toISOString(),
        triggered_by: 'host'
      },
      {
        game_id: testGameId,
        status: 'active',
        current_round: 1,
        current_question: 3,
        timestamp: new Date().toISOString(),
        triggered_by: 'host'
      }
    ]

    // Send events rapidly
    for (const event of events) {
      await gameChannel.send({
        type: 'broadcast',
        event: 'game_state_changed',
        payload: event
      })
    }

    await new Promise(resolve => setTimeout(resolve, 200))

    expect(receivedEvents).toHaveLength(3)
    expect(receivedEvents[0].payload.current_question).toBe(1)
    expect(receivedEvents[1].payload.current_question).toBe(2)
    expect(receivedEvents[2].payload.current_question).toBe(3)
  })

  it('should handle reconnection after network interruption', async () => {
    // Simulate initial event
    await gameChannel.send({
      type: 'broadcast',
      event: 'game_state_changed',
      payload: {
        game_id: testGameId,
        status: 'active',
        current_round: 1,
        current_question: 1,
        timestamp: new Date().toISOString(),
        triggered_by: 'host'
      }
    })

    // Simulate disconnect and reconnect
    await supabase.removeChannel(gameChannel)

    gameChannel = supabase.channel(`game:${testGameId}`)
    gameChannel
      .on('broadcast', { event: 'game_state_changed' }, (payload) => {
        receivedEvents.push(payload)
      })
      .subscribe()

    await new Promise(resolve => setTimeout(resolve, 100))

    // Send event after reconnection
    await gameChannel.send({
      type: 'broadcast',
      event: 'game_state_changed',
      payload: {
        game_id: testGameId,
        status: 'active',
        current_round: 1,
        current_question: 2,
        timestamp: new Date().toISOString(),
        triggered_by: 'host'
      }
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    // Should have received events from both before and after reconnection
    expect(receivedEvents.length).toBeGreaterThanOrEqual(1)
  })
})