# Tasks: Multi-User Trivia Game

**Input**: Design documents from `/specs/001-build-a-multi/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✓ Found: React+TypeScript, Supabase backend, shadcn/ui components
2. Load optional design documents:
   ✓ data-model.md: Game, Team, Player, GameQuestion, Answer entities
   ✓ contracts/: API and realtime schemas
   ✓ research.md: Technical decisions and patterns
3. Generate tasks by category:
   ✓ Setup: React project, Supabase, dependencies
   ✓ Tests: Contract tests, integration scenarios
   ✓ Core: Database migrations, components, services
   ✓ Integration: Realtime, authentication, state management
   ✓ Polish: Performance, accessibility, documentation
4. Apply task rules:
   ✓ Different files = [P] for parallel execution
   ✓ Database migrations before everything
   ✓ Tests before implementation (TDD)
5. Number tasks sequentially (T001-T040)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness
9. Return: SUCCESS (40 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
**Web App Structure**: `src/` for frontend, Supabase for backend
- Frontend: `src/components/`, `src/services/`, `src/hooks/`
- Tests: `src/__tests__/`, `playwright/tests/`
- Database: Supabase migrations, handled via MCP

## Phase 3.1: Project Setup
- [x] T001 Initialize React TypeScript project with Vite and configure package.json
- [x] T002 Install core dependencies: @supabase/supabase-js, react-qr-code, zustand, shadcn/ui
- [x] T003 [P] Configure ESLint, Prettier, and TypeScript strict mode in project root
- [x] T004 [P] Setup Playwright for E2E testing in playwright.config.ts
- [x] T005 Configure environment variables for Supabase in .env and src/lib/supabase.ts

## Phase 3.2: Database Foundation
- [x] T006 Create games table migration with all fields and constraints
- [x] T007 Create teams table migration with foreign keys and unique constraints
- [x] T008 Create players table migration with presence tracking fields
- [x] T009 Create game_questions table migration with answer randomization support
- [x] T010 Create answers table migration with team submission constraints
- [x] T011 Create question_usage table migration for host question tracking
- [x] T012 Create RLS policies for all tables ensuring proper access control
- [x] T013 Create performance indexes on frequently queried columns

## Phase 3.3: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### API Contract Tests
- [x] T014 [P] Contract test POST /games creation in src/__tests__/contracts/games.test.ts
- [x] T015 [P] Contract test GET /games/{id} retrieval in src/__tests__/contracts/games-get.test.ts
- [x] T016 [P] Contract test POST /games/{id}/join player joining in src/__tests__/contracts/join.test.ts
- [x] T017 [P] Contract test POST /games/{id}/teams team creation in src/__tests__/contracts/teams.test.ts
- [x] T018 [P] Contract test POST /games/{id}/questions/{qid}/answer submission in src/__tests__/contracts/answers.test.ts
- [x] T019 [P] Contract test GET /games/{id}/leaderboard scoring in src/__tests__/contracts/leaderboard.test.ts

### Realtime Contract Tests
- [x] T020 [P] Realtime test game_state_changed events in src/__tests__/realtime/game-state.test.ts
- [x] T021 [P] Realtime test question_displayed events in src/__tests__/realtime/questions.test.ts
- [x] T022 [P] Realtime test team_answered events in src/__tests__/realtime/answers.test.ts
- [x] T023 [P] Realtime test presence tracking in src/__tests__/realtime/presence.test.ts

### Integration Scenario Tests
- [x] T024 [P] Integration test: Host creates and starts game in src/__tests__/integration/host-flow.test.ts
- [x] T025 [P] Integration test: Players join teams and answer questions in src/__tests__/integration/player-flow.test.ts
- [x] T026 [P] Integration test: Complete game with scoring in src/__tests__/integration/full-game.test.ts
- [x] T027 [P] Integration test: Network resilience and reconnection in src/__tests__/integration/network.test.ts

## Phase 3.4: Core Implementation (ONLY after tests are failing)

### TypeScript Types and Models
- [x] T028 [P] Game entity types and validation in src/types/game.ts
- [x] T029 [P] Team entity types and validation in src/types/team.ts
- [x] T030 [P] Player entity types and validation in src/types/player.ts
- [x] T031 [P] Question and answer types in src/types/question.ts

### Supabase Services
- [ ] T032 [P] Game service with CRUD operations in src/services/gameService.ts
- [ ] T033 [P] Team service with join code generation in src/services/teamService.ts
- [ ] T034 [P] Player service with presence tracking in src/services/playerService.ts
- [ ] T035 [P] Question service with randomization logic in src/services/questionService.ts
- [ ] T036 [P] Answer service with submission validation in src/services/answerService.ts

### React Components
- [ ] T037 Host game creation form in src/components/HostGameForm.tsx
- [ ] T038 Host game control dashboard in src/components/HostDashboard.tsx
- [ ] T039 TV display component with QR code in src/components/TVDisplay.tsx
- [ ] T040 Player join game interface in src/components/PlayerJoin.tsx
- [ ] T041 Player question answering interface in src/components/QuestionDisplay.tsx
- [ ] T042 Team management component in src/components/TeamManager.tsx
- [ ] T043 Real-time leaderboard component in src/components/Leaderboard.tsx

### State Management and Hooks
- [ ] T044 [P] Game state store using Zustand in src/stores/gameStore.ts
- [ ] T045 [P] Realtime hooks for WebSocket management in src/hooks/useRealtime.ts
- [ ] T046 [P] Authentication hooks for Supabase Auth in src/hooks/useAuth.ts

## Phase 3.5: Integration and Routing
- [ ] T047 React Router setup with host and player routes in src/App.tsx
- [ ] T048 Authentication flow and protected routes in src/components/AuthProvider.tsx
- [ ] T049 Error boundary and loading states in src/components/ErrorBoundary.tsx
- [ ] T050 Real-time connection management and reconnection logic in src/lib/realtime.ts

## Phase 3.6: Performance and Polish
- [ ] T051 [P] Component performance optimization with React.memo in affected components
- [ ] T052 [P] Bundle optimization and code splitting by route in vite.config.ts
- [ ] T053 [P] Accessibility testing and WCAG 2.1 AA compliance validation
- [ ] T054 Performance benchmarking: <100ms question loading, <50ms realtime updates
- [ ] T055 Load testing with 100+ concurrent players using Playwright
- [ ] T056 Cross-browser compatibility testing (Chrome, Safari, Firefox, Edge)
- [ ] T057 Mobile responsiveness testing and touch interaction optimization
- [ ] T058 Constitutional compliance validation (85% test coverage, security checks)

## Phase 3.7: E2E Validation
- [ ] T059 [P] E2E test: Complete trivia game session in playwright/tests/full-game.spec.ts
- [ ] T060 [P] E2E test: Multi-team competition scenario in playwright/tests/multi-team.spec.ts
- [ ] T061 [P] E2E test: Host controls and game progression in playwright/tests/host-controls.spec.ts
- [ ] T062 [P] E2E test: Network interruption and recovery in playwright/tests/network-resilience.spec.ts

## Dependencies

### Critical Path
- Database setup (T006-T013) blocks all application development
- Contract tests (T014-T027) must complete before implementation (T028-T050)
- Types (T028-T031) block services (T032-T036)
- Services (T032-T036) block components (T037-T043)
- Authentication (T046, T048) blocks protected routes and host features

### Blocking Relationships
- T006-T013 (Database) → ALL subsequent tasks
- T014-T027 (Tests) → T028-T050 (Implementation)
- T028-T031 (Types) → T032-T036 (Services)
- T032-T036 (Services) → T037-T043 (Components)
- T044-T046 (State/Hooks) → T037-T043 (Components)
- T047-T050 (Integration) → T059-T062 (E2E Tests)

## Parallel Execution Examples

### Database Setup (Sequential - migrations must be ordered)
```
T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013
```

### Contract Tests (Parallel - independent test files)
```bash
# Launch T014-T019 together (API contracts):
Task: "Contract test POST /games creation in src/__tests__/contracts/games.test.ts"
Task: "Contract test GET /games/{id} retrieval in src/__tests__/contracts/games-get.test.ts"
Task: "Contract test POST /games/{id}/join in src/__tests__/contracts/join.test.ts"
Task: "Contract test POST /games/{id}/teams in src/__tests__/contracts/teams.test.ts"
Task: "Contract test POST /games/{id}/questions/{qid}/answer in src/__tests__/contracts/answers.test.ts"
Task: "Contract test GET /games/{id}/leaderboard in src/__tests__/contracts/leaderboard.test.ts"

