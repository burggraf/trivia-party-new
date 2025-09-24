-- Migration: Create performance indexes on frequently queried columns

-- Additional performance indexes beyond those in table creation

-- Game performance indexes
CREATE INDEX idx_games_active_recent ON games(created_at DESC) WHERE status = 'active';
CREATE INDEX idx_games_host_recent ON games(host_id, created_at DESC);

-- Team performance indexes
CREATE INDEX idx_teams_score_ranking ON teams(game_id, score DESC);
CREATE INDEX idx_teams_active_games ON teams(game_id) WHERE game_id IN (SELECT id FROM games WHERE status = 'active');

-- Player performance indexes
CREATE INDEX idx_players_presence ON players(game_id, is_online, last_seen);
CREATE INDEX idx_players_team_active ON players(team_id, is_online) WHERE team_id IS NOT NULL;

-- Game questions performance indexes
CREATE INDEX idx_game_questions_current ON game_questions(game_id, displayed_at) WHERE completed_at IS NULL;
CREATE INDEX idx_game_questions_round_progress ON game_questions(game_id, round_number, completed_at);

-- Answers performance indexes
CREATE INDEX idx_answers_recent_submissions ON answers(game_id, submitted_at DESC);
CREATE INDEX idx_answers_team_performance ON answers(team_id, is_correct, points_earned);
CREATE INDEX idx_answers_question_stats ON answers(game_question_id, is_correct);

-- Question usage performance indexes
CREATE INDEX idx_question_usage_recent ON question_usage(host_id, used_at DESC);
CREATE INDEX idx_question_usage_frequency ON question_usage(question_id, used_at);

-- Composite indexes for complex queries
CREATE INDEX idx_leaderboard_query ON answers(game_id, team_id, is_correct, points_earned);
CREATE INDEX idx_game_progress ON game_questions(game_id, round_number, question_order, completed_at);

-- Comments
COMMENT ON INDEX idx_games_active_recent IS 'Optimize queries for recent active games';
COMMENT ON INDEX idx_teams_score_ranking IS 'Optimize leaderboard queries';
COMMENT ON INDEX idx_players_presence IS 'Optimize real-time presence tracking';
COMMENT ON INDEX idx_leaderboard_query IS 'Optimize complex leaderboard calculations';