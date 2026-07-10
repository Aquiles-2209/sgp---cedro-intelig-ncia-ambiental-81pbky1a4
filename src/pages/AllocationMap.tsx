import { useMemo } from 'react'
import { differenceInDays, format, min, max, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertTriangle, CalendarRange, Users, Clock } from 'lucide-react'
import { useAppState } from '@/hooks/use-app-state'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { isDeadlineSoon, normalizeDate } from '@/types/models'

const projectColors = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-orange-500',
]

export default function AllocationMap() {
  const { allocations, projects } = useAppState()

  const { rangeStart, rangeEnd, totalDays } = useMemo(() => {
    if (allocations.length === 0)
      return { rangeStart: new Date(), rangeEnd: addDays(new Date(), 30), totalDays: 30 }
    const starts = allocations.map((a) => new Date(normalizeDate(a.start_date) + 'T00:00:00'))
    const ends = allocations.map((a) => new Date(normalizeDate(a.end_date) + 'T00:00:00'))
    const s = min(starts)
    const e = max(ends)
    return { rangeStart: s, rangeEnd: e, totalDays: Math.max(1, differenceInDays(e, s)) }
  }, [allocations])

  const sortedAllocs = useMemo(
    () => [...allocations].sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [allocations],
  )
  const projColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    projects.forEach((p, i) => {
      map[p.id] = projectColors[i % projectColors.length]
    })
    return map
  }, [projects])
  const projName = (pid: string) => projects.find((p) => p.id === pid)?.name || 'N/A'
  const deadlineCount = allocations.filter((a) => isDeadlineSoon(a.end_date)).length
  const todayOffset = useMemo(() => {
    const t = new Date()
    if (t < rangeStart) return 0
    if (t > rangeEnd) return 100
    return Math.max(0, Math.min(100, (differenceInDays(t, rangeStart) / totalDays) * 100))
  }, [rangeStart, rangeEnd, totalDays])

  const months = useMemo(() => {
    const result: { label: string; offset: number }[] = []
    let cur = new Date(rangeStart)
    cur.setDate(1)
    while (cur <= rangeEnd) {
      result.push({
        label: format(cur, 'MMM yy', { locale: ptBR }),
        offset: Math.max(0, Math.min(100, (differenceInDays(cur, rangeStart) / totalDays) * 100)),
      })
      cur = addDays(cur, 30)
    }
    return result
  }, [rangeStart, rangeEnd, totalDays])

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <CalendarRange className="h-8 w-8 text-primary" /> Mapa de Alocação
        </h1>
        <p className="text-slate-500 mt-1">
          Visualize a disponibilidade de membros e prazos próximos.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total de Alocações</p>
              <p className="text-2xl font-bold text-slate-900">{allocations.length}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Membros Únicos</p>
              <p className="text-2xl font-bold text-slate-900">
                {new Set(allocations.map((a) => a.member_name)).size}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card
          className={`border-slate-200 shadow-sm ${deadlineCount > 0 ? 'ring-2 ring-red-200' : ''}`}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Prazos Próximos (7d)</p>
              <p
                className={`text-2xl font-bold ${deadlineCount > 0 ? 'text-red-600' : 'text-slate-900'}`}
              >
                {deadlineCount}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Timeline de Alocações</CardTitle>
          <CardDescription>
            Períodos ativos de cada membro. Barras em vermelho indicam prazo próximo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allocations.length === 0 ? (
            <div className="text-center py-12 text-slate-500">Nenhuma alocação encontrada.</div>
          ) : (
            <>
              <div className="flex mb-2">
                <div className="w-48 shrink-0" />
                <div className="flex-1 relative h-6">
                  {months.map((m, i) => (
                    <span
                      key={i}
                      className="absolute text-xs text-slate-400 font-medium transform -translate-x-1/2"
                      style={{ left: `${m.offset}%` }}
                    >
                      {m.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {sortedAllocs.map((alloc) => {
                  const aStart = new Date(normalizeDate(alloc.start_date) + 'T00:00:00')
                  const aEnd = new Date(normalizeDate(alloc.end_date) + 'T00:00:00')
                  const left = Math.max(
                    0,
                    Math.min(100, (differenceInDays(aStart, rangeStart) / totalDays) * 100),
                  )
                  const width = Math.max(
                    2,
                    Math.min(100 - left, (differenceInDays(aEnd, aStart) / totalDays) * 100),
                  )
                  const soon = isDeadlineSoon(alloc.end_date)
                  const colorClass = soon
                    ? 'bg-red-500'
                    : projColorMap[alloc.project] || 'bg-slate-400'
                  return (
                    <div
                      key={alloc.id}
                      className="flex items-center hover:bg-slate-50 rounded-lg p-1 transition-colors"
                    >
                      <div className="w-48 shrink-0 pr-3">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {alloc.member_name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{alloc.function}</p>
                      </div>
                      <div className="flex-1 relative h-7 bg-slate-100 rounded">
                        {todayOffset > 0 && todayOffset < 100 && (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
                            style={{ left: `${todayOffset}%` }}
                          />
                        )}
                        <div
                          className={`absolute h-7 rounded flex items-center px-2 overflow-hidden ${colorClass}`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`${projName(alloc.project)}: ${format(aStart, 'dd/MM/yyyy')} - ${format(aEnd, 'dd/MM/yyyy')}`}
                        >
                          <span className="text-[9px] text-white font-medium truncate whitespace-nowrap">
                            {projName(alloc.project)}
                          </span>
                        </div>
                      </div>
                      <div className="w-24 shrink-0 pl-2 text-right">
                        {soon ? (
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-600 border-red-200 text-xs"
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {format(aEnd, 'dd/MM')}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">{format(aEnd, 'dd/MM')}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-6 flex flex-wrap gap-3 pt-4 border-t border-slate-100">
                {projects.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded ${projColorMap[p.id] || 'bg-slate-400'}`} />
                    <span className="text-xs text-slate-600">{p.name}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-red-500" />
                  <span className="text-xs text-slate-600">Prazo próximo</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
