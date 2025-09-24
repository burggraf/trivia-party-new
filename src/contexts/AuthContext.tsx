import React, { createContext, useContext, useEffect, useState } from 'react'
import { AuthService, type AuthUser } from '../services/authService'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signUp: (email: string, password: string, name: string, role: 'host' | 'player') => Promise<boolean>
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  isHost: boolean
  isPlayer: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let unsubscribe: (() => void) | null = null

    const initializeAuth = async () => {
      try {
        // Try to get current user from Supabase
        const { data: currentUser } = await AuthService.getCurrentUser()
        if (mounted) {
          setUser(currentUser)
        }

        // Listen for auth changes
        const { data: { subscription } } = AuthService.onAuthStateChange((authUser) => {
          if (mounted) {
            setUser(authUser)
          }
        })

        unsubscribe = () => subscription?.unsubscribe()
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) {
          setLoading(false)
        }
        return
      }

      if (mounted) {
        setLoading(false)
      }
    }

    initializeAuth()

    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [])

  const signUp = async (email: string, password: string, name: string, role: 'host' | 'player'): Promise<boolean> => {
    try {
      const { data, error } = await AuthService.signUp({ email, password, name, role })
      if (error) {
        console.error('Sign up error:', error.message)
        return false
      }
      setUser(data)
      return true
    } catch (error) {
      console.error('Sign up error:', error)
      return false
    }
  }

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await AuthService.signIn({ email, password })
      if (error) {
        console.error('Sign in error:', error.message)
        return false
      }
      setUser(data)
      return true
    } catch (error) {
      console.error('Sign in error:', error)
      return false
    }
  }

  const signOut = async (): Promise<void> => {
    try {
      await AuthService.signOut()
      setUser(null)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    isHost: user?.role === 'host',
    isPlayer: user?.role === 'player',
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}