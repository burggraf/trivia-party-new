# Quickstart: Multi-User Trivia Game

**Purpose**: End-to-end validation scenarios for trivia game functionality
**Generated**: 2025-09-23

## Prerequisites
- Node.js 18+ installed
- Supabase project configured
- React development environment
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Environment Setup

### 1. Install Dependencies
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-react
npm install react-qr-code qrcode-generator
npm install zustand
npm install @testing-library/react @testing-library/jest-dom
npm install playwright
```

### 2. Configure Supabase
```bash
# Environment variables
REACT_APP_SUPABASE_URL=https://[project-id].supabase.co
REACT_APP_SUPABASE_ANON_KEY=[anon-key]
```

### 3. Database Setup
```sql
-- Run migration to create game tables
-- (Tables will be created via migration scripts)
```

## Validation Scenarios

### Scenario 1: Host Creates Game
**Objective**: Verify game creation and setup flow

**Steps**:
1. Navigate to `/host/create`
2. Fill game form:
   - Title: "Test Trivia Night"
   - Rounds: 3
   - Questions per round: 5
   - Time per question: 30 seconds
3. Click "Create Game"
4. Verify game appears in host dashboard
5. Click "Start Setup" to enter game room

**Expected Results**:
- Game created with unique ID
- Host redirected to game management screen
- QR code displayed for player joining
- Game status shows "setup"
- No teams or players initially

**Validation**:
```typescript
// Test helper function
const createTestGame = async () => {
  const response = await fetch('/api/games', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Test Trivia Night',
      max_rounds: 3,
      questions_per_round: 5,
      settings: { timePerQuestion: 30 }
    })
  });
  expect(response.status).toBe(201);
  const game = await response.json();
  expect(game.id).toBeDefined();
  expect(game.status).toBe('setup');
  return game;
};
```

### Scenario 2: Players Join Game
**Objective**: Verify player joining and team formation

**Steps**:
1. Host creates game (Scenario 1)
2. Open mobile browser/device simulator
3. Scan QR code or navigate to join URL
4. Enter player name: "Alice"
5. Create new team: "Team Alpha"
6. Verify team appears on host screen
7. Second player joins same team using team code
8. Third player creates different team: "Team Beta"

**Expected Results**:
- Players successfully join game
- Teams created with unique join codes
- Real-time updates on host screen
- Players see current game status
- Team member lists updated in real-time

**Validation**:
```typescript
const joinGameAsPlayer = async (gameId: string, playerName: string, teamName?: string) => {
  const response = await fetch(`/api/games/${gameId}/join`, {
    method: 'POST',
    body: JSON.stringify({
      display_name: playerName,
      team_name: teamName
    })
  });
  expect(response.status).toBe(201);
  const player = await response.json();
  expect(player.display_name).toBe(playerName);
  return player;
};
```

### Scenario 3: Host Starts Game
**Objective**: Verify game state transitions and question flow

**Steps**:
1. Complete Scenario 2 (players joined)
2. Host clicks "Start Game"
3. Verify game status changes to "active"
4. Host clicks "Display Question 1"
5. Verify question appears on all devices
6. Check question has 4 randomized answers
7. Verify timer starts (if enabled)

**Expected Results**:
- Game status updates to "active"
- All connected devices receive question
- Question text and answers displayed
- Answer options are randomized
- Players can see answer buttons
- Host sees player/team status

**Validation**:
```typescript
const startGame = async (gameId: string) => {
  const response = await fetch(`/api/games/${gameId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'active' })
  });
  expect(response.status).toBe(200);

  // Check realtime event
  const gameStateUpdate = await waitForRealtimeEvent('game_state_changed');
  expect(gameStateUpdate.status).toBe('active');
};
```

### Scenario 4: Team Answer Submission
**Objective**: Verify answer submission and enforcement

**Steps**:
1. Complete Scenario 3 (game started, question displayed)
2. Team Alpha member Alice selects answer A
3. Verify other Team Alpha members see "Answer Submitted"
4. Team Alpha member Bob tries to select answer B
5. Verify Bob's submission is rejected
6. Team Beta submits different answer
7. Host advances to show results

**Expected Results**:
- First team answer accepted
- Subsequent team answers rejected
- Team members notified of submission status
- Multiple teams can submit different answers
- Answer submission timestamped
- Host can see which teams answered

**Validation**:
```typescript
const submitAnswer = async (gameId: string, questionId: string, position: number) => {
  const response = await fetch(`/api/games/${gameId}/questions/${questionId}/answer`, {
    method: 'POST',
    body: JSON.stringify({ selected_position: position })
  });
  return response;
};

// First submission should succeed
const firstResponse = await submitAnswer(gameId, questionId, 0);
expect(firstResponse.status).toBe(201);

// Second submission from same team should fail
const secondResponse = await submitAnswer(gameId, questionId, 1);
expect(secondResponse.status).toBe(409);
```

### Scenario 5: Scoring and Leaderboard
**Objective**: Verify score calculation and leaderboard updates

**Steps**:
1. Complete Scenario 4 (answers submitted)
2. Host clicks "Show Results"
3. Verify correct answer highlighted
4. Check team scores updated correctly
5. Verify leaderboard shows current standings
6. Host advances to next question
7. Repeat answer submission process
8. Verify cumulative scoring

**Expected Results**:
- Correct answer clearly indicated
- Teams with correct answers get points
- Leaderboard updates in real-time
- Score calculations are accurate
- Rankings displayed correctly
- Historical scores preserved

**Validation**:
```typescript
const getLeaderboard = async (gameId: string) => {
  const response = await fetch(`/api/games/${gameId}/leaderboard`);
  expect(response.status).toBe(200);
  const leaderboard = await response.json();

  // Verify sorting by score
  for (let i = 1; i < leaderboard.length; i++) {
    expect(leaderboard[i-1].total_score).toBeGreaterThanOrEqual(leaderboard[i].total_score);
  }

  return leaderboard;
};
```

### Scenario 6: Multi-Round Game Flow
**Objective**: Verify complete game progression

**Steps**:
1. Complete Scenario 5 (first question completed)
2. Host advances through all questions in round 1
3. Verify round completion
4. Host starts round 2
5. Complete round 2
6. Host starts final round
7. Complete final round
8. Host displays final results

**Expected Results**:
- Smooth progression between questions
- Round transitions clearly indicated
- Questions not repeated within game
- Final scores calculated correctly
- Game status changes to "completed"
- Final leaderboard displayed

**Validation**:
```typescript
const completeFullGame = async (gameId: string) => {
  const game = await getGame(gameId);

  for (let round = 1; round <= game.max_rounds; round++) {
    for (let question = 1; question <= game.questions_per_round; question++) {
      await displayQuestion(gameId, round, question);
      await submitTestAnswers(gameId);
      await completeQuestion(gameId);
    }
  }

  const finalGame = await getGame(gameId);
  expect(finalGame.status).toBe('completed');
};
```

### Scenario 7: Real-time Connectivity
**Objective**: Verify real-time features and error handling

**Steps**:
1. Start game with multiple players
2. Simulate network disconnect for one player
3. Verify graceful degradation
4. Reconnect player
5. Verify state synchronization
6. Test with poor network conditions
7. Verify optimistic updates

**Expected Results**:
- Disconnected players handled gracefully
- Reconnection restores game state
- No data loss during network issues
- UI shows connection status
- Game continues for connected players
- Offline players can rejoin

**Validation**:
```typescript
const testNetworkResilience = async () => {
  // Simulate network disconnect
  await disconnectWebSocket();

  // Verify UI shows disconnected state
  expect(getConnectionStatus()).toBe('disconnected');

  // Reconnect
  await reconnectWebSocket();

  // Verify state restoration
  expect(getConnectionStatus()).toBe('connected');
  expect(getCurrentGameState()).toBeDefined();
};
```

### Scenario 8: Question Randomization
**Objective**: Verify question selection and answer shuffling

**Steps**:
1. Create multiple games with same host
2. Verify different questions selected
3. Check same question not reused
4. Verify answer positions randomized
5. Confirm correct answer tracking

**Expected Results**:
- Questions randomly selected from database
- No question reuse per host
- Answer positions shuffled per game
- Correct answer position tracked accurately
- Scoring uses original correct answer

**Validation**:
```typescript
const testQuestionRandomization = async (hostId: string) => {
  const game1 = await createGame(hostId);
  const game2 = await createGame(hostId);

  const questions1 = await getGameQuestions(game1.id);
  const questions2 = await getGameQuestions(game2.id);

  // No overlap in questions
  const overlap = questions1.filter(q1 =>
    questions2.some(q2 => q2.question_id === q1.question_id)
  );
  expect(overlap.length).toBe(0);

  // Answer positions differ
  expect(questions1[0].correct_position).not.toBe(0); // Original position was 0
};
```

## Performance Validation

### Load Testing
```bash
# Test concurrent player joining
npm run test:load -- --players 100 --games 5

# Test real-time message throughput
npm run test:realtime -- --messages-per-second 1000

# Test database query performance
npm run test:db -- --concurrent-queries 50
```

### Expected Performance Metrics
- Question loading: <100ms
- Real-time updates: <50ms
- Player join latency: <200ms
- Database queries: <500ms for complex operations
- Memory usage: <500MB for 100 concurrent players

## Integration Test Suite

### Automated Test Commands
```bash
# Run all validation scenarios
npm run test:scenarios

# Run specific scenario
npm run test:scenario -- --name="Host Creates Game"

# Run performance tests
npm run test:performance

# Run browser compatibility tests
npm run test:browsers
```

### Continuous Integration
```yaml
# .github/workflows/validation.yml
name: Trivia Game Validation
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:scenarios
      - run: npm run test:performance
```

## Manual Testing Checklist

### Host Interface
- [ ] Game creation form validation
- [ ] QR code generation and display
- [ ] Game state controls (start, pause, end)
- [ ] Question navigation (previous/next)
- [ ] Leaderboard display
- [ ] Player/team management
- [ ] Real-time status updates

### Player Interface
- [ ] QR code scanning
- [ ] Game joining flow
- [ ] Team creation/joining
- [ ] Question display and answering
- [ ] Answer confirmation
- [ ] Score/ranking display
- [ ] Connection status indication

### Cross-Device Testing
- [ ] iOS Safari (mobile)
- [ ] Android Chrome (mobile)
- [ ] Desktop Chrome (host)
- [ ] Desktop Safari (host)
- [ ] Tablet browsers (mixed use)

### Network Conditions
- [ ] Fast WiFi (office/home)
- [ ] Slow 3G (mobile)
- [ ] Intermittent connectivity
- [ ] High latency networks

**Success Criteria**: All scenarios pass, performance metrics met, cross-browser compatibility verified.