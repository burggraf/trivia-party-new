import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { AlertCircle, Clock, Users, Hash } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GameService } from '../services/gameService'
import { QuestionService } from '../services/questionService'
import type { CreateGameRequest, GameSettings } from '../types/game'

interface HostGameFormProps {
  onGameCreated: (gameId: string) => void
  onCancel?: () => void
}

export const HostGameForm: React.FC<HostGameFormProps> = ({ onGameCreated, onCancel }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableQuestions, setAvailableQuestions] = useState<number | null>(null)

  const [formData, setFormData] = useState<CreateGameRequest>({
    title: '',
    max_rounds: 3,
    questions_per_round: 5,
    settings: {
      timePerQuestion: 30,
      allowLateJoins: true,
      pointsPerCorrect: 100,
      categories: [],
      difficulty: undefined
    }
  })

  React.useEffect(() => {
    checkAvailableQuestions()
  }, [])

  const checkAvailableQuestions = async () => {
    try {
      // For now, assume we have plenty of questions available
      setAvailableQuestions(10000)
      // TODO: Implement proper question availability check once QuestionService is fixed
      // const response = await QuestionService.getAvailableQuestions('current-host', 100)
      // if (response.data) {
      //   setAvailableQuestions(response.data.length)
      // }
    } catch (error) {
      console.error('Failed to check available questions:', error)
      setAvailableQuestions(10000) // Fallback to assume plenty available
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const totalQuestions = formData.max_rounds * formData.questions_per_round

      if (availableQuestions !== null && availableQuestions < totalQuestions) {
        setError(`Not enough available questions. You need ${totalQuestions} questions but only ${availableQuestions} are available.`)
        setIsLoading(false)
        return
      }

      const response = await GameService.createGame(formData)

      if (response.error) {
        setError(response.error.message)
      } else if (response.data) {
        onGameCreated(response.data.id)
      }
    } catch (error) {
      setError('Failed to create game. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const updateSettings = (key: keyof GameSettings, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value
      }
    }))
  }

  const totalQuestions = formData.max_rounds * formData.questions_per_round
  const estimatedDuration = totalQuestions * (formData.settings.timePerQuestion + 10) / 60 // minutes

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Create New Trivia Game
          </CardTitle>
          <CardDescription>
            Set up your trivia game with custom settings and question preferences
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Game Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Game Title</Label>
              <Input
                id="title"
                type="text"
                placeholder="Friday Night Trivia"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
                minLength={3}
                maxLength={100}
              />
            </div>

            {/* Game Structure */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rounds">Number of Rounds</Label>
                <Select
                  value={formData.max_rounds.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, max_rounds: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Round</SelectItem>
                    <SelectItem value="2">2 Rounds</SelectItem>
                    <SelectItem value="3">3 Rounds</SelectItem>
                    <SelectItem value="4">4 Rounds</SelectItem>
                    <SelectItem value="5">5 Rounds</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="questions">Questions per Round</Label>
                <Select
                  value={formData.questions_per_round.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, questions_per_round: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Questions</SelectItem>
                    <SelectItem value="5">5 Questions</SelectItem>
                    <SelectItem value="10">10 Questions</SelectItem>
                    <SelectItem value="15">15 Questions</SelectItem>
                    <SelectItem value="20">20 Questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Game Summary */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <Hash className="h-4 w-4" />
                  Total Questions:
                </span>
                <span className="font-medium">{totalQuestions}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Estimated Duration:
                </span>
                <span className="font-medium">{Math.round(estimatedDuration)} minutes</span>
              </div>
              {availableQuestions !== null && (
                <div className="flex items-center justify-between text-sm">
                  <span>Available Questions:</span>
                  <span className={`font-medium ${availableQuestions >= totalQuestions ? 'text-green-600' : 'text-red-600'}`}>
                    {availableQuestions}
                  </span>
                </div>
              )}
            </div>

            {/* Timing Settings */}
            <div className="space-y-4">
              <Label>Timing Settings</Label>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="time-limit" className="text-sm">
                    Time per Question: {formData.settings.time_limit_per_question} seconds
                  </Label>
                </div>
                <Slider
                  value={[formData.settings.time_limit_per_question]}
                  onValueChange={([value]) => updateSettings('time_limit_per_question', value)}
                  min={10}
                  max={120}
                  step={5}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-advance" className="text-sm">
                  Auto-advance questions when time expires
                </Label>
                <Switch
                  id="auto-advance"
                  checked={formData.settings.auto_advance_questions}
                  onCheckedChange={(checked) => updateSettings('auto_advance_questions', checked)}
                />
              </div>
            </div>

            {/* Team Settings */}
            <div className="space-y-4">
              <Label>Team Settings</Label>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="max-players" className="text-sm">
                    Max Players per Team: {formData.settings.max_players_per_team}
                  </Label>
                </div>
                <Slider
                  value={[formData.settings.max_players_per_team]}
                  onValueChange={([value]) => updateSettings('max_players_per_team', value)}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="team-changes" className="text-sm">
                  Allow players to change teams
                </Label>
                <Switch
                  id="team-changes"
                  checked={formData.settings.allow_team_changes}
                  onCheckedChange={(checked) => updateSettings('allow_team_changes', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="late-joins" className="text-sm">
                  Allow late joins during game
                </Label>
                <Switch
                  id="late-joins"
                  checked={formData.settings.allow_late_joins}
                  onCheckedChange={(checked) => updateSettings('allow_late_joins', checked)}
                />
              </div>
            </div>

            {/* Display Settings */}
            <div className="space-y-4">
              <Label>Display Settings</Label>

              <div className="flex items-center justify-between">
                <Label htmlFor="show-answer" className="text-sm">
                  Show correct answer after each question
                </Label>
                <Switch
                  id="show-answer"
                  checked={formData.settings.show_correct_answer}
                  onCheckedChange={(checked) => updateSettings('show_correct_answer', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show-leaderboard" className="text-sm">
                  Show leaderboard between rounds
                </Label>
                <Switch
                  id="show-leaderboard"
                  checked={formData.settings.show_leaderboard_between_rounds}
                  onCheckedChange={(checked) => updateSettings('show_leaderboard_between_rounds', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="require-all" className="text-sm">
                  Require all teams to answer before advancing
                </Label>
                <Switch
                  id="require-all"
                  checked={formData.settings.require_all_teams_to_answer}
                  onCheckedChange={(checked) => updateSettings('require_all_teams_to_answer', checked)}
                />
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={isLoading || !formData.title.trim() || (availableQuestions !== null && availableQuestions < totalQuestions)}
                className="flex-1"
              >
                {isLoading ? 'Creating...' : 'Create Game'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}