import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  UserPlus,
  Hash,
  AlertCircle,
  Smartphone,
  Crown,
  CheckCircle,
  RefreshCw
} from 'lucide-react'
import { GameService } from '../services/gameService'
import { TeamService } from '../services/teamService'
import { PlayerService } from '../services/playerService'
import type { Game } from '../types/game'
import type { Team } from '../types/team'
import type { Player } from '../types/player'

interface PlayerJoinProps {
  gameId: string
  onJoined: (player: Player, team: Team) => void
}

export const PlayerJoin: React.FC<PlayerJoinProps> = ({ gameId, onJoined }) => {
  const [game, setGame] = useState<Game | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [joinLoading, setJoinLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'join' | 'create'>('join')

  // Form states
  const [playerName, setPlayerName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [newTeamName, setNewTeamName] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)

  // Device ID for player identification
  const deviceId = React.useMemo(() => {
    let stored = localStorage.getItem('trivia-device-id')
    if (!stored) {
      stored = 'device-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now()
      localStorage.setItem('trivia-device-id', stored)
    }
    return stored
  }, [])

  useEffect(() => {
    console.log('PlayerJoin: useEffect triggered for loadGameData, gameId:', gameId)
    loadGameData()
  }, [gameId])

  useEffect(() => {
    // Check if player is already in this game
    console.log('PlayerJoin: useEffect triggered for checkExistingPlayer, gameId:', gameId, 'deviceId:', deviceId)
    if (gameId && deviceId) {
      checkExistingPlayer()
    }
  }, [gameId, deviceId])

  const loadGameData = async () => {
    try {
      console.log('PlayerJoin: Starting loadGameData for gameId:', gameId)

      const [gameResponse, teamsResponse] = await Promise.all([
        GameService.getGame(gameId),
        TeamService.getGameTeams(gameId)
      ])

      console.log('PlayerJoin: gameResponse:', gameResponse)
      console.log('PlayerJoin: teamsResponse:', teamsResponse)

      if (gameResponse.error || !gameResponse.data) {
        console.log('PlayerJoin: Game not found, error:', gameResponse.error)
        setError('Game not found')
        setIsLoading(false)
        return
      }

      console.log('PlayerJoin: Game found:', gameResponse.data)
      setGame(gameResponse.data)

      // Check if late joins are allowed
      if (gameResponse.data.status === 'active' && !gameResponse.data.settings?.allow_late_joins) {
        setError('This game has already started and does not allow late joins')
        setIsLoading(false)
        return
      }

      if (gameResponse.data.status === 'completed') {
        setError('This game has already ended')
        setIsLoading(false)
        return
      }

      if (teamsResponse.data) {
        setTeams(teamsResponse.data)
      }

      setIsLoading(false)
      console.log('PlayerJoin: loadGameData completed successfully')
    } catch (error) {
      console.error('PlayerJoin: Error in loadGameData:', error)
      setError('Failed to load game')
      setIsLoading(false)
    }
  }

  const checkExistingPlayer = async () => {
    try {
      console.log('PlayerJoin: Checking existing player for deviceId:', deviceId)
      const response = await PlayerService.getPlayerByDevice(deviceId)
      if (response.data) {
        console.log('PlayerJoin: Found existing player:', response.data)
        // Player already exists, check if they're in this game
        const teamResponse = await TeamService.getTeam(response.data.team_id)
        if (teamResponse.data && teamResponse.data.game_id === gameId) {
          console.log('PlayerJoin: Player already in this game, calling onJoined')
          onJoined(response.data, teamResponse.data)
        }
      } else {
        console.log('PlayerJoin: No existing player found')
      }
    } catch (error) {
      console.log('PlayerJoin: Error checking existing player (normal if no player exists):', error)
    }
  }

  const handleJoinExistingTeam = async () => {
    if (!selectedTeam || !playerName.trim()) return

    setJoinLoading(true)
    setError(null)

    try {
      // Check if name is available
      const nameAvailable = await TeamService.isTeamNameAvailable(selectedTeam.game_id, playerName)
      if (!nameAvailable) {
        setError('This player name is already taken in the selected team')
        setJoinLoading(false)
        return
      }

      // Join the team
      const response = await PlayerService.joinTeam({
        team_id: selectedTeam.id,
        name: playerName.trim(),
        device_id: deviceId
      })

      if (response.error) {
        setError(response.error.message)
      } else if (response.data) {
        onJoined(response.data, selectedTeam)
      }
    } catch (error) {
      setError('Failed to join team')
    } finally {
      setJoinLoading(false)
    }
  }

  const handleJoinByCode = async () => {
    if (!joinCode.trim() || !playerName.trim() || !game) return

    setJoinLoading(true)
    setError(null)

    try {
      // Find team by join code
      const teamResponse = await TeamService.getTeamByJoinCode(game.id, joinCode.trim())
      if (teamResponse.error) {
        setError('Invalid join code')
        setJoinLoading(false)
        return
      }

      const team = teamResponse.data!

      // Check if name is available
      const nameAvailable = await PlayerService.isPlayerNameAvailable(team.id, playerName)
      if (!nameAvailable) {
        setError('This player name is already taken in this team')
        setJoinLoading(false)
        return
      }

      // Join the team
      const response = await PlayerService.joinTeam({
        team_id: team.id,
        name: playerName.trim(),
        device_id: deviceId
      })

      if (response.error) {
        setError(response.error.message)
      } else if (response.data) {
        onJoined(response.data, team)
      }
    } catch (error) {
      setError('Failed to join team')
    } finally {
      setJoinLoading(false)
    }
  }

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !playerName.trim() || !game) return

    setJoinLoading(true)
    setError(null)

    try {
      // Check if team name is available
      const nameAvailable = await TeamService.isTeamNameAvailable(game.id, newTeamName)
      if (!nameAvailable) {
        setError('This team name is already taken')
        setJoinLoading(false)
        return
      }

      // Create team
      const teamResponse = await TeamService.createTeam({
        game_id: game.id,
        name: newTeamName.trim()
      })

      if (teamResponse.error) {
        setError(teamResponse.error.message)
        setJoinLoading(false)
        return
      }

      const team = teamResponse.data!

      // Join the team
      const playerResponse = await PlayerService.joinTeam({
        team_id: team.id,
        name: playerName.trim(),
        device_id: deviceId
      })

      if (playerResponse.error) {
        setError(playerResponse.error.message)
      } else if (playerResponse.data) {
        onJoined(playerResponse.data, team)
      }
    } catch (error) {
      setError('Failed to create team')
    } finally {
      setJoinLoading(false)
    }
  }

  console.log('PlayerJoin: Rendering - isLoading:', isLoading, 'game:', !!game, 'error:', error)

  if (isLoading) {
    console.log('PlayerJoin: Showing loading state')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Game not found'}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const canJoin = game.status === 'setup' || (game.status === 'active' && game.settings.allow_late_joins)

  if (!canJoin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Game Header */}
        <div className="text-center mb-8">
          <Smartphone className="h-12 w-12 mx-auto mb-4 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{game.title}</h1>
          <div className="flex items-center justify-center gap-2">
            <Badge variant={game.status === 'setup' ? 'secondary' : 'default'}>
              {game.status === 'setup' ? 'Setting Up' : 'Live Game'}
            </Badge>
            <span className="text-sm text-gray-600">•</span>
            <span className="text-sm text-gray-600">{teams.length} teams</span>
          </div>
        </div>

        {/* Player Name Input */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Your Name
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={30}
              className="text-lg"
            />
          </CardContent>
        </Card>

        {/* Join Options */}
        <Card>
          <CardHeader>
            <CardTitle>Join a Team</CardTitle>
            <CardDescription>
              Join an existing team or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'join' | 'create')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="join">Join Team</TabsTrigger>
                <TabsTrigger value="create">Create Team</TabsTrigger>
              </TabsList>

              {/* Join Existing Team */}
              <TabsContent value="join" className="space-y-4">
                {/* Join by Code */}
                <div className="space-y-3">
                  <Label>Team Join Code</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="ABCD"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="text-lg font-mono"
                    />
                    <Button
                      onClick={handleJoinByCode}
                      disabled={!playerName.trim() || !joinCode.trim() || joinLoading}
                      className="whitespace-nowrap"
                    >
                      {joinLoading ? 'Joining...' : 'Join'}
                    </Button>
                  </div>
                </div>

                {/* Existing Teams List */}
                {teams.length > 0 && (
                  <div className="space-y-3">
                    <Label>Or select a team</Label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {teams.map((team) => (
                        <div
                          key={team.id}
                          onClick={() => setSelectedTeam(team)}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedTeam?.id === team.id
                              ? 'bg-blue-50 border-blue-300'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">{team.name}</span>
                              </div>
                              {team.captain_id && (
                                <Crown className="h-4 w-4 text-yellow-500" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {team.join_code}
                              </Badge>
                              {selectedTeam?.id === team.id && (
                                <CheckCircle className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            0 players • {team.score} points
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={handleJoinExistingTeam}
                      disabled={!selectedTeam || !playerName.trim() || joinLoading}
                      className="w-full"
                    >
                      {joinLoading ? 'Joining...' : `Join ${selectedTeam?.name || 'Selected Team'}`}
                    </Button>
                  </div>
                )}

                {teams.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No teams have been created yet</p>
                    <p className="text-sm">Be the first to create one!</p>
                  </div>
                )}
              </TabsContent>

              {/* Create New Team */}
              <TabsContent value="create" className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="team-name">Team Name</Label>
                  <Input
                    id="team-name"
                    type="text"
                    placeholder="Awesome Team"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    maxLength={50}
                    className="text-lg"
                  />
                  <div className="text-sm text-gray-500">
                    You'll become the team captain
                  </div>
                </div>

                <Button
                  onClick={handleCreateTeam}
                  disabled={!newTeamName.trim() || !playerName.trim() || joinLoading}
                  className="w-full"
                >
                  {joinLoading ? 'Creating...' : 'Create Team'}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Game Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-1">
              <Hash className="h-4 w-4" />
              {game.max_rounds} rounds
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Max {game.settings.max_players_per_team} per team
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}