import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  Trophy,
  Crown,
  Medal,
  Users,
  Target,
  TrendingUp,
  RefreshCw,
  Clock,
  Hash,
  Zap
} from 'lucide-react'
import { TeamService } from '../services/teamService'
import { AnswerService } from '../services/answerService'
import { supabase } from '../lib/supabase'
import type { Game } from '../types/game'
import type { LeaderboardEntry } from '../types/team'

interface LeaderboardProps {
  game: Game
  teamId?: string // Highlight specific team
  showFullStats?: boolean
  autoRefresh?: boolean
  className?: string
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  game,
  teamId,
  showFullStats = true,
  autoRefresh = true,
  className = ''
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [gameStats, setGameStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    loadLeaderboard()

    if (autoRefresh) {
      // Set up realtime subscriptions
      const leaderboardChannel = supabase.channel(`leaderboard-component:${game.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `game_id=eq.${game.id}`
        }, async (payload) => {
          console.log('Leaderboard - team update received:', payload)
          loadLeaderboard()
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'answers'
        }, async (payload) => {
          console.log('Leaderboard - answer update received:', payload)
          loadLeaderboard()
        })
        .subscribe()

      return () => {
        leaderboardChannel.unsubscribe()
      }
    }
  }, [game.id, autoRefresh])

  const loadLeaderboard = async () => {
    try {
      const [leaderboardResponse, statsResponse] = await Promise.all([
        TeamService.getLeaderboard(game.id),
        showFullStats ? AnswerService.getGameAnswerStats(game.id) : Promise.resolve({ data: null })
      ])

      if (leaderboardResponse.data) {
        setLeaderboard(leaderboardResponse.data)
      }

      if (statsResponse.data) {
        setGameStats(statsResponse.data)
      }

      setLastUpdated(new Date())
      setIsLoading(false)
    } catch (error) {
      console.error('Failed to load leaderboard:', error)
      setIsLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Medal className="h-5 w-5 text-orange-500" />
      default:
        return (
          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
            {rank}
          </div>
        )
    }
  }

  const getRankStyle = (rank: number, isHighlighted: boolean) => {
    const baseStyle = "transition-all duration-200 hover:shadow-md"

    if (isHighlighted) {
      return `${baseStyle} bg-blue-50 border-blue-200 shadow-md`
    }

    switch (rank) {
      case 1:
        return `${baseStyle} bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200`
      case 2:
        return `${baseStyle} bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200`
      case 3:
        return `${baseStyle} bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200`
      default:
        return `${baseStyle} bg-white border-gray-200`
    }
  }

  const calculateAccuracy = (entry: LeaderboardEntry) => {
    return entry.total_count > 0 ? Math.round((entry.correct_count / entry.total_count) * 100) : 0
  }

  const getProgressColor = (accuracy: number) => {
    if (accuracy >= 80) return 'bg-green-500'
    if (accuracy >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (isLoading && leaderboard.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading leaderboard...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Leaderboard Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                Leaderboard
              </CardTitle>
              <CardDescription>
                {leaderboard.length} teams • Updated {lastUpdated.toLocaleTimeString()}
              </CardDescription>
            </div>
            {!autoRefresh && (
              <Button onClick={loadLeaderboard} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Game Statistics */}
        {showFullStats && gameStats && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{gameStats.totalAnswers}</div>
                <div className="text-sm text-muted-foreground">Total Answers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{gameStats.correctAnswers}</div>
                <div className="text-sm text-muted-foreground">Correct</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(gameStats.averageResponseTime)}s
                </div>
                <div className="text-sm text-muted-foreground">Avg Response</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {gameStats.totalAnswers > 0
                    ? Math.round((gameStats.correctAnswers / gameStats.totalAnswers) * 100)
                    : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Overall Accuracy</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Leaderboard Entries */}
      <div className="space-y-3">
        {leaderboard.map((entry, index) => {
          const isHighlighted = teamId === entry.team.id
          const accuracy = calculateAccuracy(entry)
          const maxScore = leaderboard[0]?.score || 1
          const scorePercentage = (entry.score / maxScore) * 100

          return (
            <Card
              key={entry.team.id}
              className={getRankStyle(entry.rank, isHighlighted)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  {/* Team Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-3">
                      {getRankIcon(entry.rank)}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{entry.team.name}</h3>
                          {isHighlighted && (
                            <Badge variant="secondary" size="sm">Your Team</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {entry.player_count} players
                          </div>
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {entry.correct_count}/{entry.total_count} correct
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {accuracy}% accuracy
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900">{entry.score}</div>
                    <div className="text-sm text-muted-foreground">points</div>
                  </div>
                </div>

                {/* Progress Bars */}
                {showFullStats && (
                  <div className="mt-4 space-y-2">
                    {/* Score Progress */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Score Progress</span>
                        <span>{Math.round(scorePercentage)}% of leader</span>
                      </div>
                      <Progress
                        value={scorePercentage}
                        className="h-2"
                      />
                    </div>

                    {/* Accuracy Progress */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Accuracy</span>
                        <span>{accuracy}%</span>
                      </div>
                      <Progress
                        value={accuracy}
                        className="h-2"
                        style={{
                          background: `linear-gradient(to right, ${
                            accuracy >= 80 ? 'rgb(34, 197, 94)' :
                            accuracy >= 60 ? 'rgb(234, 179, 8)' : 'rgb(239, 68, 68)'
                          } 0%, rgb(229, 231, 235) ${accuracy}%)`
                        } as any}
                      />
                    </div>
                  </div>
                )}

                {/* Special Badges */}
                <div className="flex items-center gap-2 mt-3">
                  {entry.rank === 1 && leaderboard.length > 1 && (
                    <Badge className="gap-1 bg-yellow-500 hover:bg-yellow-600">
                      <Crown className="h-3 w-3" />
                      Leading
                    </Badge>
                  )}
                  {accuracy === 100 && entry.total_count > 0 && (
                    <Badge className="gap-1 bg-green-500 hover:bg-green-600">
                      <Zap className="h-3 w-3" />
                      Perfect
                    </Badge>
                  )}
                  {entry.correct_count > 0 && entry.total_count > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Hash className="h-3 w-3" />
                      {((entry.correct_count / entry.total_count) * 100).toFixed(0)}%
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}

        {leaderboard.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                No Scores Yet
              </h3>
              <p className="text-sm text-muted-foreground">
                {game.status === 'setup'
                  ? 'Scores will appear once the game starts'
                  : 'Teams will appear here as they answer questions'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Game Progress Info */}
      {showFullStats && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Hash className="h-4 w-4" />
                Round {game.current_round} of {game.max_rounds}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Question {game.current_question} of {game.questions_per_round}
              </div>
              <Badge variant="outline" className={
                game.status === 'active' ? 'border-green-200 text-green-800' :
                game.status === 'setup' ? 'border-yellow-200 text-yellow-800' :
                game.status === 'paused' ? 'border-orange-200 text-orange-800' :
                'border-gray-200 text-gray-800'
              }>
                {game.status.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}