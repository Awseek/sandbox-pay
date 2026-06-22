import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Route-level auth guard. Wraps protected routes so unauthenticated
 * users are redirected to /login *before* the page renders.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-muted text-sm animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
