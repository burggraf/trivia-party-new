import React, { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Trophy,
  Clock,
  Users,
  Hash,
  Wifi,
  Crown,
  CheckCircle
} from 'lucide-react'
import { GameService } from '../services/gameService'
import { TeamService } from '../services/teamService'
import { QuestionService } from '../services/questionService'
import type { Game } from '../types/game'
import type { LeaderboardEntry } from '../types/team'
import type { QuestionWithAnswers } from '../types/question'

interface TVDisplayProps {
  gameId: string
}

export const TVDisplay: React.FC<TVDisplayProps> = ({ gameId }) => {
  const [game, setGame] = useState<Game | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<QuestionWithAnswers | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)

  // Get the join URL for QR code
  const joinUrl = `${window.location.origin}/join/${gameId}`

  useEffect(() => {
    loadGameData()
    const interval = setInterval(loadGameData, 2000) // Refresh every 2 seconds for real-time updates
    return () => clearInterval(interval)
  }, [gameId])

  useEffect(() => {
    if (game && game.status === 'active') {
      loadCurrentQuestion()
    }
  }, [game])

  useEffect(() => {
    // Timer for question countdown
    if (currentQuestion && currentQuestion.displayed_at && currentQuestion.time_limit && !showAnswer) {
      const displayedAt = new Date(currentQuestion.displayed_at).getTime()
      const timeLimit = currentQuestion.time_limit * 1000

      const timer = setInterval(() => {
        const now = Date.now()
        const elapsed = now - displayedAt
        const remaining = Math.max(0, timeLimit - elapsed)

        setTimeRemaining(Math.ceil(remaining / 1000))

        if (remaining <= 0) {
          setShowAnswer(true)
          clearInterval(timer)
        }
      }, 100)

      return () => clearInterval(timer)
    }
  }, [currentQuestion, showAnswer])

  const loadGameData = async () => {
    try {
      const [gameResponse, leaderboardResponse] = await Promise.all([
        GameService.getGame(gameId),
        TeamService.getLeaderboard(gameId)
      ])

      if (gameResponse.data) setGame(gameResponse.data)
      if (leaderboardResponse.data) setLeaderboard(leaderboardResponse.data)
    } catch (error) {
      console.error('Failed to load game data:', error)
    }
  }

  const loadCurrentQuestion = async () => {
    if (!game) return

    try {
      const response = await QuestionService.getGameQuestion(
        gameId,
        game.current_round,
        game.current_question
      )
      if (response.data) {
        setCurrentQuestion(response.data)
        setShowAnswer(false)
        setTimeRemaining(null)
      }
    } catch (error) {
      console.error('Failed to load current question:', error)
    }
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading game...</div>
      </div>
    )
  }

  const getStatusDisplay = () => {
    switch (game.status) {
      case 'setup':
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 text-white">
            <div className="container mx-auto px-8 py-12">
              {/* Header */}
              <div className="text-center mb-16">
                <h1 className="text-8xl font-bold mb-4">{game.title}</h1>
                <div className="text-3xl text-blue-200 mb-8">
                  Get ready to play!
                </div>
                <Badge className="text-2xl px-6 py-3 bg-yellow-500 text-black">
                  SETTING UP
                </Badge>
              </div>

              {/* Join Instructions */}
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="text-center">
                  <div className="bg-white p-8 rounded-3xl shadow-2xl mb-8 inline-block">
                    <QRCode value={joinUrl} size={300} />
                  </div>
                  <div className="text-2xl font-semibold mb-4">Scan to Join!</div>
                  <div className="text-xl text-blue-200">
                    Or visit: {window.location.host}/join/{gameId}
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-yellow-400 mb-4">
                      {leaderboard.length}
                    </div>
                    <div className="text-2xl">Teams Joined</div>
                  </div>

                  <div className="space-y-4">
                    {leaderboard.map((entry, index) => (
                      <div
                        key={entry.team.id}
                        className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-yellow-400 text-black rounded-full flex items-center justify-center font-bold text-xl">
                            {index + 1}
                          </div>
                          <div className="text-2xl font-semibold">{entry.team.name}</div>
                        </div>
                        <div className="text-xl text-blue-200">
                          {entry.player_count} players
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'active':
        if (!currentQuestion) {
          return (
            <div className="min-h-screen bg-gradient-to-br from-green-900 to-blue-900 text-white flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-bold mb-4">Round {game.current_round}</div>
                <div className="text-3xl">Preparing next question...</div>
              </div>
            </div>
          )
        }

        if (!currentQuestion.displayed_at) {
          return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 to-pink-900 text-white flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-8">Get Ready!</div>
                <div className="text-6xl font-bold">Question {game.current_question}</div>
              </div>
            </div>
          )
        }

        return (
          <div className="min-h-screen bg-gradient-to-br from-green-900 to-blue-900 text-white">
            <div className="container mx-auto px-8 py-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                  <Badge className="text-xl px-4 py-2 bg-green-500">LIVE</Badge>
                  <div className="text-2xl">
                    Round {game.current_round} • Question {game.current_question}
                  </div>
                </div>
                {timeRemaining !== null && timeRemaining > 0 && (
                  <div className="flex items-center gap-4 text-3xl font-bold">
                    <Clock className="h-8 w-8" />
                    {timeRemaining}s
                  </div>
                )}
              </div>

              {/* Question */}
              <Card className="mb-8 bg-white/95 backdrop-blur-sm">
                <CardContent className="p-12">
                  <div className="text-center mb-8">
                    <div className="text-lg text-muted-foreground mb-2">
                      {currentQuestion.category} • {currentQuestion.difficulty}
                    </div>
                    <h2 className="text-5xl font-bold text-gray-900 leading-tight">
                      {currentQuestion.question}
                    </h2>
                  </div>

                  {/* Answer Options */}
                  <div className="grid grid-cols-2 gap-6 mt-12">
                    {Object.entries(currentQuestion.answers).map(([letter, answer]) => (
                      <div
                        key={letter}
                        className={`p-8 rounded-2xl border-4 text-center transition-all duration-500 ${
                          showAnswer && letter === currentQuestion.correct_answer
                            ? 'bg-green-100 border-green-500 text-green-900'
                            : 'bg-gray-50 border-gray-300 text-gray-900'
                        }`}
                      >
                        <div className="text-3xl font-bold mb-4">
                          {letter.toUpperCase()}.
                        </div>
                        <div className="text-2xl leading-relaxed">{answer}</div>
                        {showAnswer && letter === currentQuestion.correct_answer && (
                          <CheckCircle className="h-12 w-12 mx-auto mt-4 text-green-600" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">Game Progress</span>
                  <span className="text-xl">
                    {((game.current_round - 1) * game.questions_per_round + game.current_question)} / {game.max_rounds * game.questions_per_round}
                  </span>
                </div>
                <Progress
                  value={((game.current_round - 1) * game.questions_per_round + game.current_question) / (game.max_rounds * game.questions_per_round) * 100}
                  className="h-4"
                />
              </div>
            </div>
          </div>
        )

      case 'paused':
        return (
          <div className="min-h-screen bg-gradient-to-br from-orange-900 to-red-900 text-white flex items-center justify-center">
            <div className="text-center">
              <div className="text-8xl font-bold mb-8">PAUSED</div>
              <div className="text-3xl">Game will resume shortly</div>
            </div>
          </div>
        )

      case 'completed':
        return (
          <div className="min-h-screen bg-gradient-to-br from-purple-900 to-pink-900 text-white">
            <div className="container mx-auto px-8 py-12">
              <div className="text-center mb-16">
                <Trophy className="h-32 w-32 mx-auto mb-8 text-yellow-400" />
                <h1 className="text-8xl font-bold mb-4">Game Complete!</h1>
                <div className="text-3xl text-purple-200">
                  Final Results
                </div>
              </div>

              {/* Final Leaderboard */}
              <div className="max-w-4xl mx-auto space-y-6">
                {leaderboard.slice(0, 5).map((entry, index) => (
                  <div
                    key={entry.team.id}
                    className={`flex items-center justify-between p-8 rounded-2xl ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black' :
                      index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-black' :
                      index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-black' :
                      'bg-white/10 backdrop-blur-sm'
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold ${
                        index < 3 ? 'bg-black/20' : 'bg-white/20'
                      }`}>
                        {index === 0 ? <Crown className="h-8 w-8" /> : entry.rank}
                      </div>
                      <div>
                        <div className="text-4xl font-bold">{entry.team.name}</div>
                        <div className={`text-xl ${index < 3 ? 'opacity-75' : 'text-purple-200'}`}>
                          {entry.correct_count}/{entry.total_count} correct • {entry.player_count} players
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-5xl font-bold">{entry.score}</div>
                      <div className={`text-xl ${index < 3 ? 'opacity-75' : 'text-purple-200'}`}>
                        points
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center mt-16">
                <div className="text-2xl text-purple-200">Thank you for playing!</div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return getStatusDisplay()
}