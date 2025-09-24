import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { supabase } from '../../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

describe('Realtime: team_answered events', () => {
  let testGameId: string
  let gameChannel: RealtimeChannel
  let teamChannel: RealtimeChannel
  let receivedEvents: any[] = []

  beforeEach(async () => {
    // Create test game
    const { data: gameData } = await supabase
      .from('games')
      .insert([{
        title: 'Test Game for Answer Events',
        max_rounds: 3,
        questions_per_round: 5,
        status: 'active'
      }])
      .select()
      .single()
    testGameId = gameData?.id

    // Set up realtime subscriptions
    gameChannel = supabase.channel(`game:${testGameId}`)
    teamChannel = supabase.channel(`team:test-team-id`)
    receivedEvents = []

    // Subscribe to game-wide answer events
    gameChannel
      .on('broadcast', { event: 'team_answered' }, (payload) => {
        receivedEvents.push({ channel: 'game', ...payload })
      })
      .subscribe()

    // Subscribe to team-specific events
    teamChannel
      .on('broadcast', { event: 'answer_locked' }, (payload) => {
        receivedEvents.push({ channel: 'team', ...payload })
      })
      .subscribe()

    await new Promise(resolve => setTimeout(resolve, 100))
  })

  afterEach(async () => {
    if (gameChannel) {
      await supabase.removeChannel(gameChannel)
    }
    if (teamChannel) {
      await supabase.removeChannel(teamChannel)
    }
  })

  it('should broadcast when team submits answer', async () => {
    const answerEvent = {
      game_id: testGameId,
      team_id: 'test-team-id',
      team_name: 'Team Alpha',
      game_question_id: '12345678-1234-1234-1234-123456789012',
      submitted_by: 'Player Name',
      timestamp: new Date().toISOString()
    }

    await gameChannel.send({
      type: 'broadcast',
      event: 'team_answered',
      payload: answerEvent
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    const gameEvent = receivedEvents.find(e => e.channel === 'game')
    expect(gameEvent).toBeDefined()
    expect(gameEvent.payload.team_id).toBe('test-team-id')
    expect(gameEvent.payload.team_name).toBe('Team Alpha')
    expect(gameEvent.payload.submitted_by).toBe('Player Name')
  })

  it('should broadcast answer lock to team members', async () => {
    const lockEvent = {
      team_id: 'test-team-id',
      game_question_id: '12345678-1234-1234-1234-123456789012',
      selected_position: 2,
      submitted_by: 'Player Alice',
      timestamp: new Date().toISOString()
    }

    await teamChannel.send({
      type: 'broadcast',
      event: 'answer_locked',
      payload: lockEvent
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    const teamEvent = receivedEvents.find(e => e.channel === 'team')
    expect(teamEvent).toBeDefined()
    expect(teamEvent.payload.selected_position).toBe(2)
    expect(teamEvent.payload.submitted_by).toBe('Player Alice')
  })

  it('should include required fields in team_answered events', async () => {
    const answerEvent = {
      game_id: testGameId,
      team_id: 'team-uuid-123',
      team_name: 'The Quizzards',
      game_question_id: 'question-uuid-456',
      submitted_by: 'Captain Quiz',
      timestamp: new Date().toISOString()
    }

    await gameChannel.send({
      type: 'broadcast',
      event: 'team_answered',
      payload: answerEvent
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    const event = receivedEvents[0]?.payload
    expect(event.game_id).toBeDefined()
    expect(event.team_id).toBeDefined()
    expect(event.team_name).toBeDefined()
    expect(event.game_question_id).toBeDefined()
    expect(event.submitted_by).toBeDefined()
    expect(event.timestamp).toBeDefined()
  })

  it('should handle multiple teams answering same question', async () => {
    const teams = [
      {
        game_id: testGameId,
        team_id: 'team-1',
        team_name: 'Team Alpha',
        game_question_id: 'question-1',
        submitted_by: 'Alice',
        timestamp: new Date().toISOString()
      },
      {
        game_id: testGameId,
        team_id: 'team-2',
        team_name: 'Team Beta',
        game_question_id: 'question-1',
        submitted_by: 'Bob',
        timestamp: new Date().toISOString()
      },
      {
        game_id: testGameId,
        team_id: 'team-3',
        team_name: 'Team Gamma',
        game_question_id: 'question-1',
        submitted_by: 'Charlie',
        timestamp: new Date().toISOString()
      }
    ]

    for (const team of teams) {
      await gameChannel.send({
        type: 'broadcast',
        event: 'team_answered',
        payload: team
      })
    }

    await new Promise(resolve => setTimeout(resolve, 200))

    const gameEvents = receivedEvents.filter(e => e.channel === 'game')
    expect(gameEvents).toHaveLength(3)
    expect(gameEvents[0].payload.team_name).toBe('Team Alpha')
    expect(gameEvents[1].payload.team_name).toBe('Team Beta')
    expect(gameEvents[2].payload.team_name).toBe('Team Gamma')
  })

  it('should maintain answer submission order', async () => {
    const submissions = [
      { team_name: 'First Team', submitted_by: 'Player 1', order: 1 },
      { team_name: 'Second Team', submitted_by: 'Player 2', order: 2 },
      { team_name: 'Third Team', submitted_by: 'Player 3', order: 3 }
    ]

    for (const submission of submissions) {
      await gameChannel.send({
        type: 'broadcast',
        event: 'team_answered',
        payload: {
          game_id: testGameId,
          team_id: `team-${submission.order}`,
          team_name: submission.team_name,
          game_question_id: 'question-order-test',
          submitted_by: submission.submitted_by,
          timestamp: new Date().toISOString()
        }
      })
    }

    await new Promise(resolve => setTimeout(resolve, 200))

    const gameEvents = receivedEvents.filter(e => e.channel === 'game')
    expect(gameEvents).toHaveLength(3)
    expect(gameEvents[0].payload.team_name).toBe('First Team')
    expect(gameEvents[1].payload.team_name).toBe('Second Team')
    expect(gameEvents[2].payload.team_name).toBe('Third Team')
  })

  it('should validate answer position in lock events', async () => {
    const validPositions = [0, 1, 2, 3]

    for (const position of validPositions) {
      await teamChannel.send({
        type: 'broadcast',
        event: 'answer_locked',
        payload: {
          team_id: 'test-team-id',
          game_question_id: 'question-position-test',
          selected_position: position,
          submitted_by: `Player ${position}`,
          timestamp: new Date().toISOString()
        }
      })
    }

    await new Promise(resolve => setTimeout(resolve, 200))

    const teamEvents = receivedEvents.filter(e => e.channel === 'team')
    expect(teamEvents).toHaveLength(4)

    teamEvents.forEach((event, index) => {
      expect(event.payload.selected_position).toBe(index)
      expect([0, 1, 2, 3]).toContain(event.payload.selected_position)
    })
  })

  it('should handle rapid answer submissions', async () => {
    const rapidSubmissions = Array.from({ length: 10 }, (_, i) => ({
      game_id: testGameId,
      team_id: `rapid-team-${i}`,
      team_name: `Rapid Team ${i}`,
      game_question_id: 'rapid-question',
      submitted_by: `Player ${i}`,
      timestamp: new Date().toISOString()
    }))

    // Send all submissions rapidly
    const promises = rapidSubmissions.map(submission =>
      gameChannel.send({
        type: 'broadcast',
        event: 'team_answered',
        payload: submission
      })
    )

    await Promise.all(promises)
    await new Promise(resolve => setTimeout(resolve, 300))

    const gameEvents = receivedEvents.filter(e => e.channel === 'game')
    expect(gameEvents.length).toBe(10)

    // Verify all submissions were received
    const teamIds = gameEvents.map(e => e.payload.team_id)
    expect(teamIds).toHaveLength(10)
    expect(new Set(teamIds).size).toBe(10) // All unique
  })

  it('should handle team channel subscriptions for specific teams', async () => {
    const specificTeamChannel = supabase.channel('team:specific-team-123')
    const specificEvents: any[] = []

    specificTeamChannel
      .on('broadcast', { event: 'answer_locked' }, (payload) => {
        specificEvents.push(payload)
      })
      .subscribe()

    await new Promise(resolve => setTimeout(resolve, 100))

    // Send event to specific team
    await specificTeamChannel.send({
      type: 'broadcast',
      event: 'answer_locked',
      payload: {
        team_id: 'specific-team-123',
        game_question_id: 'specific-question',
        selected_position: 1,
        submitted_by: 'Specific Player',
        timestamp: new Date().toISOString()
      }
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(specificEvents).toHaveLength(1)
    expect(specificEvents[0].payload.team_id).toBe('specific-team-123')

    await supabase.removeChannel(specificTeamChannel)
  })

  it('should handle network interruption during answer submission', async () => {
    // Submit initial answer
    await gameChannel.send({
      type: 'broadcast',
      event: 'team_answered',
      payload: {
        game_id: testGameId,
        team_id: 'persistent-team',
        team_name: 'Persistent Team',
        game_question_id: 'interruption-question',
        submitted_by: 'Persistent Player',
        timestamp: new Date().toISOString()
      }
    })

    // Simulate disconnect and reconnect
    await supabase.removeChannel(gameChannel)

    gameChannel = supabase.channel(`game:${testGameId}`)
    gameChannel
      .on('broadcast', { event: 'team_answered' }, (payload) => {
        receivedEvents.push({ channel: 'game', ...payload })
      })
      .subscribe()

    await new Promise(resolve => setTimeout(resolve, 100))

    // Submit answer after reconnection
    await gameChannel.send({
      type: 'broadcast',
      event: 'team_answered',
      payload: {
        game_id: testGameId,
        team_id: 'reconnected-team',
        team_name: 'Reconnected Team',
        game_question_id: 'post-interruption-question',
        submitted_by: 'Reconnected Player',
        timestamp: new Date().toISOString()
      }
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    const gameEvents = receivedEvents.filter(e => e.channel === 'game')
    expect(gameEvents.length).toBeGreaterThanOrEqual(1)

    const reconnectedEvent = gameEvents.find(e =>
      e.payload.team_name === 'Reconnected Team'
    )
    expect(reconnectedEvent).toBeDefined()
  })
})