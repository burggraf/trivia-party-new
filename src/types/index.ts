// Re-export all types for easy imports
export * from './game'
export * from './team'
export * from './player'
export * from './question'

// Realtime event types
export interface GameStateChangedEvent {
  game_id: string
  status: string
  current_round: number
  current_question: number
  timestamp: string
  triggered_by: 'host' | 'system'
}

export interface QuestionDisplayedEvent {
  game_id: string
  game_question_id: string
  round_number: number
  question_order: number
  question: {
    text: string
    category: string
    difficulty: string | null
    answers: string[]
  }
  time_limit: number
  timestamp: string
}

export interface QuestionCompletedEvent {
  game_id: string
  game_question_id: string
  correct_position: number
  correct_answer: string
  team_results: {
    team_id: string
    team_name: string
    selected_position: number
    is_correct: boolean
    points_earned: number
    response_time: number
  }[]
  timestamp: string
}

export interface TeamAnsweredEvent {
  game_id: string
  team_id: string
  team_name: string
  game_question_id: string
  submitted_by: string
  timestamp: string
}

export interface AnswerLockedEvent {
  team_id: string
  game_question_id: string
  selected_position: number
  submitted_by: string
  timestamp: string
}

// Error types
export interface AppError {
  message: string
  code: string
  details?: Record<string, any>
}

// API response types
export interface ApiResponse<T> {
  data: T | null
  error: AppError | null
}

// Database row types for Supabase
export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string
          host_id: string
          title: string
          status: string
          current_round: number
          current_question: number
          max_rounds: number
          questions_per_round: number
          created_at: string
          started_at: string | null
          ended_at: string | null
          settings: Record<string, any>
        }
        Insert: {
          host_id: string
          title: string
          max_rounds: number
          questions_per_round: number
          settings?: Record<string, any>
        }
        Update: {
          status?: string
          current_round?: number
          current_question?: number
          started_at?: string
          ended_at?: string
          settings?: Record<string, any>
        }
      }
      teams: {
        Row: {
          id: string
          game_id: string
          name: string
          join_code: string
          captain_id: string | null
          score: number
          created_at: string
        }
        Insert: {
          game_id: string
          name: string
          join_code: string
          captain_id?: string | null
        }
        Update: {
          name?: string
          captain_id?: string | null
          score?: number
        }
      }
      players: {
        Row: {
          id: string
          user_id: string | null
          game_id: string
          team_id: string | null
          display_name: string
          is_online: boolean
          joined_at: string
          last_seen: string
        }
        Insert: {
          user_id?: string | null
          game_id: string
          team_id?: string | null
          display_name: string
        }
        Update: {
          team_id?: string | null
          is_online?: boolean
          last_seen?: string
        }
      }
    }
  }
}