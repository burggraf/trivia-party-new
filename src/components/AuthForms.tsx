import React, { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { useAuth } from '../contexts/AuthContext'
import { isDemoMode } from '../lib/demoData'

interface AuthFormsProps {
  defaultMode?: 'signin' | 'signup' | 'guest'
  onSuccess?: () => void
}

export function AuthForms({ defaultMode = 'signin', onSuccess }: AuthFormsProps) {
  const { signUp, signIn, signInAsGuest } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Sign In Form
  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  })

  // Sign Up Form
  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'player' as 'host' | 'player'
  })

  // Guest Form
  const [guestName, setGuestName] = useState('')

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const success = await signIn(signInData.email, signInData.password)
      if (success) {
        onSuccess?.()
      } else {
        setError('Invalid email or password')
      }
    } catch (err) {
      setError('Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (signUpData.password !== signUpData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (signUpData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const success = await signUp(signUpData.email, signUpData.password, signUpData.name, signUpData.role)
      if (success) {
        onSuccess?.()
      } else {
        setError('Failed to create account')
      }
    } catch (err) {
      setError('Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  const handleGuestSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!guestName.trim()) {
      setError('Please enter your name')
      setLoading(false)
      return
    }

    try {
      const success = await signInAsGuest(guestName.trim())
      if (success) {
        onSuccess?.()
      } else {
        setError('Failed to join as guest')
      }
    } catch (err) {
      setError('Failed to join as guest')
    } finally {
      setLoading(false)
    }
  }

  const getDefaultTab = () => {
    if (isDemoMode()) return 'guest'
    return defaultMode
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Tabs defaultValue={getDefaultTab()} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {isDemoMode() && <TabsTrigger value="guest">Quick Play</TabsTrigger>}
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>

        {isDemoMode() && (
          <TabsContent value="guest">
            <Card>
              <CardHeader>
                <CardTitle>Quick Play</CardTitle>
                <CardDescription>
                  Join the game instantly without creating an account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGuestSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="guest-name">Your Name</Label>
                    <Input
                      id="guest-name"
                      placeholder="Enter your name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      required
                    />
                  </div>
                  {error && (
                    <div className="text-sm text-red-600">{error}</div>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Joining...' : 'Join Game'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="signin">
          <Card>
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>
                Sign in to your account to host or join games
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={signInData.email}
                    onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Enter your password"
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    required
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-600">{error}</div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>Create Account</CardTitle>
              <CardDescription>
                Create an account to host games or save your player progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    placeholder="Enter your full name"
                    value={signUpData.name}
                    onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirm Password</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="Confirm your password"
                    value={signUpData.confirmPassword}
                    onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-3">
                  <Label>Account Type</Label>
                  <RadioGroup
                    value={signUpData.role}
                    onValueChange={(value: 'host' | 'player') => setSignUpData({ ...signUpData, role: value })}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="player" id="player" />
                      <Label htmlFor="player">Player - Join and play in games</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="host" id="host" />
                      <Label htmlFor="host">Host - Create and manage games</Label>
                    </div>
                  </RadioGroup>
                </div>
                {error && (
                  <div className="text-sm text-red-600">{error}</div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}