
# Implementation Plan: Multi-User Trivia Game

**Branch**: `001-build-a-multi` | **Date**: 2025-09-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-build-a-multi/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Multi-user trivia game supporting teams competing in real-time. Host creates games with randomized questions from existing database, displays on TV with QR code for player access. Players join teams via smartphones, submit single answers per team, with real-time scoring and progression control by host. Technical approach: React frontend with shadcn UI, Supabase backend (database, auth, realtime), question randomization with usage tracking per host.

## Technical Context
**Language/Version**: TypeScript/JavaScript with React 18+
**Primary Dependencies**: React, shadcn/ui, Supabase (database, auth, realtime), QR code generation library
**Storage**: Supabase PostgreSQL with existing questions table (fields: a=correct, b/c/d=incorrect answers)
**Testing**: React Testing Library, Jest, Playwright for E2E
**Target Platform**: Modern web browsers (desktop for host TV display, mobile for players)
**Project Type**: web - frontend-only with Supabase backend services
**Performance Goals**: <100ms question loading, <50ms realtime updates, 60fps UI animations
**Constraints**: Client-side only (no custom backend), single answer per team enforcement, question reuse prevention per host
**Scale/Scope**: 100+ concurrent players per game, multiple simultaneous games, responsive design for TV and mobile

**User-Provided Implementation Details**: The front-end uses client-side code only, with React and using shadcn for all UI components. The backend uses Supabase -- the database, supabase auth, and supabase realtime channels to communicate with the players and the tv screen display. The host's browser will control the game and send messages on the necessary realtime channels. Use the existing questions table in the database, available via the supabase mcp server to provide available questions (randomly) for games. Question shouldn't be used more than once when creating subsequent games (based on the host's id.) The questions table always contains the correct answer in the field named "a" with incorrect answers in b, c, and d fields, so we'll need to randomize the answers for the game, yet still keep track of the correct answer for scoring.

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Code Quality Check
- [x] Implementation approach follows TDD principles (contract tests, integration tests, unit tests before implementation)
- [x] Performance requirements defined (<100ms question loading, <50ms realtime updates, 60fps animations)
- [x] Security considerations documented (Supabase auth, input validation, answer tampering prevention)
- [x] Accessibility requirements specified (WCAG 2.1 AA compliance for mobile and TV interfaces)

### Technical Standards Verification
- [x] Test coverage plan meets 85% minimum requirement (unit, integration, E2E with Playwright)
- [x] Performance benchmarks defined (realtime latency, question loading, concurrent user support)
- [x] Error handling strategy documented (network failures, invalid inputs, game state conflicts)
- [x] Data integrity measures specified (atomic answer submissions, question usage tracking, score calculation)

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 2 (Web application) - React frontend with Supabase backend services

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Database tasks: Create migration scripts for all entities (Game, Team, Player, GameQuestion, Answer, QuestionUsage)
- Contract test tasks: API endpoint validation for all REST endpoints [P]
- Realtime test tasks: WebSocket event validation for all channels [P]
- Component tasks: React components with shadcn/ui (Host dashboard, Player interface, TV display)
- Service tasks: Supabase client integration, real-time handlers, state management
- Integration tasks: End-to-end scenarios from quickstart guide
- Performance tasks: Load testing, real-time latency validation

**Ordering Strategy**:
- Phase 1: Database migrations and RLS policies (foundation)
- Phase 2: Contract tests for API endpoints [P] and Realtime events [P]
- Phase 3: Core data models and TypeScript types [P]
- Phase 4: Supabase client services (auth, database, realtime) [P]
- Phase 5: React components and UI (can be parallel after services)
- Phase 6: Integration scenarios and E2E tests
- Phase 7: Performance optimization and load testing

**Specific Task Categories**:
1. **Database Tasks (5-7 tasks)**:
   - Migration scripts for core tables
   - RLS policies for security
   - Indexes for performance
   - Question usage tracking setup

2. **API Contract Tasks (8-10 tasks)** [P]:
   - REST endpoint tests for games, teams, players
   - Answer submission validation
   - Leaderboard computation tests
   - Error handling scenarios

3. **Realtime Contract Tasks (6-8 tasks)** [P]:
   - Game state change events
   - Team communication channels
   - Presence tracking validation
   - Network resilience testing

4. **Component Implementation (12-15 tasks)**:
   - Host interface (game creation, control, display)
   - Player interface (joining, answering, status)
   - TV display (questions, leaderboard, QR codes)
   - Shared components (team lists, scores, timers)

5. **Integration & Performance (8-10 tasks)**:
   - End-to-end scenario validation
   - Load testing with multiple concurrent games
   - Real-time latency optimization
   - Cross-browser compatibility

**Constitutional Compliance Tasks**:
- Test coverage validation (>85% requirement)
- Performance benchmark verification
- Accessibility testing (WCAG 2.1 AA)
- Security validation (input sanitization, RLS policies)

**Estimated Output**: 35-40 numbered, ordered tasks in tasks.md

**Priority Markers**:
- [P] = Parallel execution (independent tasks)
- [CRITICAL] = Blocks other tasks
- [PERF] = Performance-related
- [SECURITY] = Security validation

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - All technical unknowns resolved
- [x] Phase 1: Design complete (/plan command) - Data model, contracts, quickstart created
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - 35-40 tasks planned
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS - No new violations introduced
- [x] All NEEDS CLARIFICATION resolved through research and user requirements
- [x] Complexity deviations documented (none required)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
