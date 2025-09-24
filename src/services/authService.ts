import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { ApiResponse } from '../types'

export interface AuthUser {
  id: string
  email?: string
  name?: string
  role: 'host' | 'player'
}

export interface SignUpRequest {
  email: string
  password: string
  name: string
  role: 'host' | 'player'
}

export interface SignInRequest {
  email: string
  password: string
}

export class AuthService {
  // Sign up new user
  static async signUp(request: SignUpRequest): Promise<ApiResponse<AuthUser>> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: request.email,
        password: request.password,
        options: {
          data: {
            name: request.name,
            role: request.role
          }
        }
      })

      if (error) {
        return {
          data: null,
          error: { message: error.message, code: 'AUTH_ERROR', details: error }
        }
      }

      if (!data.user) {
        return {
          data: null,
          error: { message: 'Failed to create user', code: 'AUTH_ERROR' }
        }
      }

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.name,
        role: data.user.user_metadata.role
      }

      return { data: authUser, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to sign up', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Sign in existing user
  static async signIn(request: SignInRequest): Promise<ApiResponse<AuthUser>> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: request.email,
        password: request.password
      })

      if (error) {
        return {
          data: null,
          error: { message: error.message, code: 'AUTH_ERROR', details: error }
        }
      }

      if (!data.user) {
        return {
          data: null,
          error: { message: 'Invalid credentials', code: 'AUTH_ERROR' }
        }
      }

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.name,
        role: data.user.user_metadata.role || 'player'
      }

      return { data: authUser, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to sign in', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Sign out
  static async signOut(): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        return {
          data: null,
          error: { message: error.message, code: 'AUTH_ERROR', details: error }
        }
      }

      return { data: true, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to sign out', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get current user
  static async getCurrentUser(): Promise<ApiResponse<AuthUser>> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error) {
        return {
          data: null,
          error: { message: error.message, code: 'AUTH_ERROR', details: error }
        }
      }

      if (!user) {
        return {
          data: null,
          error: { message: 'No user found', code: 'NOT_AUTHENTICATED' }
        }
      }

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.user_metadata.name,
        role: user.user_metadata.role || 'player'
      }

      return { data: authUser, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to get user', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get current session
  static async getSession(): Promise<Session | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return session
    } catch {
      return null
    }
  }

  // Listen for auth changes
  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata.name,
          role: session.user.user_metadata.role || 'player'
        }
        callback(authUser)
      } else {
        callback(null)
      }
    })
  }

  // Check if user is authenticated
  static async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession()
    return !!session
  }

  // Guest sign in for players (no email required)
  static async signInAsGuest(name: string): Promise<ApiResponse<AuthUser>> {
    try {
      // For demo/development, create a guest session without actual auth
      // In production, you might want to use anonymous auth or temporary tokens
      const guestUser: AuthUser = {
        id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        role: 'player'
      }

      // Store guest info in localStorage for session persistence
      localStorage.setItem('guestUser', JSON.stringify(guestUser))

      return { data: guestUser, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Failed to create guest session', code: 'UNKNOWN_ERROR', details: error }
      }
    }
  }

  // Get guest user from localStorage
  static getGuestUser(): AuthUser | null {
    try {
      const guestData = localStorage.getItem('guestUser')
      return guestData ? JSON.parse(guestData) : null
    } catch {
      return null
    }
  }

  // Clear guest session
  static clearGuestSession(): void {
    localStorage.removeItem('guestUser')
  }
}