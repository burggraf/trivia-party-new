export type GameStatus = 'setup' | 'active' | 'paused' | 'completed'

export interface GameSettings {
  allowLateJoins: boolean
  timePerQuestion: number // seconds (0 = unlimited)
  pointsPerCorrect: number
  categories?: string[]
  difficulty?: string
}

export interface Game {
  id: string
  host_id: string
  title: string
  status: GameStatus
  current_round: number
  current_question: number
  max_rounds: number
  questions_per_round: number
  created_at: string
  started_at: string | null
  ended_at: string | null
  settings: GameSettings
}

export interface CreateGameRequest {
  title: string
  max_rounds: number
  questions_per_round: number
  settings?: Partial<GameSettings>
}

export interface UpdateGameRequest {
  status?: GameStatus
  current_round?: number
  current_question?: number
}

// Validation functions
export const validateGameTitle = (title: string): boolean => {
  return title.length >= 3 && title.length <= 100
}

export const validateGameRounds = (rounds: number): boolean => {
  return rounds >= 1 && rounds <= 20
}

export const validateQuestionsPerRound = (questions: number): boolean => {
  return questions >= 1 && questions <= 50
}

export const validatePointsPerCorrect = (points: number): boolean => {
  return points >= 1 && points <= 1000
}

// Default game settings
export const DEFAULT_GAME_SETTINGS: GameSettings = {
  allowLateJoins: true,
  timePerQuestion: 0,
  pointsPerCorrect: 100,
  categories: [],
  difficulty: undefined
}

// Game state helpers
export const canAdvanceQuestion = (game: Game): boolean => {
  return game.status === 'active' &&
         game.current_question < game.questions_per_round
}

export const canAdvanceRound = (game: Game): boolean => {
  return game.status === 'active' &&
         game.current_question >= game.questions_per_round &&
         game.current_round < game.max_rounds
}

export const isGameComplete = (game: Game): boolean => {
  return game.current_round >= game.max_rounds &&
         game.current_question >= game.questions_per_round
}