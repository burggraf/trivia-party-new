import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { supabase } from '../../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

describe('Realtime: question_displayed events', () => {
  let testGameId: string
  let gameChannel: RealtimeChannel
  let receivedEvents: any[] = []

  beforeEach(async () => {
    // Create test game
    const { data: gameData } = await supabase
      .from('games')
      .insert([{
        title: 'Test Game for Question Events',
        max_rounds: 3,
        questions_per_round: 5,
        status: 'active'
      }])
      .select()
      .single()
    testGameId = gameData?.id

    // Set up realtime subscription
    gameChannel = supabase.channel(`game:${testGameId}`)
    receivedEvents = []

    gameChannel
      .on('broadcast', { event: 'question_displayed' }, (payload) => {
        receivedEvents.push(payload)
      })
      .on('broadcast', { event: 'question_completed' }, (payload) => {
        receivedEvents.push(payload)
      })
      .subscribe()

    await new Promise(resolve => setTimeout(resolve, 100))
  })

  afterEach(async () => {
    if (gameChannel) {
      await supabase.removeChannel(gameChannel)
    }
  })

  it('should broadcast when question is displayed', async () => {
    const questionEvent = {
      game_id: testGameId,
      game_question_id: '12345678-1234-1234-1234-123456789012',
      round_number: 1,
      question_order: 1,
      question: {
        text: 'What is the capital of France?',
        category: 'Geography',
        difficulty: 'easy',
        answers: ['London', 'Berlin', 'Paris', 'Madrid']
      },
      time_limit: 30,
      timestamp: new Date().toISOString()
    }

    await gameChannel.send({
      type: 'broadcast',
      event: 'question_displayed',
      payload: questionEvent
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(receivedEvents).toHaveLength(1)
    expect(receivedEvents[0].payload.game_id).toBe(testGameId)
    expect(receivedEvents[0].payload.question.text).toBe('What is the capital of France?')
    expect(receivedEvents[0].payload.question.answers).toHaveLength(4)
  })

  it('should include all required question fields', async () => {
    const questionEvent = {
      game_id: testGameId,
      game_question_id: '12345678-1234-1234-1234-123456789012',
      round_number: 2,
      question_order: 3,
      question: {
        text: 'Which planet is closest to the Sun?',
        category: 'Science',
        difficulty: 'medium',
        answers: ['Venus', 'Mercury', 'Earth', 'Mars']
      },
      time_limit: 45,
      timestamp: new Date().toISOString()
    }

    await gameChannel.send({
      type: 'broadcast',
      event: 'question_displayed',
      payload: questionEvent
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    const event = receivedEvents[0]?.payload
    expect(event.game_id).toBeDefined()
    expect(event.game_question_id).toBeDefined()
    expect(event.round_number).toBe(2)
    expect(event.question_order).toBe(3)
    expect(event.question.text).toBeDefined()
    expect(event.question.category).toBeDefined()
    expect(event.question.difficulty).toBeDefined()
    expect(event.question.answers).toHaveLength(4)
    expect(event.time_limit).toBe(45)
    expect(event.timestamp).toBeDefined()
  })

  it('should handle questions with no time limit', async () => {
    const questionEvent = {
      game_id: testGameId,
      game_question_id: '12345678-1234-1234-1234-123456789013',
      round_number: 1,
      question_order: 1,
      question: {
        text: 'What is 2 + 2?',
        category: 'Math',
        difficulty: 'easy',
        answers: ['3', '4', '5', '6']
      },
      time_limit: 0, // Unlimited time
      timestamp: new Date().toISOString()
    }

    await gameChannel.send({
      type: 'broadcast',
      event: 'question_displayed',
      payload: questionEvent
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(receivedEvents[0].payload.time_limit).toBe(0)
  })

  it('should broadcast when question is completed', async () => {
    const completedEvent = {
      game_id: testGameId,
      game_question_id: '12345678-1234-1234-1234-123456789012',
      correct_position: 2,
      correct_answer: 'Paris',
      team_results: [
        {
          team_id: 'team1-uuid',
          team_name: 'Team Alpha',
          selected_position: 2,
          is_correct: true,
          points_earned: 100,
          response_time: 12.5
        },
        {
          team_id: 'team2-uuid',
          team_name: 'Team Beta',
          selected_position: 0,
          is_correct: false,
          points_earned: 0,
          response_time: 8.2
        }
      ],
      timestamp: new Date().toISOString()
    }

    await gameChannel.send({
      type: 'broadcast',
      event: 'question_completed',
      payload: completedEvent
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(receivedEvents).toHaveLength(1)
    expect(receivedEvents[0].payload.correct_position).toBe(2)
    expect(receivedEvents[0].payload.correct_answer).toBe('Paris')
    expect(receivedEvents[0].payload.team_results).toHaveLength(2)
  })

  it('should include team performance data in completed events', async () => {
    const completedEvent = {
      game_id: testGameId,
      game_question_id: '12345678-1234-1234-1234-123456789012',
      correct_position: 1,
      correct_answer: 'Mercury',
      team_results: [
        {
          team_id: 'team1-uuid',
          team_name: 'Team Alpha',
          selected_position: 1,
          is_correct: true,
          points_earned: 150,
          response_time: 15.3
        }
      ],
      timestamp: new Date().toISOString()
    }

    await gameChannel.send({
      type: 'broadcast',
      event: 'question_completed',
      payload: completedEvent
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    const teamResult = receivedEvents[0].payload.team_results[0]
    expect(teamResult.team_id).toBeDefined()
    expect(teamResult.team_name).toBe('Team Alpha')
    expect(teamResult.selected_position).toBe(1)
    expect(teamResult.is_correct).toBe(true)
    expect(teamResult.points_earned).toBe(150)
    expect(teamResult.response_time).toBe(15.3)
  })

  it('should handle questions with no team responses', async () => {
    const completedEvent = {
      game_id: testGameId,
      game_question_id: '12345678-1234-1234-1234-123456789012',
      correct_position: 3,
      correct_answer: 'Madrid',
      team_results: [], // No teams answered
      timestamp: new Date().toISOString()
    }

    await gameChannel.send({
      type: 'broadcast',
      event: 'question_completed',
      payload: completedEvent
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(receivedEvents[0].payload.team_results).toHaveLength(0)
    expect(receivedEvents[0].payload.correct_position).toBe(3)
  })

  it('should maintain question order within rounds', async () => {
    const questions = [
      {
        game_id: testGameId,
        game_question_id: 'q1-uuid',
        round_number: 1,
        question_order: 1,
        question: { text: 'Question 1', answers: ['A', 'B', 'C', 'D'] },
        timestamp: new Date().toISOString()
      },
      {
        game_id: testGameId,
        game_question_id: 'q2-uuid',
        round_number: 1,
        question_order: 2,
        question: { text: 'Question 2', answers: ['A', 'B', 'C', 'D'] },
        timestamp: new Date().toISOString()
      },
      {
        game_id: testGameId,
        game_question_id: 'q3-uuid',
        round_number: 1,
        question_order: 3,
        question: { text: 'Question 3', answers: ['A', 'B', 'C', 'D'] },
        timestamp: new Date().toISOString()
      }
    ]

    for (const question of questions) {
      await gameChannel.send({
        type: 'broadcast',
        event: 'question_displayed',
        payload: question
      })
    }

    await new Promise(resolve => setTimeout(resolve, 200))

    expect(receivedEvents).toHaveLength(3)
    expect(receivedEvents[0].payload.question_order).toBe(1)
    expect(receivedEvents[1].payload.question_order).toBe(2)
    expect(receivedEvents[2].payload.question_order).toBe(3)
  })

  it('should validate answer array has exactly 4 options', async () => {
    const questionEvent = {
      game_id: testGameId,
      game_question_id: '12345678-1234-1234-1234-123456789012',
      round_number: 1,
      question_order: 1,
      question: {
        text: 'Test question?',
        category: 'Test',
        difficulty: 'easy',
        answers: ['Option A', 'Option B', 'Option C', 'Option D']
      },
      time_limit: 30,
      timestamp: new Date().toISOString()
    }

    await gameChannel.send({
      type: 'broadcast',
      event: 'question_displayed',
      payload: questionEvent
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(receivedEvents[0].payload.question.answers).toHaveLength(4)
    expect(receivedEvents[0].payload.question.answers).toEqual([
      'Option A', 'Option B', 'Option C', 'Option D'
    ])
  })
})