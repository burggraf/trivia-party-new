import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  CheckCircle,
  XCircle,
  Timer,
  Trophy,
  Users,
  AlertCircle,
  Crown,
  Hash
} from 'lucide-react'
import { QuestionService } from '../services/questionService'
import { AnswerService } from '../services/answerService'
import { PlayerService } from '../services/playerService'
import type { Game } from '../types/game'
import type { Team } from '../types/team'
import type { Player } from '../types/player'
import type { QuestionWithAnswers } from '../types/question'

interface QuestionDisplayProps {
  game: Game
  team: Team
  player: Player
  onAnswerSubmitted?: () => void
}

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  game,
  team,
  player,
  onAnswerSubmitted
}) => {
  const [currentQuestion, setCurrentQuestion] = useState<QuestionWithAnswers | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<'a' | 'b' | 'c' | 'd' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [submittedAnswer, setSubmittedAnswer] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [canSubmit, setCanSubmit] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false)

  useEffect(() => {
    loadCurrentQuestion()
    checkAnswerStatus()

    // Poll for updates every 2 seconds
    const interval = setInterval(() => {
      loadCurrentQuestion()
      checkAnswerStatus()
      checkSubmissionEligibility()
    }, 2000)

    return () => clearInterval(interval)
  }, [game.current_round, game.current_question])

  useEffect(() => {
    // Update player's current question
    if (currentQuestion) {
      PlayerService.updateCurrentQuestion(player.id, currentQuestion.game_question_id)
    }
  }, [currentQuestion, player.id])

  useEffect(() => {
    // Countdown timer
    if (currentQuestion && currentQuestion.displayed_at && currentQuestion.time_limit && !hasAnswered) {
      const displayedAt = new Date(currentQuestion.displayed_at).getTime()
      const timeLimit = currentQuestion.time_limit * 1000

      const timer = setInterval(() => {
        const now = Date.now()
        const elapsed = now - displayedAt
        const remaining = Math.max(0, timeLimit - elapsed)

        setTimeRemaining(Math.ceil(remaining / 1000))

        if (remaining <= 0) {
          setCanSubmit(false)
          clearInterval(timer)
        }
      }, 100)

      return () => clearInterval(timer)
    }
  }, [currentQuestion, hasAnswered])

  const loadCurrentQuestion = async () => {
    try {
      const response = await QuestionService.getGameQuestion(
        game.id,
        game.current_round,
        game.current_question
      )

      if (response.data) {
        setCurrentQuestion(response.data)
        if (response.data.displayed_at) {
          setCanSubmit(true)
        }
      }
    } catch (error) {
      console.error('Failed to load current question:', error)
    }
  }

  const checkAnswerStatus = async () => {
    try {
      const response = await AnswerService.getTeamAnswer(
        team.id,
        game.id,
        game.current_round,
        game.current_question
      )

      if (response.data) {
        setHasAnswered(true)
        setSubmittedAnswer(response.data.selected_answer)
        setCanSubmit(false)

        // Show correct answer after time limit or if game settings allow
        if (game.settings.show_correct_answer) {
          setTimeout(() => setShowCorrectAnswer(true), 2000)
        }
      } else {
        setHasAnswered(false)
        setSubmittedAnswer(null)
        setShowCorrectAnswer(false)
      }
    } catch (error) {
      // Team hasn't answered yet
      setHasAnswered(false)
      setSubmittedAnswer(null)
    }
  }

  const checkSubmissionEligibility = async () => {
    if (hasAnswered) return

    try {
      const response = await AnswerService.canSubmitAnswer(
        team.id,
        game.id,
        game.current_round,
        game.current_question
      )

      if (response.data) {
        setCanSubmit(response.data.canSubmit)
        if (response.data.timeRemaining) {
          setTimeRemaining(response.data.timeRemaining)
        }
        if (!response.data.canSubmit && response.data.reason) {
          setError(response.data.reason)
        }
      }
    } catch (error) {
      console.error('Failed to check submission eligibility:', error)
    }
  }

  const handleAnswerSubmit = async () => {
    if (!selectedAnswer || !currentQuestion || hasAnswered) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await AnswerService.submitAnswer({
        team_id: team.id,
        game_id: game.id,
        round_number: game.current_round,
        question_number: game.current_question,
        selected_answer: selectedAnswer
      })

      if (response.error) {
        setError(response.error.message)
      } else {
        setHasAnswered(true)
        setSubmittedAnswer(selectedAnswer)
        setCanSubmit(false)
        setSelectedAnswer(null)
        onAnswerSubmitted?.()
      }
    } catch (error) {
      setError('Failed to submit answer')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Send heartbeat every 30 seconds
  useEffect(() => {
    const heartbeat = setInterval(() => {
      PlayerService.heartbeat(player.id)
    }, 30000)

    return () => clearInterval(heartbeat)
  }, [player.id])

  if (game.status !== 'active') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            {game.status === 'setup' && (
              <>
                <Clock className="h-16 w-16 mx-auto mb-4 text-blue-600" />
                <h2 className="text-2xl font-bold mb-2">Game Starting Soon</h2>
                <p className="text-gray-600">Wait for the host to start the game</p>
              </>
            )}
            {game.status === 'paused' && (
              <>
                <Timer className="h-16 w-16 mx-auto mb-4 text-orange-600" />
                <h2 className="text-2xl font-bold mb-2">Game Paused</h2>
                <p className="text-gray-600">The host has paused the game</p>
              </>
            )}
            {game.status === 'completed' && (
              <>
                <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-600" />
                <h2 className="text-2xl font-bold mb-2">Game Complete!</h2>
                <p className="text-gray-600">Thanks for playing</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <Hash className="h-16 w-16 mx-auto mb-4 text-purple-600" />
            <h2 className="text-2xl font-bold mb-2">Get Ready!</h2>
            <p className="text-gray-600">
              Round {game.current_round}, Question {game.current_question}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Waiting for the next question...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentQuestion.displayed_at) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <Timer className="h-16 w-16 mx-auto mb-4 text-purple-600 animate-pulse" />
            <h2 className="text-2xl font-bold mb-2">Question Loading...</h2>
            <p className="text-gray-600">
              Round {game.current_round}, Question {game.current_question}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{team.name}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {player.name}
                  {team.captain_id === player.id && <Crown className="h-4 w-4 text-yellow-500" />}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{team.score}</div>
                <div className="text-sm text-gray-500">points</div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Game Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Round {game.current_round} • Question {game.current_question}
              </span>
              {timeRemaining !== null && timeRemaining > 0 && (
                <div className={`flex items-center gap-1 font-bold ${
                  timeRemaining <= 10 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  <Clock className="h-4 w-4" />
                  {timeRemaining}s
                </div>
              )}
            </div>
            <Progress
              value={((game.current_round - 1) * game.questions_per_round + game.current_question) /
                     (game.max_rounds * game.questions_per_round) * 100}
              className="h-2"
            />
          </CardContent>
        </Card>

        {/* Question */}
        <Card>
          <CardHeader>
            <div className="text-center">
              <Badge variant="secondary" className="mb-3">
                {currentQuestion.category} • {currentQuestion.difficulty}
              </Badge>
              <CardTitle className="text-xl leading-tight">
                {currentQuestion.question}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {/* Answer Options */}
            <div className="space-y-3">
              {Object.entries(currentQuestion.answers).map(([letter, answer]) => {
                const isSelected = selectedAnswer === letter
                const isSubmitted = submittedAnswer === letter
                const isCorrect = showCorrectAnswer && letter === currentQuestion.correct_answer
                const isWrong = showCorrectAnswer && submittedAnswer === letter && letter !== currentQuestion.correct_answer

                return (
                  <button
                    key={letter}
                    onClick={() => !hasAnswered && canSubmit && setSelectedAnswer(letter as 'a' | 'b' | 'c' | 'd')}
                    disabled={hasAnswered || !canSubmit}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                      isCorrect
                        ? 'bg-green-100 border-green-500 text-green-900'
                        : isWrong
                        ? 'bg-red-100 border-red-500 text-red-900'
                        : isSubmitted
                        ? 'bg-blue-100 border-blue-500 text-blue-900'
                        : isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-900'
                        : hasAnswered || !canSubmit
                        ? 'bg-gray-50 border-gray-200 text-gray-500'
                        : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        isCorrect
                          ? 'bg-green-500 text-white'
                          : isWrong
                          ? 'bg-red-500 text-white'
                          : isSubmitted || isSelected
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {letter.toUpperCase()}
                      </div>
                      <div className="flex-1 text-base leading-relaxed">
                        {answer}
                      </div>
                      {isCorrect && <CheckCircle className="h-5 w-5 text-green-600" />}
                      {isWrong && <XCircle className="h-5 w-5 text-red-600" />}
                      {isSubmitted && !showCorrectAnswer && <CheckCircle className="h-5 w-5 text-blue-600" />}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Submit Button */}
            {!hasAnswered && canSubmit && (
              <Button
                onClick={handleAnswerSubmit}
                disabled={!selectedAnswer || isSubmitting}
                className="w-full mt-6 text-lg py-6"
                size="lg"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Answer'}
              </Button>
            )}

            {/* Status Messages */}
            {hasAnswered && (
              <div className="mt-6 text-center">
                <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Answer Submitted!</span>
                </div>
                <p className="text-sm text-gray-600">
                  {showCorrectAnswer
                    ? submittedAnswer === currentQuestion.correct_answer
                      ? 'Correct! Well done!'
                      : `The correct answer was ${currentQuestion.correct_answer?.toUpperCase()}`
                    : 'Waiting for other teams to answer...'}
                </p>
              </div>
            )}

            {!canSubmit && !hasAnswered && (
              <div className="mt-6 text-center">
                <div className="flex items-center justify-center gap-2 text-gray-500 mb-2">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">
                    {timeRemaining === 0 ? 'Time\'s Up!' : 'Waiting...'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {error || 'Question not ready yet'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Game Instructions */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-sm text-gray-600 space-y-1">
              <p>💡 <strong>Tip:</strong> Faster correct answers earn more points!</p>
              <p>🏆 Work together with your team</p>
              <p>⏰ Answer before time runs out</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}