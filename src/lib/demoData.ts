import type { Game } from '../types/game'
import type { Team, LeaderboardEntry } from '../types/team'
import type { Player } from '../types/player'
import type { QuestionWithAnswers } from '../types/question'

// Demo Game Data
export const demoGame: Game = {
  id: 'demo-game-123',
  host_id: 'demo-host',
  title: 'Friday Night Trivia',
  status: 'active',
  current_round: 2,
  current_question: 3,
  max_rounds: 3,
  questions_per_round: 5,
  settings: {
    time_limit_per_question: 30,
    allow_team_changes: true,
    show_correct_answer: true,
    show_leaderboard_between_rounds: true,
    auto_advance_questions: false,
    require_all_teams_to_answer: false,
    allow_late_joins: true,
    max_players_per_team: 6,
    question_categories: ['General', 'Science', 'History'],
    difficulty_levels: ['easy', 'medium', 'hard']
  },
  created_at: '2025-09-23T17:00:00.000Z',
  started_at: '2025-09-23T17:30:00.000Z',
  ended_at: null
}

// Demo Teams Data
export const demoTeams: Team[] = [
  {
    id: 'team-1',
    game_id: 'demo-game-123',
    name: 'Quiz Wizards',
    join_code: 'QUIZ',
    captain_id: 'player-1',
    score: 2850,
    created_at: '2025-09-23T17:15:00.000Z'
  },
  {
    id: 'team-2',
    game_id: 'demo-game-123',
    name: 'Brain Storm',
    join_code: 'BRAIN',
    captain_id: 'player-4',
    score: 2650,
    created_at: '2025-09-23T17:16:00.000Z'
  },
  {
    id: 'team-3',
    game_id: 'demo-game-123',
    name: 'The Thinkers',
    join_code: 'THINK',
    captain_id: 'player-7',
    score: 2450,
    created_at: '2025-09-23T17:17:00.000Z'
  },
  {
    id: 'team-4',
    game_id: 'demo-game-123',
    name: 'Know It Alls',
    join_code: 'KNOW',
    captain_id: 'player-10',
    score: 2200,
    created_at: '2025-09-23T17:18:00.000Z'
  }
]

// Demo Players Data
export const demoPlayers: Player[] = [
  { id: 'player-1', team_id: 'team-1', name: 'Alex', device_id: 'device-1', is_online: true, last_activity: new Date().toISOString(), joined_at: '2025-09-23T17:15:00.000Z', current_question_id: null },
  { id: 'player-2', team_id: 'team-1', name: 'Sam', device_id: 'device-2', is_online: true, last_activity: new Date().toISOString(), joined_at: '2025-09-23T17:15:30.000Z', current_question_id: null },
  { id: 'player-3', team_id: 'team-1', name: 'Jordan', device_id: 'device-3', is_online: false, last_activity: '2025-09-23T17:45:00.000Z', joined_at: '2025-09-23T17:16:00.000Z', current_question_id: null },

  { id: 'player-4', team_id: 'team-2', name: 'Casey', device_id: 'device-4', is_online: true, last_activity: new Date().toISOString(), joined_at: '2025-09-23T17:16:00.000Z', current_question_id: null },
  { id: 'player-5', team_id: 'team-2', name: 'Riley', device_id: 'device-5', is_online: true, last_activity: new Date().toISOString(), joined_at: '2025-09-23T17:16:30.000Z', current_question_id: null },
  { id: 'player-6', team_id: 'team-2', name: 'Morgan', device_id: 'device-6', is_online: true, last_activity: new Date().toISOString(), joined_at: '2025-09-23T17:17:00.000Z', current_question_id: null },

  { id: 'player-7', team_id: 'team-3', name: 'Taylor', device_id: 'device-7', is_online: true, last_activity: new Date().toISOString(), joined_at: '2025-09-23T17:17:00.000Z', current_question_id: null },
  { id: 'player-8', team_id: 'team-3', name: 'Avery', device_id: 'device-8', is_online: false, last_activity: '2025-09-23T17:40:00.000Z', joined_at: '2025-09-23T17:17:30.000Z', current_question_id: null },

  { id: 'player-10', team_id: 'team-4', name: 'Blake', device_id: 'device-10', is_online: true, last_activity: new Date().toISOString(), joined_at: '2025-09-23T17:18:00.000Z', current_question_id: null },
  { id: 'player-11', team_id: 'team-4', name: 'Drew', device_id: 'device-11', is_online: true, last_activity: new Date().toISOString(), joined_at: '2025-09-23T17:18:30.000Z', current_question_id: null }
]

// Demo Leaderboard Data
export const demoLeaderboard: LeaderboardEntry[] = [
  {
    team: demoTeams[0],
    rank: 1,
    score: 2850,
    correct_count: 8,
    total_count: 10,
    player_count: 3
  },
  {
    team: demoTeams[1],
    rank: 2,
    score: 2650,
    correct_count: 7,
    total_count: 10,
    player_count: 3
  },
  {
    team: demoTeams[2],
    rank: 3,
    score: 2450,
    correct_count: 6,
    total_count: 10,
    player_count: 2
  },
  {
    team: demoTeams[3],
    rank: 4,
    score: 2200,
    correct_count: 6,
    total_count: 10,
    player_count: 2
  }
]

// Demo Current Question
export const demoCurrentQuestion: QuestionWithAnswers = {
  game_question_id: 'game-question-123',
  game_id: 'demo-game-123',
  round_number: 2,
  question_number: 3,
  question: 'Which planet in our solar system has the most moons?',
  category: 'Science',
  difficulty: 'medium',
  answers: {
    a: 'Jupiter',
    b: 'Saturn',
    c: 'Neptune',
    d: 'Uranus'
  },
  correct_answer: 'b',
  displayed_at: new Date(Date.now() - 15000).toISOString(), // 15 seconds ago
  time_limit: 30
}

// Demo Answer Breakdown
export const demoAnswerBreakdown = {
  a: 8,  // Jupiter
  b: 12, // Saturn (correct)
  c: 2,  // Neptune
  d: 3,  // Uranus
  correct: 'b',
  total: 25
}

// Helper function to check if we're in demo mode
export const isDemoMode = () => {
  // Force demo mode for testing - change this when you want to use real database
  return false
  // return !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY
}

// Demo service responses
export const createDemoResponse = <T>(data: T) => ({
  data,
  error: null
})

export const createDemoError = (message: string) => ({
  data: null,
  error: { message, code: 'DEMO_MODE', details: null }
})