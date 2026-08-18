import { useState, useMemo } from 'react'
import { BarChart3, Clock, CheckCircle, TrendingUp, Briefcase } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { useAppState } from '@/hooks/use-app-state'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDuration } from '@/types/models'

const STATUS_COLORS: Record<string, string> = {
  Pendente: 'hsl(43, 90%, 55%)',
  'Em Andamento': 'hsl(217, 91%, 60%)',
  Concluído: 'hsl(142, 71%, 45%)',
}

const chartConfig: ChartConfig = {
  hours: { label: 'Horas', color: 'hsl(217, 91%, 60%)' },
  Pendente: { label: 'Pendente', color: STATUS_COLORS['Pendente'] },
  'Em Andamento': { label: 'Em Andamento', color: STATUS_COLORS['Em Andamento'] },
  Concluído: { label: 'Concluído', color: STATUS_COLORS['Concluído'] },
}

export default function PerformanceDashboard() {
  const { projects, tasks, timeEntries, allocations } = useAppState()
  const [projectFilter, setProjectFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filteredTE = useMemo(() => {
    return timeEntries.filter((te) => {
      if (projectFilter !== 'all') {
        const task = tasks.find((t) => t.id === te.task)
        if (!task || task.project !== projectFilter) return false
      }
      const teDate = new Date(te.start_time)
      if (isNaN(teDate.getTime())) return false
      if (dateFrom) {
        const from = new Date(dateFrom + 'T00:00:00')
        if (teDate < from) return false
      }
      if (dateTo) {
        const to = new Date(dateTo + 'T23:59:59')
        if (teDate > to) return false
      }
      return true
    })
  }, [timeEntries, tasks, projectFilter, dateFrom, dateTo])

  const filteredTasks = useMemo(
    () => tasks.filter((t) => projectFilter === 'all' || t.project === projectFilter),
    [tasks, projectFilter],
  )

  const effortByMember = useMemo(() => {
    const byAlloc: Record<string, number> = {}
    for (const te of filteredTE) {
      byAlloc[te.allocation] = (byAlloc[te.allocation] || 0) + (te.duration || 0)
    }
    return Object.entries(byAlloc)
      .map(([allocId, duration]) => {
        const alloc = allocations.find((a) => a.id === allocId)
        return {
          name: alloc?.member_name || 'Desconhecido',
          hours: Math.round((duration / 3600) * 100) / 100,
        }
      })
      .sort((a, b) => b.hours - a.hours)
  }, [filteredTE, allocations])

  const taskStatusData = useMemo(() => {
    const counts: Record<string, number> = {
      Pendente: 0,
      'Em Andamento': 0,
      Concluído: 0,
    }
    for (const t of filteredTasks) counts[t.status] = (counts[t.status] || 0) + 1
    return [
      { name: 'Pendente', value: counts['Pendente'], fill: STATUS_COLORS['Pendente'] },
      { name: 'Em Andamento', value: counts['Em Andamento'], fill: STATUS_COLORS['Em Andamento'] },
      { name: 'Concluído', value: counts['Concluído'], fill: STATUS_COLORS['Concluído'] },
    ]
  }, [filteredTasks])

  const projectOverview = useMemo(() => {
    return projects
      .filter((p) => projectFilter === 'all' || p.id === projectFilter)
      .map((p) => {
        const projTasks = tasks.filter((t) => t.project === p.id)
        const completed = projTasks.filter((t) => t.status === 'Concluído').length
        const total = projTasks.length
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0
        const projTime = timeEntries
          .filter((te) => projTasks.some((t) => t.id === te.task))
          .reduce((sum, te) => sum + (te.duration || 0), 0)
        return { ...p, totalTasks: total, completedTasks: completed, progress, totalTime: projTime }
      })
  }, [projects, tasks, timeEntries, projectFilter])

  const totalHours = filteredTE.reduce((sum, te) => sum + (te.duration || 0), 0)

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" /> Dashboard de Desempenho
        </h1>
        <p className="text-slate-500 mt-1">Métricas de produtividade e progresso da equipe.</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Projeto</Label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os projetos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os projetos</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">De</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full sm:w-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Até</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full sm:w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Tempo Total</p>
              <p className="text-2xl font-bold text-slate-900">{formatDuration(totalHours)}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Tarefas Concluídas</p>
              <p className="text-2xl font-bold text-slate-900">
                {filteredTasks.filter((t) => t.status === 'Concluído').length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Tarefas Ativas</p>
              <p className="text-2xl font-bold text-slate-900">
                {filteredTasks.filter((t) => t.status === 'Em Andamento').length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Projetos Ativos</p>
              <p className="text-2xl font-bold text-slate-900">
                {projects.filter((p) => p.status === 'Em Andamento').length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Esforço por Usuário(a) CEDRO</CardTitle>
            <CardDescription>Horas trabalhadas por Usuário(a) CEDRO</CardDescription>
          </CardHeader>
          <CardContent>
            {effortByMember.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-12">Nenhum dado disponível.</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart
                  data={effortByMember}
                  margin={{ top: 10, right: 10, bottom: 30, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="hours" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Distribuição de Tarefas</CardTitle>
            <CardDescription>Status atual das tarefas</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTasks.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-12">Nenhuma tarefa encontrada.</p>
            ) : (
              <>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                    <Pie
                      data={taskStatusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {taskStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {taskStatusData.map((s) => (
                    <div key={s.name} className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded" style={{ backgroundColor: s.fill }} />
                      <span className="text-xs text-slate-600">
                        {s.name} ({s.value})
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Visão Geral de Projetos</CardTitle>
          <CardDescription>Progresso baseado em tarefas concluídas</CardDescription>
        </CardHeader>
        <CardContent>
          {projectOverview.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">Nenhum projeto encontrado.</p>
          ) : (
            <div className="space-y-4">
              {projectOverview.map((p) => (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-900">{p.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {p.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>
                        {p.completedTasks}/{p.totalTasks} tarefas
                      </span>
                      <span>{formatDuration(p.totalTime)}</span>
                      <span className="font-medium text-slate-700">{p.progress}%</span>
                    </div>
                  </div>
                  <Progress value={p.progress} className="h-2" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
