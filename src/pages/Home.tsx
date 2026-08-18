import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import Dashboard from './Index'
import MyDashboard from './MyDashboard'

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (user?.role === 'admin' || user?.role === 'master') return <Dashboard />
  return <MyDashboard />
}
