# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-user trivia game designed for in-person play with teams competing in real-time. The architecture supports a host controlling the game via laptop/TV while players participate via smartphones by scanning QR codes.

## Development Commands

```bash
# Start development server (localhost only)
npm run dev

# Start development server with network access (for multi-device testing)
npm run dev -- --host 0.0.0.0

# Build for production
npm run build

# Run linting
npm run lint

# Run unit tests
npm test

# Run end-to-end tests
npm run test:e2e

# Run single test file
npm test -- src/components/AppRouter.test.ts

# Preview production build
npm preview
```

## Architecture & Key Concepts

### Data Flow Architecture
- **Service Layer**: All database operations go through service classes (`src/services/`)
  - `GameService`: Game lifecycle management
  - `TeamService`: Team creation, joining, leaderboards
  - `PlayerService`: Player registration, presence tracking
  - `QuestionService`: Question randomization, answer verification
  - `AnswerService`: Answer submission and scoring

- **Component Architecture**: React components follow a clear separation:
  - `AppRouter`: Main routing logic with URL pattern matching for `/join/{gameId}`, `/tv/{gameId}`, `/host/manage/{gameId}`
  - `TVDisplay`: Full-screen display component with real-time updates
  - `HostDashboard`: Game control interface for hosts
  - `PlayerJoin`: Mobile-optimized team joining flow

### Database Schema
- Uses Supabase PostgreSQL with Row Level Security (RLS) policies
- Key tables: `games`, `teams`, `players`, `questions`, `game_questions`, `answers`, `question_usage`
- All migrations in `database/migrations/` with numbered sequence
- UUIDs are used for all primary keys and must never be truncated

### Authentication System
- Supports both authenticated users and guest players
- Guest players get auto-generated UUIDs via `crypto.randomUUID()`
- AuthContext manages user state and role-based permissions (host/player)

### Multi-Device Support
- Game URLs use full UUIDs (36 characters) - never truncate for display
- QR codes contain full join URLs: `{origin}/join/{gameId}`
- Real-time updates via Supabase realtime channels
- Network configuration allows external device access via `--host 0.0.0.0`

### Question System
- Questions stored with correct answer always in field 'a'
- Deterministic randomization using seeds ensures consistent answer order across devices
- Answer verification happens server-side to prevent cheating
- One answer per team enforced via unique constraints

## Environment Setup

Required environment variables in `.env`:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The app gracefully degrades to demo mode when environment variables are missing.

## Testing Strategy

- Unit tests use Vitest with React Testing Library
- E2E tests use Playwright for multi-device scenarios
- Contract tests verify API response formats
- Integration tests cover full game flow scenarios

## Critical Implementation Notes

### URL Routing Patterns
- TV display URLs: `/tv/{gameId}` - for projection screens
- Join URLs: `/join/{gameId}` - for player mobile devices
- Host management: `/host/manage/{gameId}` - for game control

### UUID Handling
- **CRITICAL**: Never truncate UUIDs in URLs or QR codes
- Game IDs are 36-character UUIDs, display full length
- Previous bug: TVDisplay truncated gameId causing "Game not found"

### Database Migrations
- Use Supabase MCP server for schema changes
- Apply migrations via `mcp__supabase__apply_migration`
- All tables have RLS policies for security

### Multi-Device Development
- Start dev server with `--host 0.0.0.0` for network access
- Test join flow by scanning QR codes from mobile devices
- TV display should show questions without console errors

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **QR Codes**: react-qr-code library
- **Icons**: Lucide React
- **Testing**: Vitest + Playwright + Testing Library

## Known Issues

- `QuestionService.addQuestionToGame()` method has implementation issues - use direct SQL as workaround
- Host dashboard routing may redirect to main menu unexpectedly