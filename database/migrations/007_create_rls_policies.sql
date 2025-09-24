-- Migration: Create RLS policies for all tables ensuring proper access control

-- Enable RLS on all tables
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_usage ENABLE ROW LEVEL SECURITY;

-- Games policies
CREATE POLICY "hosts_manage_own_games" ON games
  FOR ALL TO authenticated
  USING (host_id = auth.uid());

CREATE POLICY "players_read_joined_games" ON games
  FOR SELECT TO authenticated
  USING (id IN (SELECT game_id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "anonymous_read_games" ON games
  FOR SELECT TO anon
  USING (status IN ('active', 'completed'));

-- Teams policies
CREATE POLICY "teams_visible_in_joined_games" ON teams
  FOR SELECT TO authenticated
  USING (game_id IN (SELECT game_id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "players_create_teams" ON teams
  FOR INSERT TO authenticated
  WITH CHECK (game_id IN (SELECT game_id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "anonymous_read_teams" ON teams
  FOR SELECT TO anon
  USING (game_id IN (SELECT id FROM games WHERE status IN ('active', 'completed')));

-- Players policies
CREATE POLICY "players_manage_own_data" ON players
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "players_read_game_participants" ON players
  FOR SELECT TO authenticated
  USING (game_id IN (SELECT game_id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "anonymous_create_players" ON players
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "anonymous_read_players" ON players
  FOR SELECT TO anon
  USING (game_id IN (SELECT id FROM games WHERE status IN ('active', 'completed')));

-- Game questions policies
CREATE POLICY "hosts_manage_game_questions" ON game_questions
  FOR ALL TO authenticated
  USING (game_id IN (SELECT id FROM games WHERE host_id = auth.uid()));

CREATE POLICY "players_read_game_questions" ON game_questions
  FOR SELECT TO authenticated
  USING (game_id IN (SELECT game_id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "anonymous_read_displayed_questions" ON game_questions
  FOR SELECT TO anon
  USING (displayed_at IS NOT NULL AND game_id IN (SELECT id FROM games WHERE status = 'active'));

-- Answers policies
CREATE POLICY "teams_manage_own_answers" ON answers
  FOR ALL TO authenticated
  USING (team_id IN (SELECT team_id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "hosts_read_game_answers" ON answers
  FOR SELECT TO authenticated
  USING (game_id IN (SELECT id FROM games WHERE host_id = auth.uid()));

-- Question usage policies
CREATE POLICY "hosts_manage_own_usage" ON question_usage
  FOR ALL TO authenticated
  USING (host_id = auth.uid());

-- Comments
COMMENT ON POLICY "hosts_manage_own_games" ON games IS 'Hosts can manage their own games';
COMMENT ON POLICY "players_read_joined_games" ON games IS 'Players can read games they have joined';
COMMENT ON POLICY "anonymous_read_games" ON games IS 'Anonymous users can read active/completed games for joining';