import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Play,
  Pause,
  Square,
  SkipForward,
  Users,
  Trophy,
  Clock,
  Hash,
  AlertCircle,
  CheckCircle,
  Settings,
  Monitor,
  RefreshCw
} from 'lucide-react'
import { GameService } from '../services/gameService'
import { TeamService } from '../services/teamService'
import { QuestionService } from '../services/questionService'
import { AnswerService } from '../services/answerService'
import { isDemoMode, demoGame, demoTeams, demoLeaderboard, demoCurrentQuestion, demoAnswerBreakdown, createDemoResponse } from '../lib/demoData'
import type { Game } from '../types/game'
import type { Team, LeaderboardEntry } from '../types/team'
import type { QuestionWithAnswers } from '../types/question'

interface HostDashboardProps {
  gameId: string
  onShowTVDisplay: () => void
}

export const HostDashboard: React.FC<HostDashboardProps> = ({ gameId, onShowTVDisplay }) => {
  const [game, setGame] = useState<Game | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<QuestionWithAnswers | null>(null)
  const [answerBreakdown, setAnswerBreakdown] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadGameData()
    const interval = setInterval(loadGameData, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [gameId])

  useEffect(() => {
    if (game && game.status === 'active') {
      loadCurrentQuestion()
      loadAnswerBreakdown()
    }
  }, [game])

  const loadGameData = async () => {
    try {
      console.log('isDemoMode():', isDemoMode())
      if (isDemoMode()) {
        console.log('Using demo data')
        // Use demo data
        setGame(demoGame)
        setTeams(demoTeams)
        setLeaderboard(demoLeaderboard)
        setIsLoading(false)
        return
      }

      const [gameResponse, teamsResponse, leaderboardResponse] = await Promise.all([
        GameService.getGame(gameId),
        TeamService.getGameTeams(gameId),
        TeamService.getLeaderboard(gameId)
      ])

      if (gameResponse.data) setGame(gameResponse.data)
      if (teamsResponse.data) setTeams(teamsResponse.data)
      if (leaderboardResponse.data) setLeaderboard(leaderboardResponse.data)

      setIsLoading(false)
    } catch (error) {
      setError('Failed to load game data')
      setIsLoading(false)
    }
  }

  const loadCurrentQuestion = async () => {
    if (!game) return

    try {
      if (isDemoMode()) {
        setCurrentQuestion(demoCurrentQuestion)
        return
      }

      const response = await QuestionService.getGameQuestion(
        gameId,
        game.current_round,
        game.current_question
      )
      if (response.data) {
        setCurrentQuestion(response.data)
      }
    } catch (error) {
      console.error('Failed to load current question:', error)
    }
  }

  const loadAnswerBreakdown = async () => {
    if (!game) return

    try {
      if (isDemoMode()) {
        setAnswerBreakdown(demoAnswerBreakdown)
        return
      }

      const response = await AnswerService.getAnswerBreakdown(
        gameId,
        game.current_round,
        game.current_question
      )
      if (response.data) {
        setAnswerBreakdown(response.data)
      }
    } catch (error) {
      console.error('Failed to load answer breakdown:', error)
    }
  }

  const handleGameAction = async (action: 'start' | 'pause' | 'resume' | 'complete' | 'advance') => {
    if (!game) return

    setActionLoading(action)
    setError(null)

    try {
      let response
      switch (action) {
        case 'start':
          response = await GameService.startGame(gameId)
          break
        case 'pause':
          response = await GameService.pauseGame(gameId)
          break
        case 'resume':
          response = await GameService.resumeGame(gameId)
          break
        case 'complete':
          response = await GameService.completeGame(gameId)
          break
        case 'advance':
          response = await GameService.advanceQuestion(gameId)
          break
      }

      if (response?.error) {
        setError(response.error.message)
      } else {
        await loadGameData()
      }
    } catch (error) {
      setError(`Failed to ${action} game`)
    } finally {
      setActionLoading(null)
    }
  }

  const markQuestionDisplayed = async () => {
    if (!game || !currentQuestion) return

    try {
      await QuestionService.markQuestionDisplayed(
        gameId,
        game.current_round,
        game.current_question
      )
      await loadCurrentQuestion()
    } catch (error) {
      console.error('Failed to mark question displayed:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!game) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Game not found</AlertDescription>
      </Alert>
    )
  }

  const progress = ((game.current_round - 1) * game.questions_per_round + game.current_question) /
                   (game.max_rounds * game.questions_per_round) * 100

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'setup': return 'bg-yellow-500'
      case 'active': return 'bg-green-500'
      case 'paused': return 'bg-orange-500'
      case 'completed': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Game Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{game.title}</h1>
          <div className="flex items-center gap-4 mt-2">
            <Badge className={getStatusColor(game.status)}>
              {game.status.toUpperCase()}
            </Badge>
            <span className="text-muted-foreground">
              Round {game.current_round} of {game.max_rounds} • Question {game.current_question} of {game.questions_per_round}
            </span>
          </div>
        </div>
        <Button onClick={onShowTVDisplay} className="gap-2">
          <Monitor className="h-4 w-4" />
          TV Display
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Game Progress</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Game Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Game Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {game.status === 'setup' && (
              <Button
                onClick={() => handleGameAction('start')}
                disabled={actionLoading === 'start' || teams.length === 0}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                {actionLoading === 'start' ? 'Starting...' : 'Start Game'}
              </Button>
            )}

            {game.status === 'active' && (
              <>
                <Button
                  onClick={() => handleGameAction('pause')}
                  disabled={actionLoading === 'pause'}
                  variant="outline"
                  className="gap-2"
                >
                  <Pause className="h-4 w-4" />
                  {actionLoading === 'pause' ? 'Pausing...' : 'Pause'}
                </Button>

                <Button
                  onClick={() => handleGameAction('advance')}
                  disabled={actionLoading === 'advance'}
                  className="gap-2"
                >
                  <SkipForward className="h-4 w-4" />
                  {actionLoading === 'advance' ? 'Advancing...' : 'Next Question'}
                </Button>

                {currentQuestion && !currentQuestion.displayed_at && (
                  <Button
                    onClick={markQuestionDisplayed}
                    variant="secondary"
                    className="gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Show Question
                  </Button>
                )}
              </>
            )}

            {game.status === 'paused' && (
              <Button
                onClick={() => handleGameAction('resume')}
                disabled={actionLoading === 'resume'}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                {actionLoading === 'resume' ? 'Resuming...' : 'Resume'}
              </Button>
            )}

            {(game.status === 'active' || game.status === 'paused') && (
              <Button
                onClick={() => handleGameAction('complete')}
                disabled={actionLoading === 'complete'}
                variant="destructive"
                className="gap-2"
              >
                <Square className="h-4 w-4" />
                {actionLoading === 'complete' ? 'Ending...' : 'End Game'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="teams" className="space-y-4">
        <TabsList>
          <TabsTrigger value="teams" className="gap-2">
            <Users className="h-4 w-4" />
            Teams ({teams.length})
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-2">
            <Trophy className="h-4 w-4" />
            Leaderboard
          </TabsTrigger>
          {game.status === 'active' && currentQuestion && (
            <TabsTrigger value="question" className="gap-2">
              <Hash className="h-4 w-4" />
              Current Question
            </TabsTrigger>
          )}
        </TabsList>

        {/* Teams Tab */}
        <TabsContent value="teams">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Card key={team.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    <Badge variant="outline">{team.join_code}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Score:</span>
                      <span className="font-semibold">{team.score}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Players:</span>
                      <span>{/* TODO: Show player count */}0</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {teams.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No teams have joined yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Players can scan the QR code to join
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle>Current Standings</CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length > 0 ? (
                <div className="space-y-3">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.team.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        index === 0 ? 'bg-yellow-50 border-yellow-200' :
                        index === 1 ? 'bg-gray-50 border-gray-200' :
                        index === 2 ? 'bg-orange-50 border-orange-200' :
                        'bg-background'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-500 text-white' :
                          index === 1 ? 'bg-gray-500 text-white' :
                          index === 2 ? 'bg-orange-500 text-white' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {entry.rank}
                        </div>
                        <div>
                          <div className="font-semibold">{entry.team.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {entry.correct_count}/{entry.total_count} correct • {entry.player_count} players
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">{entry.score}</div>
                        <div className="text-sm text-muted-foreground">points</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No scoring data yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Current Question Tab */}
        {game.status === 'active' && currentQuestion && (
          <TabsContent value="question">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Question Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Question {game.current_question}</CardTitle>
                  <CardDescription>
                    Round {game.current_round} • {currentQuestion.category} • {currentQuestion.difficulty}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-lg">{currentQuestion.question}</p>

                    <div className="grid gap-2">
                      {Object.entries(currentQuestion.answers).map(([letter, answer]) => (
                        <div
                          key={letter}
                          className={`p-3 rounded-lg border ${
                            answerBreakdown?.correct === letter
                              ? 'bg-green-50 border-green-200'
                              : 'bg-background'
                          }`}
                        >
                          <span className="font-semibold">{letter.toUpperCase()}.</span> {answer}
                        </div>
                      ))}
                    </div>

                    {currentQuestion.displayed_at && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Displayed {new Date(currentQuestion.displayed_at).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Answer Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Answer Distribution</CardTitle>
                  <CardDescription>
                    {answerBreakdown?.total || 0} teams have answered
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {answerBreakdown && (
                    <div className="space-y-3">
                      {Object.entries(answerBreakdown).map(([letter, count]) => {
                        if (letter === 'correct' || letter === 'total') return null
                        const percentage = answerBreakdown.total > 0 ? (count as number / answerBreakdown.total) * 100 : 0
                        const isCorrect = letter === answerBreakdown.correct

                        return (
                          <div key={letter} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className={`font-medium ${isCorrect ? 'text-green-600' : ''}`}>
                                {letter.toUpperCase()}. {isCorrect && '(Correct)'}
                              </span>
                              <span>{count} teams ({Math.round(percentage)}%)</span>
                            </div>
                            <Progress
                              value={percentage}
                              className={`h-2 ${isCorrect ? '[&>div]:bg-green-500' : ''}`}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}