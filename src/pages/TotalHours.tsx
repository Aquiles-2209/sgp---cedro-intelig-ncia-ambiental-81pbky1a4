import { useState, useEffect, useCallback } from 'react'
import { Clock, TrendingUp, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { getTotalHoursByProject } from '@/services/time-entries'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { formatDuration } from '@/types/models'

interface ProjectHours {
  projectId: string
  projectName: string
  totalHours: number
  entryCount: number
}

export default function TotalHours() {
  const { isAuthenticated } = useAuth()
  const [data, setData] = useState<ProjectHours[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const result = await getTotalHoursByProject()
      setData(result)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) loadData()
  }, [isAuthenticated, loadData])

  useRealtime('time_entries', () => loadData(), isAuthenticated)

  const totalHours = data.reduce((sum, d) => sum + d.totalHours, 0)
  const totalEntries = data.reduce((sum, d) => sum + d.entryCount, 0)
  const maxHours = Math.max(...data.map((d) => d.totalHours), 1)

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary" /> Total de Horas
        </h1>
        <p className="text-slate-500 mt-1">Visão geral das horas acumuladas por projeto.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total de Horas</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatDuration(totalHours * 3600)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Projetos com Horas</p>
                <p className="text-2xl font-bold text-slate-900">{data.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total de Lançamentos</p>
                <p className="text-2xl font-bold text-slate-900">{totalEntries}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Horas por Projeto</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">
              Nenhum lançamento de horas encontrado.
            </p>
          ) : (
            <div className="space-y-3">
              {data.map((item) => (
                <div
                  key={item.projectId}
                  className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 truncate">
                      {item.projectName}
                    </p>
                    <div className="mt-1.5 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${(item.totalHours / maxHours) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-900">
                      {formatDuration(item.totalHours * 3600)}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {item.entryCount} lançamento{item.entryCount !== 1 ? 's' : ''}
                    </Badge>
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
