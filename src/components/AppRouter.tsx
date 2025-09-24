import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { AuthForms } from './AuthForms'
import { HostGameForm } from './HostGameForm'
import { HostDashboard } from './HostDashboard'
import { TVDisplay } from './TVDisplay'
import { PlayerJoin } from './PlayerJoin'
import { Leaderboard } from './Leaderboard'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

type ViewType = 'auth' | 'host-menu' | 'host-create' | 'host-dashboard' | 'tv-display' | 'player-join' | 'leaderboard'

export function AppRouter() {
  const { user, loading, signOut, isHost, isPlayer } = useAuth()
  const [currentView, setCurrentView] = useState<ViewType>('auth')
  const [currentGameId, setCurrentGameId] = useState<string | null>(null)

  // Check for special URLs on initial load
  React.useEffect(() => {
    const path = window.location.pathname
    const joinMatch = path.match(/^\/join\/([a-f0-9-]+)$/)
    const tvMatch = path.match(/^\/tv\/([a-f0-9-]+)$/)
    const manageMatch = path.match(/^\/host\/manage\/([a-f0-9-]+)$/)

    if (joinMatch) {
      const gameId = joinMatch[1]
      setCurrentGameId(gameId)
      setCurrentView('player-join')
      return
    }

    if (tvMatch) {
      const gameId = tvMatch[1]
      setCurrentGameId(gameId)
      setCurrentView('tv-display')
      return
    }

    if (manageMatch) {
      const gameId = manageMatch[1]
      setCurrentGameId(gameId)
      setCurrentView('host-dashboard')
      return
    }
  }, [])

  // Auto-redirect based on user role when user changes
  React.useEffect(() => {
    if (user) {
      if (isHost && currentView === 'auth') {
        setCurrentView('host-menu')
      } else if (isPlayer && currentView === 'auth') {
        setCurrentView('player-join')
      }
    }
  }, [user, isHost, isPlayer, currentView])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">🎯 Trivia Party</h1>
            <p className="text-gray-600">Multi-user trivia game for in-person play</p>
          </div>
          <AuthForms onSuccess={() => {
            // Will be handled by auth state change
            setCurrentView('host-menu') // Default to host menu, will update when auth state changes
          }} />
        </div>
      </div>
    )
  }

  const handleSignOut = async () => {
    await signOut()
    setCurrentView('auth')
    setCurrentGameId(null)
  }

  const renderHeader = () => (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">🎯 Trivia Party</h1>
            {user && (
              <div className="text-sm text-gray-600">
                Welcome, {user.name || user.email} ({user.role})
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {isHost && currentView !== 'host-menu' && (
              <Button variant="outline" onClick={() => setCurrentView('host-menu')}>
                Host Menu
              </Button>
            )}
            {isPlayer && currentView !== 'player-join' && (
              <Button variant="outline" onClick={() => setCurrentView('player-join')}>
                Join Game
              </Button>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (currentView) {
      case 'host-menu':
        return (
          <div className="max-w-4xl mx-auto p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setCurrentView('host-create')}>
                <CardHeader>
                  <CardTitle>🎮 Create New Game</CardTitle>
                  <CardDescription>
                    Set up a new trivia game with custom settings
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setCurrentView('host-dashboard')}>
                <CardHeader>
                  <CardTitle>🎛️ Manage Current Game</CardTitle>
                  <CardDescription>
                    Control your active game, teams, and questions
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setCurrentView('tv-display')}>
                <CardHeader>
                  <CardTitle>📺 TV Display</CardTitle>
                  <CardDescription>
                    Full-screen display for questions and QR codes
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setCurrentView('leaderboard')}>
                <CardHeader>
                  <CardTitle>🏆 Leaderboard</CardTitle>
                  <CardDescription>
                    View team standings and game statistics
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        )

      case 'host-create':
        return (
          <div className="max-w-4xl mx-auto p-6">
            <HostGameForm onGameCreated={(gameId) => {
              setCurrentGameId(gameId)
              setCurrentView('host-dashboard')
            }} onCancel={() => setCurrentView('host-menu')} />
          </div>
        )

      case 'host-dashboard':
        return (
          <div className="max-w-7xl mx-auto p-6">
            <HostDashboard
              gameId={currentGameId}
              onShowTVDisplay={() => setCurrentView('tv-display')}
            />
          </div>
        )

      case 'tv-display':
        if (!currentGameId) {
          return (
            <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center text-white">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">📺 TV Display</h1>
                <p className="text-xl mb-8">No active game found</p>
                <p className="text-lg opacity-80">Create a game first to use the TV display</p>
                <Button
                  variant="outline"
                  className="mt-8 text-white border-white hover:bg-white hover:text-blue-600"
                  onClick={() => setCurrentView('host-menu')}
                >
                  Back to Host Menu
                </Button>
              </div>
            </div>
          )
        }
        return <TVDisplay gameId={currentGameId} />

      case 'player-join':
        return (
          <div className="max-w-md mx-auto p-6">
            <PlayerJoin gameId={currentGameId || 'demo-game-123'} onJoined={(player, team) => {
              setCurrentGameId(currentGameId || 'demo-game-123')
              console.log(`${player.name} joined ${team.name}!`)
              // Players stay on join screen to see their team status
            }} />
          </div>
        )

      case 'leaderboard':
        return (
          <div className="max-w-4xl mx-auto p-6">
            <Leaderboard game={{
              id: currentGameId || 'demo-game-123',
              title: "Trivia Game",
              status: 'active',
              current_round: 2,
              current_question: 3,
              max_rounds: 3,
              questions_per_round: 5,
              host_id: 'demo-host',
              settings: {} as any,
              created_at: new Date().toISOString(),
              started_at: null,
              ended_at: null
            }} autoRefresh={true} />
          </div>
        )

      default:
        return (
          <div className="max-w-4xl mx-auto p-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Welcome to Trivia Party!</h2>
            <p className="text-gray-600 mb-8">
              {isHost ? 'Use the menu to create or manage games.' : 'Join a game to start playing!'}
            </p>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {renderHeader()}
      <main>
        {renderContent()}
      </main>
    </div>
  )
}