import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Crown,
  Users,
  UserMinus,
  Settings,
  Share2,
  Copy,
  AlertCircle,
  CheckCircle,
  UserCheck,
  Clock,
  Trophy,
  Hash,
  Wifi,
  WifiOff
} from 'lucide-react'
import { TeamService } from '../services/teamService'
import { PlayerService } from '../services/playerService'
import type { Game } from '../types/game'
import type { Team } from '../types/team'
import type { Player, PlayerWithPresence } from '../types/player'

interface TeamManagerProps {
  game: Game
  team: Team
  currentPlayer: Player
  onTeamUpdated?: (team: Team) => void
  onPlayerLeft?: () => void
}

export const TeamManager: React.FC<TeamManagerProps> = ({
  game,
  team,
  currentPlayer,
  onTeamUpdated,
  onPlayerLeft
}) => {
  const [players, setPlayers] = useState<PlayerWithPresence[]>([])
  const [teamStats, setTeamStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  const isTeamCaptain = team.captain_id === currentPlayer.id
  const canMakeChanges = game.settings.allow_team_changes && (game.status === 'setup' || game.settings.allow_late_joins)

  useEffect(() => {
    loadTeamData()
    const interval = setInterval(loadTeamData, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [team.id])

  const loadTeamData = async () => {
    try {
      const [playersResponse, statsResponse] = await Promise.all([
        PlayerService.getTeamPlayers(team.id),
        TeamService.getTeamStats(team.id)
      ])

      if (playersResponse.data) {
        // Convert to PlayerWithPresence format
        const now = new Date()
        const playersWithPresence = playersResponse.data.map(player => {
          const lastActivity = new Date(player.last_activity)
          const minutesSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60)

          return {
            ...player,
            presence_status: player.is_online && minutesSinceActivity < 5 ? 'online' :
                            minutesSinceActivity < 15 ? 'away' : 'offline',
            minutes_since_activity: Math.floor(minutesSinceActivity)
          } as PlayerWithPresence
        })

        setPlayers(playersWithPresence)
      }

      if (statsResponse.data) {
        setTeamStats(statsResponse.data)
      }

      setIsLoading(false)
    } catch (error) {
      setError('Failed to load team data')
      setIsLoading(false)
    }
  }

  const handleMakeCaptain = async (playerId: string) => {
    if (!isTeamCaptain) return

    try {
      const response = await TeamService.setTeamCaptain(team.id, playerId)
      if (response.error) {
        setError(response.error.message)
      } else {
        onTeamUpdated?.(response.data!)
        await loadTeamData()
      }
    } catch (error) {
      setError('Failed to make player captain')
    }
  }

  const handleLeaveTeam = async () => {
    try {
      const response = await PlayerService.leaveTeam(currentPlayer.id)
      if (response.error) {
        setError(response.error.message)
      } else {
        onPlayerLeft?.()
      }
    } catch (error) {
      setError('Failed to leave team')
    }
  }

  const handleCopyJoinCode = async () => {
    try {
      await navigator.clipboard.writeText(team.join_code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch (error) {
      setError('Failed to copy join code')
    }
  }

  const getPresenceIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Wifi className="h-4 w-4 text-green-500" />
      case 'away':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'offline':
        return <WifiOff className="h-4 w-4 text-gray-400" />
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />
    }
  }

  const getPresenceText = (player: PlayerWithPresence) => {
    switch (player.presence_status) {
      case 'online':
        return 'Online'
      case 'away':
        return `Away (${player.minutes_since_activity}m ago)`
      case 'offline':
        return `Offline (${player.minutes_since_activity}m ago)`
      default:
        return 'Unknown'
    }
  }

  const joinUrl = `${window.location.origin}/join/${game.id}`

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">Loading team data...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Team Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {team.name}
              </CardTitle>
              <CardDescription>
                Team {team.join_code} • {players.length} players
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Players to Your Team</DialogTitle>
                    <DialogDescription>
                      Share this code or link with other players
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold font-mono bg-muted p-4 rounded-lg mb-2">
                        {team.join_code}
                      </div>
                      <Button
                        onClick={handleCopyJoinCode}
                        variant="outline"
                        className="gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        {copiedCode ? 'Copied!' : 'Copy Code'}
                      </Button>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Or share this link:</p>
                      <div className="bg-muted p-2 rounded text-sm break-all">
                        {joinUrl}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Team Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{team.score}</div>
              <div className="text-sm text-muted-foreground">Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {teamStats?.correctAnswers || 0}
              </div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {teamStats?.totalAnswers || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {teamStats?.totalAnswers > 0
                  ? Math.round((teamStats.correctAnswers / teamStats.totalAnswers) * 100)
                  : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </div>
          </div>

          {/* Team Status */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Hash className="h-4 w-4" />
              Max {game.settings.max_players_per_team} players
            </div>
            {isTeamCaptain && (
              <Badge variant="secondary" className="gap-1">
                <Crown className="h-3 w-3" />
                Captain
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members ({players.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {player.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{player.name}</span>
                      {team.captain_id === player.id && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                      {player.id === currentPlayer.id && (
                        <Badge variant="outline" size="sm">You</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      {getPresenceIcon(player.presence_status)}
                      {getPresenceText(player)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isTeamCaptain && player.id !== currentPlayer.id && canMakeChanges && (
                    <Button
                      onClick={() => handleMakeCaptain(player.id)}
                      variant="outline"
                      size="sm"
                      className="gap-1"
                    >
                      <Crown className="h-3 w-3" />
                      Make Captain
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {players.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No players in this team yet</p>
              </div>
            )}

            {players.length < game.settings.max_players_per_team && (
              <div className="text-center py-4 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                <div className="text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {game.settings.max_players_per_team - players.length} more players can join
                  </p>
                  <p className="text-xs mt-1">
                    Share code: <span className="font-mono font-bold">{team.join_code}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Actions */}
      {canMakeChanges && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Team Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isTeamCaptain && players.length > 1 && (
                <Alert>
                  <Crown className="h-4 w-4" />
                  <AlertDescription>
                    As team captain, you can make other players captain or manage the team.
                    You cannot leave the team while you're the captain.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowShareDialog(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Invite Players
                </Button>

                {(!isTeamCaptain || players.length === 1) && (
                  <Button
                    onClick={handleLeaveTeam}
                    variant="destructive"
                    className="gap-2"
                  >
                    <UserMinus className="h-4 w-4" />
                    Leave Team
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Game Status Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              {game.status === 'setup' && (
                <>
                  <Clock className="h-4 w-4" />
                  Waiting for game to start
                </>
              )}
              {game.status === 'active' && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Game is live! Round {game.current_round} • Question {game.current_question}
                </>
              )}
              {game.status === 'paused' && (
                <>
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  Game is paused
                </>
              )}
              {game.status === 'completed' && (
                <>
                  <Trophy className="h-4 w-4 text-purple-500" />
                  Game completed
                </>
              )}
            </div>

            {game.status === 'setup' && (
              <p className="text-xs text-muted-foreground">
                Make sure all your team members have joined before the host starts the game
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}