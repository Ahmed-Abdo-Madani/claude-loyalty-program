import { Navigate } from 'react-router-dom'
import { isManagerAuthenticated } from '../utils/secureAuth'

/**
 * Protected route wrapper for branch manager pages
 * Redirects to login if manager is not authenticated
 */
function ManagerProtectedRoute({ children }) {
  if (!isManagerAuthenticated()) {
    console.warn('🔒 Manager not authenticated - redirecting to login')
    return <Navigate to="/branch-manager-login" replace />
  }

  return children
}

export default ManagerProtectedRoute
