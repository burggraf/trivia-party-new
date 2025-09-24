# Data Model: Multi-User Trivia Game

**Generated**: 2025-09-23
**Based on**: Feature requirements and research findings

## Core Entities

### 1. Game
**Purpose**: Represents a trivia game session
```typescript
interface Game {
  id: string;                    // UUID primary key
  host_id: string;              // Host user UUID (FK to auth.users)
  title: string;                // Game display name
  status: GameStatus;           // current, completed, paused
  current_round: number;        // Active round number (1-based)
  current_question: number;     // Active question in round (1-based)
  max_rounds: number;           // Total rounds planned
  questions_per_round: number;  // Questions per round
  created_at: timestamp;
  started_at: timestamp | null;
  ended_at: timestamp | null;
  settings: GameSettings;       // JSON configuration
}

type GameStatus = 'setup' | 'active' | 'paused' | 'completed';

interface GameSettings {
  allowLateJoins: boolean;
  timePerQuestion: number;      // seconds (0 = unlimited)
  pointsPerCorrect: number;
  categories?: string[];        // Filter questions by category
  difficulty?: string;          // Filter by difficulty
}
```

**Validation Rules**:
- Host must be authenticated user
- Title length: 3-100 characters
- Max rounds: 1-20
- Questions per round: 1-50
- Point values: 1-1000

### 2. Team
**Purpose**: Groups of players competing together
```typescript
interface Team {
  id: string;                   // UUID primary key
  game_id: string;             // FK to games
  name: string;                // Team display name
  join_code: string;           // 6-digit code for joining
  captain_id: string | null;   // Player who created team
  score: number;               // Current total score
  created_at: timestamp;
}
```

**Validation Rules**:
- Team name: 2-30 characters, unique per game
- Join code: 6 alphanumeric characters, unique per game
- Score: non-negative integer

### 3. Player
**Purpose**: Individual participants in games
```typescript
interface Player {
  id: string;                   // UUID primary key
  user_id: string | null;      // FK to auth.users (null for anonymous)
  game_id: string;             // FK to games
  team_id: string | null;      // FK to teams (null if not joined)
  display_name: string;        // Player name shown in game
  is_online: boolean;          // Real-time presence status
  joined_at: timestamp;
  last_seen: timestamp;
}
```

**Validation Rules**:
- Display name: 2-20 characters, unique per game
- Must be associated with a game

### 4. GameQuestion
**Purpose**: Questions selected for a specific game
```typescript
interface GameQuestion {
  id: string;                   // UUID primary key
  game_id: string;             // FK to games
  question_id: string;         // FK to questions table
  round_number: number;        // Which round (1-based)
  question_order: number;      // Order within round (1-based)
  shuffled_answers: string[];  // [a,b,c,d] in randomized order
  correct_position: number;    // Index of correct answer (0-3)
  displayed_at: timestamp | null;
  completed_at: timestamp | null;
}
```

**Validation Rules**:
- Unique (game_id, round_number, question_order)
- Round number must be within game's max_rounds
- Question order must be within questions_per_round
- Shuffled answers must contain exactly 4 items
- Correct position must be 0-3

### 5. Answer
**Purpose**: Team submissions for questions
```typescript
interface Answer {
  id: string;                   // UUID primary key
  game_id: string;             // FK to games
  team_id: string;             // FK to teams
  game_question_id: string;    // FK to game_questions
  selected_position: number;   // Position selected (0-3)
  is_correct: boolean;         // Calculated from correct_position
  points_earned: number;       // Points for this answer
  submitted_at: timestamp;
  submitted_by: string;        // Player ID who submitted
}
```

**Validation Rules**:
- Unique (team_id, game_question_id) - one answer per team per question
- Selected position must be 0-3
- Points earned: non-negative integer
- Submitted by must be valid player in the team

### 6. GameHost (extends existing questions table)
**Purpose**: Track question usage per host to prevent reuse
```typescript
interface QuestionUsage {
  id: string;                   // UUID primary key
  host_id: string;             // FK to auth.users
  question_id: string;         // FK to questions
  used_in_game_id: string;     // FK to games
  used_at: timestamp;
}
```

**Validation Rules**:
- Unique (host_id, question_id) - prevent double usage
- Must reference valid host, question, and game

## Relationships

