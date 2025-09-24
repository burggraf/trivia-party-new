import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create a mock client for demo mode when environment variables are missing
const createMockClient = () => ({
  from: (table: string) => ({
    select: (columns?: string) => ({
      eq: (column: string, value: any) => ({
        single: () => Promise.resolve({
          data: null,
          error: { message: 'Demo mode - database not connected', code: 'DEMO_MODE' }
        }),
        order: (column: string, options?: any) => Promise.resolve({
          data: [],
          error: { message: 'Demo mode - database not connected', code: 'DEMO_MODE' }
        }),
        limit: (count: number) => Promise.resolve({
          data: [],
          error: { message: 'Demo mode - database not connected', code: 'DEMO_MODE' }
        })
      }),
      single: () => Promise.resolve({
        data: null,
        error: { message: 'Demo mode - database not connected', code: 'DEMO_MODE' }
      }),
      order: (column: string, options?: any) => Promise.resolve({
        data: [],
        error: { message: 'Demo mode - database not connected', code: 'DEMO_MODE' }
      }),
      limit: (count: number) => Promise.resolve({
        data: [],
        error: { message: 'Demo mode - database not connected', code: 'DEMO_MODE' }
      })
    }),
    insert: (data: any) => ({
      select: () => ({
        single: () => Promise.resolve({
          data: null,
          error: { message: 'Demo mode - database not connected', code: 'DEMO_MODE' }
        })
      })
    }),
    update: (data: any) => ({
      eq: (column: string, value: any) => ({
        select: () => ({
          single: () => Promise.resolve({
            data: null,
            error: { message: 'Demo mode - database not connected', code: 'DEMO_MODE' }
          })
        })
      })
    }),
    delete: () => ({
      eq: (column: string, value: any) => Promise.resolve({
        error: { message: 'Demo mode - database not connected', code: 'DEMO_MODE' }
      })
    })
  }),
  auth: {
    getUser: () => Promise.resolve({
      data: { user: null },
      error: { message: 'Demo mode - auth not connected', code: 'DEMO_MODE' }
    })
  }
})

let supabase: any

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not found. Running in demo mode.')
  supabase = createMockClient()
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  })
}

export { supabase }
export default supabase