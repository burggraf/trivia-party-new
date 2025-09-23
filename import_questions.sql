-- Create questions table for trivia-party
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY,
    category TEXT NOT NULL,
    subcategory TEXT,
    difficulty TEXT,
    question TEXT NOT NULL,
    a TEXT,
    b TEXT,
    c TEXT,
    d TEXT,
    level NUMERIC,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- Import data from questions.tsv
-- Using \copy for client-side import (no special privileges required)
\copy questions (id, category, subcategory, difficulty, question, a, b, c, d, level, metadata, created_at, updated_at) FROM 'questions.tsv' WITH (FORMAT csv, DELIMITER E'\t', HEADER true, NULL '');