# Launch T020-T023 together (Realtime contracts):
Task: "Realtime test game_state_changed events in src/__tests__/realtime/game-state.test.ts"
Task: "Realtime test question_displayed events in src/__tests__/realtime/questions.test.ts"
Task: "Realtime test team_answered events in src/__tests__/realtime/answers.test.ts"
Task: "Realtime test presence tracking in src/__tests__/realtime/presence.test.ts"

# Launch T024-T027 together (Integration scenarios):
Task: "Integration test: Host creates and starts game in src/__tests__/integration/host-flow.test.ts"
Task: "Integration test: Players join teams and answer questions in src/__tests__/integration/player-flow.test.ts"
Task: "Integration test: Complete game with scoring in src/__tests__/integration/full-game.test.ts"
Task: "Integration test: Network resilience and reconnection in src/__tests__/integration/network.test.ts"
```

### Types and Models (Parallel - independent files)
```bash
# Launch T028-T031 together:
Task: "Game entity types and validation in src/types/game.ts"
Task: "Team entity types and validation in src/types/team.ts"
Task: "Player entity types and validation in src/types/player.ts"
Task: "Question and answer types in src/types/question.ts"
```

### Services (Parallel - independent files)
```bash
# Launch T032-T036 together:
Task: "Game service with CRUD operations in src/services/gameService.ts"
Task: "Team service with join code generation in src/services/teamService.ts"
Task: "Player service with presence tracking in src/services/playerService.ts"
Task: "Question service with randomization logic in src/services/questionService.ts"
Task: "Answer service with submission validation in src/services/answerService.ts"
```

### State Management (Parallel - independent files)
```bash
# Launch T044-T046 together:
Task: "Game state store using Zustand in src/stores/gameStore.ts"
Task: "Realtime hooks for WebSocket management in src/hooks/useRealtime.ts"
Task: "Authentication hooks for Supabase Auth in src/hooks/useAuth.ts"
```

## Validation Checklist
*GATE: Checked before execution*

- [x] All API contracts (6) have corresponding tests (T014-T019)
- [x] All realtime contracts (4) have corresponding tests (T020-T023)
- [x] All entities (Game, Team, Player, Question, Answer) have type definitions (T028-T031)
- [x] All entities have service implementations (T032-T036)
- [x] All integration scenarios from quickstart.md have tests (T024-T027)
- [x] All tests come before implementation (T014-T027 before T028+)
- [x] Parallel tasks are truly independent (different files, no shared dependencies)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Constitutional requirements addressed (T053, T054, T058)

## Task Execution Strategy

### Week 1: Foundation (T001-T013)
- Day 1-2: Project setup and dependencies (T001-T005)
- Day 3-5: Database migrations and schema (T006-T013)

### Week 2: Testing Framework (T014-T027)
- Day 1-2: API contract tests (T014-T019)
- Day 3: Realtime contract tests (T020-T023)
- Day 4-5: Integration scenario tests (T024-T027)

### Week 3: Core Implementation (T028-T046)
- Day 1: Type definitions (T028-T031)
- Day 2-3: Service layer (T032-T036)
- Day 4-5: React components (T037-T043) and state management (T044-T046)

### Week 4: Integration & Polish (T047-T062)
- Day 1-2: App integration and routing (T047-T050)
- Day 3-4: Performance optimization (T051-T058)
- Day 5: E2E validation (T059-T062)

**Total Estimated Effort**: 20 days, 62 tasks
**Parallel Opportunities**: ~25 tasks can run concurrently in groups
**Critical Dependencies**: Database foundation → Tests → Implementation → Validation