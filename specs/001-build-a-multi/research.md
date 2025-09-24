# Research: Multi-User Trivia Game

**Generated**: 2025-09-23
**Purpose**: Resolve technical unknowns and establish implementation patterns

## Database Analysis

### Questions Table Structure
```sql
questions (
  id: uuid PRIMARY KEY,
  category: text,
  subcategory: text?,
  difficulty: text?,
  question: text,
  a: text (correct answer),
  b: text (incorrect),
  c: text (incorrect),
  d: text (incorrect),
  level: numeric?,
  metadata: jsonb?,
  created_at: timestamptz?,
  updated_at: timestamptz?
)
```

**Sample Data Confirmed**: 61,254 questions available with consistent structure where field 'a' contains correct answers.

## Technical Decisions

### 1. Frontend Framework & UI
**Decision**: React 18+ with TypeScript and shadcn/ui components
**Rationale**:
- User specified shadcn for all UI components
- React provides excellent real-time state management
- TypeScript ensures type safety for game state
- shadcn provides consistent, accessible components
**Alternatives considered**: Vue.js, Angular (rejected per user requirements)

### 2. Real-time Communication
**Decision**: Supabase Realtime channels for game state synchronization
**Rationale**:
- Supabase Realtime provides low-latency WebSocket connections
- Built-in presence tracking for player connections
- Channel-based messaging perfect for game rooms
- Automatic reconnection handling
**Alternatives considered**: Socket.io, WebRTC (more complex, not needed)

### 3. Authentication & User Management
**Decision**: Supabase Auth with anonymous sessions for players
**Rationale**:
- Host requires persistent identity for question usage tracking
- Players can join with temporary anonymous sessions
- Supabase Auth handles session management automatically
- RLS policies can control data access per user type
**Alternatives considered**: Custom auth, OAuth only (anonymous access needed)

### 4. Answer Randomization Strategy
**Decision**: Client-side answer shuffling with server-side validation
**Rationale**:
- Questions have fixed structure (a=correct, b/c/d=incorrect)
- Shuffle answers on display while tracking correct position
- Store original answer key for scoring validation
- Prevents client-side tampering through server validation
**Alternatives considered**: Server-side pre-shuffling (adds complexity)

### 5. Game State Management
**Decision**: Zustand for local state + Supabase for persistent state
**Rationale**:
- Zustand provides simple, performant React state management
- Supabase handles persistent game data and cross-client sync
- Clear separation between UI state and game state
- Easy to implement optimistic updates
**Alternatives considered**: Redux (overkill), Context API only (performance issues)

### 6. Question Selection & Usage Tracking
**Decision**: Database-driven random selection with usage logging
**Rationale**:
- Create `game_questions` table to track used questions per host
- Use SQL EXCEPT or NOT IN clauses for unused question selection
- Atomic transactions prevent race conditions
- Scales to multiple concurrent games
**Alternatives considered**: Client-side filtering (not scalable)

### 7. Team Answer Enforcement
**Decision**: Database constraints + real-time optimistic locking
**Rationale**:
- Unique constraint on (game_id, team_id, question_id)
- First submission wins, subsequent attempts rejected
- Real-time updates inform team members of submission status
- Prevents double-submission edge cases
**Alternatives considered**: Client-side only (not reliable)

### 8. QR Code Generation
**Decision**: react-qr-code library with game join URLs
**Rationale**:
- Lightweight, no dependencies
- Generates clean SVG QR codes
- URL contains game ID for direct joining
- Works on all mobile devices
**Alternatives considered**: qrcode.js, qr-generator (similar functionality)

### 9. Responsive Design Strategy
**Decision**: Mobile-first design with TV-optimized host view
**Rationale**:
- Players primarily use smartphones (touch interactions)
- Host view displays on TV/projector (large text, high contrast)
- Same React app with different layouts per device type
- shadcn components are inherently responsive
**Alternatives considered**: Separate mobile app (unnecessary complexity)

### 10. Performance Optimization
**Decision**: React.memo, useMemo for game state + lazy loading
**Rationale**:
- Game state updates frequently during active play
- Memoization prevents unnecessary re-renders
- Lazy load non-critical components for faster initial load
- Bundle splitting by route (host vs player views)
**Alternatives considered**: Full React optimization (premature at this stage)

## Architecture Patterns

### Real-time Game Flow
1. Host creates game → generates Supabase room
2. Players scan QR → join room via URL
3. Host controls state → broadcasts via Realtime
4. Players submit answers → validated server-side
5. Scores calculated → synced across all clients

### Data Consistency Strategy
- Optimistic updates for UI responsiveness
- Server validation for critical operations (answers, scores)
- Conflict resolution via timestamps and user roles
- Graceful degradation for network issues

### Error Handling Approach
- Network failures: Retry with exponential backoff
- Invalid game states: Reset to last known good state
- Authentication issues: Redirect to join flow
- Answer submission conflicts: Show clear error messages

## Security Considerations

### Input Validation
- All user inputs sanitized before database storage
- Answer submissions validated against question structure
- Team names filtered for inappropriate content
- Game IDs use UUIDs to prevent enumeration

### Access Control
- Row Level Security (RLS) policies for all tables
- Host-only operations (game control, question advancement)
- Player-only operations (answer submission, team joining)
- Anonymous users limited to read-only game data

### Anti-Cheating Measures
- Answer validation server-side only
- Question data hidden until display time
- Submission timestamps prevent retroactive changes
- Client-side game state read-only for critical data

## Performance Requirements Validation

### Question Loading: <100ms
- Database indexed on category, difficulty, host usage
- Connection pooling via Supabase
- Caching strategies for frequently accessed questions

### Real-time Updates: <50ms
- Supabase Realtime uses WebSockets for low latency
- Minimal payload sizes for state updates
- Regional edge caching for global performance

### UI Animations: 60fps
- CSS transitions for smooth interactions
- React.memo prevents unnecessary re-renders
- RAF-based animations for score displays

### Concurrent Users: 100+ per game
- Supabase scales automatically
- Channel-based isolation prevents cross-game interference
- Database connection limits handled by pooling

## Implementation Readiness

All technical unknowns resolved:
- ✅ Database structure confirmed (61K+ questions available)
- ✅ Real-time architecture defined (Supabase channels)
- ✅ Authentication strategy selected (Supabase Auth)
- ✅ Answer randomization approach confirmed
- ✅ Performance targets validated
- ✅ Security measures identified
- ✅ UI framework and patterns selected

**Ready for Phase 1: Design & Contracts**