-- Migration: Create helper function to safely prepare game questions

CREATE OR REPLACE FUNCTION prepare_game_question(
  p_game_id UUID,
  p_question_id UUID,
  p_round_number INTEGER,
  p_question_number INTEGER,
  p_shuffled_answers TEXT[],
  p_correct_position INTEGER,
  p_time_limit INTEGER DEFAULT NULL
)
RETURNS game_questions AS
$$
DECLARE
  current_user_id UUID := auth.uid();
  position_column TEXT;
  has_time_limit BOOLEAN;
  inserted_record game_questions%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING HINT = 'AUTH_REQUIRED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM games
    WHERE id = p_game_id
      AND host_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Not authorized to manage this game' USING HINT = 'NOT_GAME_HOST';
  END IF;

  SELECT column_name
  INTO position_column
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'game_questions'
    AND column_name IN ('question_order', 'question_number')
  ORDER BY CASE column_name WHEN 'question_order' THEN 1 ELSE 2 END
  LIMIT 1;

  IF position_column IS NULL THEN
    position_column := 'question_order';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'game_questions'
      AND column_name = 'time_limit'
  ) INTO has_time_limit;

  EXECUTE format(
    'DELETE FROM game_questions WHERE game_id = $1 AND round_number = $2 AND %I = $3',
    position_column
  )
  USING p_game_id, p_round_number, p_question_number;

  DELETE FROM game_questions
  WHERE game_id = p_game_id
    AND question_id = p_question_id;

  IF has_time_limit THEN
    EXECUTE format(
      'INSERT INTO game_questions (game_id, question_id, round_number, %I, shuffled_answers, correct_position, time_limit)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *',
      position_column
    )
    INTO inserted_record
    USING p_game_id, p_question_id, p_round_number, p_question_number, p_shuffled_answers, p_correct_position, p_time_limit;
  ELSE
    EXECUTE format(
      'INSERT INTO game_questions (game_id, question_id, round_number, %I, shuffled_answers, correct_position)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *',
      position_column
    )
    INTO inserted_record
    USING p_game_id, p_question_id, p_round_number, p_question_number, p_shuffled_answers, p_correct_position;
  END IF;

  RETURN inserted_record;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;
