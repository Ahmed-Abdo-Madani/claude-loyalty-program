import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { isManagerAuthenticatedAsync } from '../utils/secureAuth'

/**
 * Protected route wrapper for branch manager pages
 * Redirects to login if manager is not authenticated
 */
function ManagerProtectedRoute({ children }) {
  const [authStatus, setAuthStatus] = useState('checking')

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await isManagerAuthenticatedAsync()
      setAuthStatus(isAuth ? 'authenticated' : 'unauthenticated')
    }
    checkAuth()
  }, [])

  if (authStatus === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (authStatus === 'unauthenticated') {
    console.warn('🔒 Manager not authenticated - redirecting to login')
    return <Navigate to="/branch-manager-login" replace />
  }

  return children
}

export default ManagerProtectedRoute
