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
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { RefreshCw, Copy, Check, ExternalLink, Monitor } from 'lucide-react'
import { GameService } from '../services/gameService'
import type { Game } from '../types/game'

type ViewType = 'auth' | 'host-menu' | 'host-create' | 'host-dashboard' | 'tv-display' | 'player-join' | 'leaderboard'

const LAST_GAME_STORAGE_KEY = 'trivia-party:last-game-id'

export function AppRouter() {
  const { user, loading, signOut, isHost, isPlayer } = useAuth()
  const [currentView, setCurrentView] = useState<ViewType>('auth')
  const [currentGameId, setCurrentGameId] = useState<string | null>(null)
  const [currentGame, setCurrentGame] = useState<Game | null>(null)
  const [gameLoading, setGameLoading] = useState(false)
  const [gameError, setGameError] = useState<string | null>(null)
  const [hostGames, setHostGames] = useState<Game[]>([])
  const [hostGamesLoading, setHostGamesLoading] = useState(false)
  const [hostGamesError, setHostGamesError] = useState<string | null>(null)
  const [copiedJoinLink, setCopiedJoinLink] = useState(false)

  const joinLink = React.useMemo(() => (
    currentGameId ? `${window.location.origin}/join/${currentGameId}` : ''
  ), [currentGameId])

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

  const hasRestoredGame = React.useRef(false)

  React.useEffect(() => {
    if (hasRestoredGame.current) return
    if (currentGameId) {
      hasRestoredGame.current = true
      return
    }

    const savedGameId = window.localStorage.getItem(LAST_GAME_STORAGE_KEY)
    if (savedGameId) {
      setCurrentGameId(savedGameId)
    }
    hasRestoredGame.current = true
  }, [currentGameId])

  React.useEffect(() => {
    if (!currentGameId) {
      setCurrentGame(null)
      setGameError(null)
      return
    }

    let active = true
    setGameError(null)
    setGameLoading(true)

    GameService.getGame(currentGameId)
      .then((response) => {
        if (!active) return
        if (response.data) {
          setCurrentGame(response.data)
        } else {
          setCurrentGame(null)
          if (response.error) {
            setGameError(response.error.message)
            if (response.error.details?.code === 'PGRST116') {
              setCurrentGameId(null)
            }
          }
        }
      })
      .catch(() => {
        if (!active) return
        setCurrentGame(null)
        setGameError('Failed to load game')
      })
      .finally(() => {
        if (!active) return
        setGameLoading(false)
      })

    return () => {
      active = false
    }
  }, [currentGameId])

  const loadHostGames = React.useCallback(async () => {
    if (!isHost) return

    setHostGamesLoading(true)
    setHostGamesError(null)

    try {
      const response = await GameService.getHostGames()
      if (response.data) {
        setHostGames(response.data)

        const prioritizedGame = response.data.find((game) => game.status === 'active')
          || response.data.find((game) => game.status === 'setup')
          || response.data[0]

        setCurrentGameId(prev => {
          if (prev || !prioritizedGame) return prev
          return prioritizedGame.id
        })
      } else if (response.error) {
        setHostGamesError(response.error.message)
      }
    } catch (error) {
      console.error('Failed to load host games', error)
      setHostGamesError('Failed to load your games')
    } finally {
      setHostGamesLoading(false)
    }
  }, [isHost])

  React.useEffect(() => {
    if (isHost && user) {
      loadHostGames()
    }
  }, [isHost, user, loadHostGames])

  React.useEffect(() => {
    if (currentView === 'host-menu' && isHost) {
      loadHostGames()
    }
  }, [currentView, isHost, loadHostGames])

  React.useEffect(() => {
    if (!isHost) return

    if (currentGameId) {
      window.localStorage.setItem(LAST_GAME_STORAGE_KEY, currentGameId)
    } else {
      window.localStorage.removeItem(LAST_GAME_STORAGE_KEY)
    }
  }, [currentGameId, isHost])

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
          <AuthForms
            onSuccess={() => {
              // Allow auth state change effect to route based on role while preserving deep links
              setCurrentView((previous) => {
                if (previous === 'player-join' || previous === 'tv-display' || previous === 'host-dashboard' || previous === 'leaderboard') {
                  return previous
                }
                return 'auth'
              })
            }}
          />
        </div>
      </div>
    )
  }

  const handleSignOut = async () => {
    await signOut()
    setCurrentView('auth')
    setCurrentGameId(null)
    setHostGames([])
    setHostGamesError(null)
  }

  const handleCopyJoinLink = async () => {
    if (!joinLink) return

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(joinLink)
        setCopiedJoinLink(true)
        setTimeout(() => setCopiedJoinLink(false), 2000)
      } else {
        window.prompt('Copy this link to share with players:', joinLink)
      }
    } catch (error) {
      console.error('Failed to copy join link', error)
      window.prompt('Copy this link to share with players:', joinLink)
    }
  }

  const openTVDisplay = (gameId: string | null) => {
    if (!gameId) return
    const url = `${window.location.origin}/tv/${gameId}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleOpenHostDashboard = (gameId?: string) => {
    const targetGameId = gameId || currentGameId
    if (!targetGameId) {
      setCurrentView('host-create')
      return
    }

    setCurrentGameId(targetGameId)
    setCurrentView('host-dashboard')
  }

  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'setup':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'paused':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'completed':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
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
          <div className="max-w-5xl mx-auto p-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>🎮 Get Your Game Ready</CardTitle>
                <CardDescription>
                  Create a new game or continue managing the most recent one.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {currentGameId && (gameLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading your game details...
                  </div>
                ) : currentGame ? (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-xl font-semibold">{currentGame.title}</h3>
                        <p className="text-sm text-muted-foreground">Created {new Date(currentGame.created_at).toLocaleString()}</p>
                      </div>
                      <Badge className={`border ${getStatusClasses(currentGame.status)}`}>
                        {currentGame.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Share this link with players to join:</p>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <code className="flex-1 bg-muted px-3 py-2 rounded text-sm break-all border border-muted-foreground/10">
                          {joinLink}
                        </code>
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={handleCopyJoinLink} className="gap-2">
                            {copiedJoinLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            {copiedJoinLink ? 'Copied!' : 'Copy link'}
                          </Button>
                          <Button variant="outline" onClick={() => openTVDisplay(currentGame.id)} className="gap-2">
                            <Monitor className="h-4 w-4" />
                            Open TV Display
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => handleOpenHostDashboard(currentGame.id)}>
                        Manage Host Controls
                      </Button>
                      <Button variant="outline" onClick={() => setCurrentView('leaderboard')}>
                        View Leaderboard
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {gameError || 'We could not load your selected game. Create a new one to get started.'}
                    </AlertDescription>
                  </Alert>
                ))}

                {!currentGameId && (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      You don&apos;t have a game selected yet. Create a new trivia party or pick from your recent games below.
                    </p>
                    <Button onClick={() => setCurrentView('host-create')} className="self-start">
                      Create a New Game
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>🆕 Create a Fresh Game</CardTitle>
                  <CardDescription>
                    Walk through the setup wizard to customize rounds, timing, and scoring.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setCurrentView('host-create')}>Start Game Setup</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>📂 Your Recent Games</CardTitle>
                  <CardDescription>
                    Jump back into an existing trivia night or open its display.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hostGamesLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading games...
                    </div>
                  )}

                  {hostGamesError && (
                    <Alert variant="destructive">
                      <AlertDescription>{hostGamesError}</AlertDescription>
                    </Alert>
                  )}

                  {!hostGamesLoading && hostGames.length === 0 && !hostGamesError && (
                    <p className="text-sm text-muted-foreground">
                      You haven&apos;t created any games yet. Start by setting up a new game.
                    </p>
                  )}

                  {hostGames.map((game) => (
                    <div key={game.id} className="rounded-lg border border-border p-3 space-y-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{game.title}</span>
                          {game.id === currentGameId && (
                            <Badge variant="secondary">Selected</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Status: {game.status.toUpperCase()} • Created {new Date(game.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => handleOpenHostDashboard(game.id)}>
                          Open Host Controls
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openTVDisplay(game.id)} className="gap-2">
                          <ExternalLink className="h-4 w-4" />
                          TV Display
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
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
              loadHostGames()
            }} onCancel={() => setCurrentView('host-menu')} />
          </div>
        )

      case 'host-dashboard':
        if (!currentGameId) {
          return (
            <div className="max-w-3xl mx-auto p-6">
              <Alert variant="destructive">
                <AlertDescription>No active game selected. Create or select a game first.</AlertDescription>
              </Alert>
            </div>
          )
        }
        return (
          <div className="max-w-7xl mx-auto p-6">
            <HostDashboard
              gameId={currentGameId}
              onShowTVDisplay={() => openTVDisplay(currentGameId)}
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
        if (!currentGameId) {
          return (
            <div className="max-w-md mx-auto p-6">
              <Alert variant="destructive">
                <AlertDescription>Enter this page using a valid join link to connect to a game.</AlertDescription>
              </Alert>
            </div>
          )
        }
        return (
          <div className="max-w-md mx-auto p-6">
            <PlayerJoin gameId={currentGameId} onJoined={(player, team) => {
              setCurrentGameId(team.game_id)
              console.log(`${player.name} joined ${team.name}!`)
              // Players stay on join screen to see their team status
            }} />
          </div>
        )

      case 'leaderboard':
        if (!currentGameId) {
          return (
            <div className="max-w-md mx-auto p-6">
              <Alert variant="destructive">
                <AlertDescription>Select a game to view its leaderboard.</AlertDescription>
              </Alert>
            </div>
          )
        }

        if (gameLoading || !currentGame) {
          return (
            <div className="flex items-center justify-center min-h-[300px]">
              {gameLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Loading game details...
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertDescription>{gameError || 'Game not found.'}</AlertDescription>
                </Alert>
              )}
            </div>
          )
        }

        return (
          <div className="max-w-4xl mx-auto p-6">
            <Leaderboard game={currentGame} autoRefresh={true} />
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