### Primary Relationships
- Game ←→ Teams (1:many)
- Game ←→ Players (1:many)
- Game ←→ GameQuestions (1:many)
- Team ←→ Players (1:many, optional)
- Team ←→ Answers (1:many)
- GameQuestion ←→ Answers (1:many)
- GameQuestion → Question (many:1)

### Referential Integrity
- Cascade deletes: Game deletion removes teams, players, questions, answers
- Soft deletes: Mark games as deleted but preserve for analytics
- Orphan prevention: Players without teams can exist (pre-join state)

## State Transitions

### Game Lifecycle
```
setup → active → (paused ↔ active) → completed
```

**Transition Rules**:
- setup → active: Must have ≥1 team with ≥1 player
- active → paused: Host action only
- paused → active: Host action only
- * → completed: Host action or automatic when all questions answered

### Question Progression
```
pending → displayed → completed
```

**Transition Rules**:
- pending → displayed: Host advances to question
- displayed → completed: Host advances to next question OR time expires

### Team Formation
```
created → active → (can be disbanded)
```

**Transition Rules**:
- Players can join/leave teams during setup phase
- Teams locked during active gameplay
- Empty teams auto-removed after setup phase

## Performance Considerations

### Database Indexes
```sql
-- Game queries
CREATE INDEX idx_games_host_status ON games(host_id, status);
CREATE INDEX idx_games_status_created ON games(status, created_at);

-- Team queries
CREATE INDEX idx_teams_game_id ON teams(game_id);
CREATE INDEX idx_teams_join_code ON teams(join_code);

-- Player queries
CREATE INDEX idx_players_game_team ON players(game_id, team_id);
CREATE INDEX idx_players_user_game ON players(user_id, game_id);

-- Question queries
CREATE INDEX idx_game_questions_game_round ON game_questions(game_id, round_number, question_order);
CREATE INDEX idx_question_usage_host ON question_usage(host_id, question_id);

-- Answer queries
CREATE INDEX idx_answers_team_question ON answers(team_id, game_question_id);
CREATE INDEX idx_answers_game_submitted ON answers(game_id, submitted_at);
```

### Optimization Strategies
- Materialized views for leaderboards
- Partial indexes for active games only
- Connection pooling for concurrent access
- Read replicas for analytics queries

## Security Model

### Row Level Security (RLS) Policies

#### Games Table
```sql
-- Hosts can manage their own games
CREATE POLICY host_games ON games
  FOR ALL TO authenticated
  USING (host_id = auth.uid());

-- Players can read games they've joined
CREATE POLICY player_game_access ON games
  FOR SELECT TO authenticated
  USING (id IN (SELECT game_id FROM players WHERE user_id = auth.uid()));
```

#### Teams Table
```sql
-- All users can read teams in games they've joined
CREATE POLICY team_visibility ON teams
  FOR SELECT TO authenticated
  USING (game_id IN (SELECT game_id FROM players WHERE user_id = auth.uid()));

-- Players can create teams in games they've joined
CREATE POLICY team_creation ON teams
  FOR INSERT TO authenticated
  WITH CHECK (game_id IN (SELECT game_id FROM players WHERE user_id = auth.uid()));
```

#### Answers Table
```sql
-- Teams can only see their own answers
CREATE POLICY team_answers ON answers
  FOR ALL TO authenticated
  USING (team_id IN (SELECT team_id FROM players WHERE user_id = auth.uid()));
```

### Data Validation
- Input sanitization on all user-provided content
- Answer validation against game_question structure
- Prevent retroactive answer modifications
- Audit trail for all scoring operations

## Migration Strategy

### Phase 1: Core Tables
1. Create games, teams, players tables
2. Implement basic RLS policies
3. Add essential indexes

### Phase 2: Questions & Answers
1. Create game_questions table
2. Create answers table with constraints
3. Implement question usage tracking

### Phase 3: Optimization
1. Add performance indexes
2. Create materialized views
3. Implement soft deletes

### Phase 4: Analytics
1. Add game statistics tables
2. Implement reporting views
3. Add data retention policies

## Scalability Considerations

### Horizontal Scaling
- Partition games table by created_at (monthly)
- Separate read/write operations where possible
- Cache frequently accessed data (active games)

### Data Retention
- Archive completed games after 90 days
- Compress historical answer data
- Maintain aggregated statistics only for old games

### Monitoring
- Track query performance by table
- Monitor connection pool utilization
- Alert on unusual answer submission patterns

**Implementation Priority**: Core tables first, then optimization based on usage patterns.