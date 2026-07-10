import { Navigate, useLocation } from 'react-router-dom'
import { useAppState } from '@/hooks/use-app-state'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAppState()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
