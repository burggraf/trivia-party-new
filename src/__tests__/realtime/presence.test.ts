import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { supabase } from '../../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

describe('Realtime: presence tracking', () => {
  let testGameId: string
  let presenceChannel: RealtimeChannel
  let receivedEvents: any[] = []

  beforeEach(async () => {
    testGameId = 'test-game-presence'
    presenceChannel = supabase.channel(`presence:game:${testGameId}`)
    receivedEvents = []

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        receivedEvents.push({ event: 'sync', state: presenceChannel.presenceState() })
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        receivedEvents.push({ event: 'join', key, presences: newPresences })
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        receivedEvents.push({ event: 'leave', key, presences: leftPresences })
      })
      .subscribe()

    await new Promise(resolve => setTimeout(resolve, 100))
  })

  afterEach(async () => {
    if (presenceChannel) {
      await supabase.removeChannel(presenceChannel)
    }
  })

  it('should track player online status', async () => {
    const playerPresence = {
      player_id: 'player-123',
      display_name: 'Test Player',
      team_id: 'team-456',
      team_name: 'Test Team',
      online_at: new Date().toISOString()
    }

    await presenceChannel.track(playerPresence)
    await new Promise(resolve => setTimeout(resolve, 100))

    const syncEvent = receivedEvents.find(e => e.event === 'sync')
    expect(syncEvent).toBeDefined()
    expect(Object.keys(syncEvent.state)).toContain('player-123')
  })

  it('should handle multiple players joining', async () => {
    const players = [
      { player_id: 'player-1', display_name: 'Alice' },
      { player_id: 'player-2', display_name: 'Bob' },
      { player_id: 'player-3', display_name: 'Charlie' }
    ]

    for (const player of players) {
      await presenceChannel.track(player)
    }

    await new Promise(resolve => setTimeout(resolve, 200))

    const state = presenceChannel.presenceState()
    expect(Object.keys(state)).toHaveLength(3)
    expect(state['player-1']).toBeDefined()
    expect(state['player-2']).toBeDefined()
    expect(state['player-3']).toBeDefined()
  })

  it('should detect when players leave', async () => {
    await presenceChannel.track({
      player_id: 'leaving-player',
      display_name: 'Leaving Player'
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    await presenceChannel.untrack()
    await new Promise(resolve => setTimeout(resolve, 100))

    const leaveEvent = receivedEvents.find(e => e.event === 'leave')
    expect(leaveEvent).toBeDefined()
  })
})