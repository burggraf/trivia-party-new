// Base question from database
export interface Question {
  id: string
  category: string
  subcategory: string | null
  difficulty: string | null
  question: string
  a: string // Correct answer
  b: string | null
  c: string | null
  d: string | null
  level: number | null
  metadata: Record<string, any> | null
  created_at: string | null
  updated_at: string | null
}

// Question in a specific game with randomized answers
export interface GameQuestion {
  id: string
  game_id: string
  question_id: string
  round_number: number
  question_order: number
  question_number?: number | null
  shuffled_answers: string[]
  correct_position: number // 0-3 index in shuffled_answers
  displayed_at: string | null
  completed_at: string | null
  time_limit?: number | null
}

// Answer submission
export interface Answer {
  id: string
  game_id: string
  team_id: string
  game_question_id: string
  selected_position: number // 0-3
  is_correct: boolean
  points_earned: number
  submitted_at: string
  submitted_by: string
}

// Question for display to players
export interface DisplayQuestion {
  id: string
  text: string
  category: string
  difficulty: string | null
  answers: string[] // Always 4 options
  round_number: number
  question_order: number
  time_limit: number // seconds, 0 = unlimited
}

// Answer submission request
export interface SubmitAnswerRequest {
  selected_position: number
}

// Question selection criteria
export interface QuestionCriteria {
  categories?: string[]
  difficulty?: string
  exclude_used_by_host?: string
  limit?: number
}

// Question randomization
export const shuffleAnswers = (question: Question): { shuffled: string[], correctPosition: number } => {
  const answers = [question.a, question.b, question.c, question.d].filter(Boolean)

  // Ensure we have exactly 4 answers
  while (answers.length < 4) {
    answers.push(`Option ${answers.length + 1}`)
  }

  // Shuffle the answers
  const shuffled = [...answers]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  // Find where the correct answer ended up
  const correctPosition = shuffled.indexOf(question.a)

  return { shuffled, correctPosition }
}

// Validation
export const validateAnswerPosition = (position: number): boolean => {
  return Number.isInteger(position) && position >= 0 && position <= 3
}

export const isQuestionComplete = (gameQuestion: GameQuestion): boolean => {
  return gameQuestion.completed_at !== null
}

export const isQuestionDisplayed = (gameQuestion: GameQuestion): boolean => {
  return gameQuestion.displayed_at !== null
}

// Question usage tracking
export interface QuestionUsage {
  id: string
  host_id: string
  question_id: string
  used_in_game_id: string
  used_at: string
}

// Question statistics
export interface QuestionStats {
  question_id: string
  total_attempts: number
  correct_attempts: number
  difficulty_rating: number
  average_response_time: number
}