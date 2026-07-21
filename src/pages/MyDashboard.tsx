import { useState, useEffect, useCallback, useMemo } from 'react'
import { Clock, CalendarDays, CalendarRange, CheckCircle, Briefcase } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { getTimeEntriesByUser } from '@/services/time-entries'
import { formatDuration, type TimeEntry } from '@/types/models'

export default function MyDashboard() {
  const { user, isAuthenticated } = useAuth()
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!user?.id) return
    try {
      const data = await getTimeEntriesByUser(user.id)
      setTimeEntries(data)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (isAuthenticated && user?.id) loadData()
  }, [isAuthenticated, user?.id, loadData])

  const { weekHours, monthHours, totalHours } = useMemo(() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    let week = 0
    let month = 0
    let total = 0

    for (const te of timeEntries) {
      const duration = te.duration || 0
      total += duration
      const teDate = new Date(te.start_time)
      if (!isNaN(teDate.getTime())) {
        if (teDate >= startOfWeek) week += duration
        if (teDate >= startOfMonth) month += duration
      }
    }

    return { weekHours: week, monthHours: month, totalHours: total }
  }, [timeEntries])

  const recentTasks = useMemo(() => {
    const seen = new Set<string>()
    const tasks: Array<{ title: string; date: string; hours: number; status?: string }> = []
    for (const te of timeEntries) {
      const taskId = te.task || te.expand?.task?.id
      if (!taskId || seen.has(taskId)) continue
      seen.add(taskId)
      const task = te.expand?.task
      tasks.push({
        title: task?.title || 'Tarefa sem título',
        date: te.start_time,
        hours: te.duration || 0,
        status: task?.status,
      })
      if (tasks.length >= 5) break
    }
    return tasks
  }, [timeEntries])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('pt-BR')
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Olá, {user?.name?.split(' ')[0] || 'Usuário'}!
        </h1>
        <p className="text-slate-500 mt-1">Acompanhe suas horas trabalhadas e tarefas recentes.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Horas Esta Semana</p>
              <p className="text-2xl font-bold text-slate-900">{formatDuration(weekHours)}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <CalendarRange className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Horas Este Mês</p>
              <p className="text-2xl font-bold text-slate-900">{formatDuration(monthHours)}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total de Horas</p>
              <p className="text-2xl font-bold text-slate-900">{formatDuration(totalHours)}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Tarefas Recentes</CardTitle>
          <CardDescription>Últimas tarefas nas quais você registrou horas</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-slate-500">
              <Briefcase className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm">Nenhuma tarefa encontrada ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTasks.map((task, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <CheckCircle className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">{task.title}</p>
                      <p className="text-xs text-slate-500">{formatDate(task.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {task.status && (
                      <Badge variant="outline" className="text-xs">
                        {task.status}
                      </Badge>
                    )}
                    <span className="text-sm font-medium text-slate-700">
                      {formatDuration(task.hours)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
