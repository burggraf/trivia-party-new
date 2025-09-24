import React from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { AppRouter } from './components/AppRouter'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}

export default App