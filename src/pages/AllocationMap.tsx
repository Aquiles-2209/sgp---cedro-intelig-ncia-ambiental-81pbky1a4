import { useMemo, useState } from 'react'
import {
  addMonths,
  startOfMonth,
  endOfMonth,
  format,
  differenceInCalendarDays,
  max as maxDate,
  min as minDate,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CalendarRange,
  Users,
  Clock,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Info,
} from 'lucide-react'
import { useAppState } from '@/hooks/use-app-state'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { normalizeDate } from '@/types/models'

interface MonthSlot {
  date: Date
  key: string // e.g. "2025-05"
  label: string // e.g. "Mai 25"
  fullLabel: string // e.g. "Maio de 2025"
  start: Date
  end: Date
}

function parseValidDate(dateStr?: string | null): Date | null {
  const norm = normalizeDate(dateStr)
  if (!norm) return null
  const d = new Date(norm + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}

/**
 * Retorna o status de ocupação baseado no percentual
 */
function getOccupancyStatus(percent: number) {
  if (percent > 100) {
    return {
      status: 'over' as const,
      colorHex: '#ef4444',
      barColor: 'bg-red-500',
      heatBg: 'bg-red-100 dark:bg-red-950/50',
      heatText: 'text-red-800 dark:text-red-300',
      heatBorder: 'border-red-200 dark:border-red-900',
      badgeBg: 'bg-red-50 text-red-700 border-red-200',
      label: 'Sobrecarregado (> 100%)',
    }
  }
  if (percent >= 80) {
    return {
      status: 'optimal' as const,
      colorHex: '#eab308',
      barColor: 'bg-amber-500',
      heatBg: 'bg-yellow-100 dark:bg-yellow-950/50',
      heatText: 'text-yellow-800 dark:text-yellow-300',
      heatBorder: 'border-yellow-200 dark:border-yellow-900',
      badgeBg: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      label: 'Alocação Alta (80% - 100%)',
    }
  }
  return {
    status: 'normal' as const,
    colorHex: '#22c55e',
    barColor: 'bg-emerald-500',
    heatBg: 'bg-green-100 dark:bg-green-950/50',
    heatText: 'text-green-800 dark:text-green-300',
    heatBorder: 'border-green-200 dark:border-green-900',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    label: 'Normal / Disponível (< 80%)',
  }
}

export default function AllocationMap() {
  const { teamMembers, tasks, taskAssignments, allocations, projects } = useAppState()
  const [activeFilter, setActiveFilter] = useState<'all' | 'overloaded' | 'high' | 'available'>(
    'all',
  )

  // Próximos 6 meses a partir do mês atual
  const next6Months: MonthSlot[] = useMemo(() => {
    const base = startOfMonth(new Date())
    const list: MonthSlot[] = []
    for (let i = 0; i < 6; i++) {
      const d = addMonths(base, i)
      list.push({
        date: d,
        key: format(d, 'yyyy-MM'),
        label: format(d, 'MMM yy', { locale: ptBR }),
        fullLabel: format(d, 'MMMM yyyy', { locale: ptBR }),
        start: startOfMonth(d),
        end: endOfMonth(d),
      })
    }
    return list
  }, [])

  // Mapa de projetos por ID
  const projectsById = useMemo(() => {
    const map = new Map<string, string>()
    projects.forEach((p) => {
      map.set(p.id, p.name)
    })
    return map
  }, [projects])

  // Membros CEDRO ordenados alfabeticamente
  const sortedMembers = useMemo(() => {
    return [...teamMembers].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }),
    )
  }, [teamMembers])

  // Cálculo de horas alocadas por membro em cada um dos 6 meses
  const memberMonthlyData = useMemo(() => {
    // Inicializar mapa de membro -> mês -> { hours, details }
    const memberHoursMap: Record<
      string,
      Record<
        string,
        {
          hours: number
          details: Array<{ title: string; projectName: string; hoursInMonth: number }>
        }
      >
    > = {}

    sortedMembers.forEach((m) => {
      memberHoursMap[m.id] = {}
      next6Months.forEach((slot) => {
        memberHoursMap[m.id][slot.key] = { hours: 0, details: [] }
      })
    })

    // Indexar tarefas e projetos
    // Caso 1: Task Assignments explícitos por tarefa
    // Caso 2: Se a tarefa tem "members" array (IDs)
    // Caso 3: Fallback de Projeto: se não houver assignments para a tarefa ou projeto, usar allocations
    // Vamos processar cada tarefa planejada com planned_hours > 0

    // Criar lookup de allocations por projeto para fallback
    const allocationsByProject: Record<string, string[]> = {}
    allocations.forEach((alloc) => {
      const projId = typeof alloc.project === 'string' ? alloc.project : (alloc.project as any)?.id
      if (!projId) return

      // Tentar associar membro via nome ou user
      const matchedMember = sortedMembers.find((m) => {
        if (
          alloc.member_name &&
          m.name &&
          m.name.trim().toLowerCase() === alloc.member_name.trim().toLowerCase()
        ) {
          return true
        }
        if (alloc.user && m.id === alloc.user) return true
        if (alloc.user && m.email && (alloc as any).expand?.user?.email === m.email) return true
        return false
      })

      if (matchedMember) {
        if (!allocationsByProject[projId]) allocationsByProject[projId] = []
        if (!allocationsByProject[projId].includes(matchedMember.id)) {
          allocationsByProject[projId].push(matchedMember.id)
        }
      }
    })

    tasks.forEach((task) => {
      const totalHours = Number(task.planned_hours) || 0
      if (totalHours <= 0) return

      const projId =
        typeof task.project === 'string'
          ? task.project
          : (task.project as any)?.id || task.expand?.project?.id || ''
      const currentProjectTitle =
        projectsById.get(projId) || task.expand?.project?.name || 'Projeto sem nome'

      // Encontrar datas de início e fim da tarefa
      let tStart = parseValidDate(task.start_date)
      let tEnd = parseValidDate(task.due_date)

      // Se não tiver data na task, fallback para created ou hoje + 30d
      if (!tStart && !tEnd) {
        tStart = parseValidDate(task.created) || new Date()
        tEnd = addMonths(tStart, 1)
      } else if (!tStart && tEnd) {
        tStart = parseValidDate(task.created) || startOfMonth(tEnd)
      } else if (tStart && !tEnd) {
        tEnd = endOfMonth(tStart)
      }

      if (!tStart || !tEnd) return
      if (tEnd < tStart) {
        const temp = tStart
        tStart = tEnd
        tEnd = temp
      }

      const totalDays = Math.max(1, differenceInCalendarDays(tEnd, tStart) + 1)
      const hoursPerDay = totalHours / totalDays

      // Identificar quem está atribuído a esta tarefa
      // 1) TaskAssignments
      const directAssignments = taskAssignments.filter((ta) => {
        const taTaskId = typeof ta.task === 'string' ? ta.task : (ta.task as any)?.id
        return taTaskId === task.id
      })
      let assignedMemberIds: string[] = []

      if (directAssignments.length > 0) {
        assignedMemberIds = directAssignments
          .map((ta) =>
            typeof ta.team_member === 'string' ? ta.team_member : (ta.team_member as any)?.id,
          )
          .filter(Boolean)
      } else if (Array.isArray(task.members) && task.members.length > 0) {
        assignedMemberIds = task.members
          .map((m: any) => (typeof m === 'string' ? m : m?.id))
          .filter(Boolean)
      } else if (
        projId &&
        allocationsByProject[projId] &&
        allocationsByProject[projId].length > 0
      ) {
        // Fallback: ratear as horas da tarefa igualmente entre os membros alocados no projeto
        assignedMemberIds = allocationsByProject[projId]
      }

      // Remover duplicatas e filtrar membros válidos
      const uniqueMemberIds = Array.from(new Set(assignedMemberIds)).filter(
        (id) => memberHoursMap[id],
      )

      if (uniqueMemberIds.length === 0) return

      // Cada membro recebe 1 / N das horas da tarefa
      const memberFactor = 1 / uniqueMemberIds.length

      // Ratear pelos 6 meses
      next6Months.forEach((slot) => {
        // Interseção entre [tStart, tEnd] e [slot.start, slot.end]
        const overlapStart = maxDate([tStart!, slot.start])
        const overlapEnd = minDate([tEnd!, slot.end])

        if (overlapStart <= overlapEnd) {
          const overlapDays = differenceInCalendarDays(overlapEnd, overlapStart) + 1
          const taskHoursInThisMonth = overlapDays * hoursPerDay * memberFactor

          if (taskHoursInThisMonth > 0) {
            uniqueMemberIds.forEach((mId) => {
              if (memberHoursMap[mId] && memberHoursMap[mId][slot.key]) {
                memberHoursMap[mId][slot.key].hours += taskHoursInThisMonth
                memberHoursMap[mId][slot.key].details.push({
                  title: task.title || 'Tarefa',
                  projectName: currentProjectTitle,
                  hoursInMonth: taskHoursInThisMonth,
                })
              }
            })
          }
        }
      })
    })

    // Montar resultado estruturado por membro
    return sortedMembers.map((member) => {
      const capacity = Number(member.monthly_capacity) > 0 ? Number(member.monthly_capacity) : 170

      const months = next6Months.map((slot) => {
        const allocatedHours = memberHoursMap[member.id]?.[slot.key]?.hours || 0
        const roundedHours = Math.round(allocatedHours * 10) / 10
        const percentage = Math.round((allocatedHours / capacity) * 100)
        const statusObj = getOccupancyStatus(percentage)
        const details = memberHoursMap[member.id]?.[slot.key]?.details || []

        return {
          ...slot,
          capacity,
          allocatedHours: roundedHours,
          percentage,
          ...statusObj,
          details,
        }
      })

      const currentMonthData = months[0]

      return {
        member,
        capacity,
        months,
        currentMonth: currentMonthData,
      }
    })
  }, [sortedMembers, next6Months, tasks, taskAssignments, allocations, projectsById])

  // Métricas do Topo (Resumo)
  const summaryMetrics = useMemo(() => {
    const totalMembers = sortedMembers.length
    const totalCapacity = sortedMembers.reduce((acc, m) => {
      const cap = Number(m.monthly_capacity) > 0 ? Number(m.monthly_capacity) : 170
      return acc + cap
    }, 0)

    if (memberMonthlyData.length === 0) {
      return {
        totalMembers: 0,
        totalCapacity: 0,
        currentAvgOccupancy: 0,
        currentOverloadedCount: 0,
        totalAllocatedHoursCurrentMonth: 0,
      }
    }

    const currentTotalAllocated = memberMonthlyData.reduce(
      (acc, item) => acc + item.currentMonth.allocatedHours,
      0,
    )
    const currentAvgOccupancy =
      totalCapacity > 0 ? Math.round((currentTotalAllocated / totalCapacity) * 100) : 0
    const currentOverloadedCount = memberMonthlyData.filter(
      (item) => item.currentMonth.percentage > 100,
    ).length

    return {
      totalMembers,
      totalCapacity,
      currentAvgOccupancy,
      currentOverloadedCount,
      totalAllocatedHoursCurrentMonth: Math.round(currentTotalAllocated),
    }
  }, [sortedMembers, memberMonthlyData])

  // Filtragem visual dos membros se o usuário clicar nos filtros
  const filteredMemberData = useMemo(() => {
    if (activeFilter === 'overloaded') {
      return memberMonthlyData.filter((item) => item.currentMonth.percentage > 100)
    }
    if (activeFilter === 'high') {
      return memberMonthlyData.filter(
        (item) => item.currentMonth.percentage >= 80 && item.currentMonth.percentage <= 100,
      )
    }
    if (activeFilter === 'available') {
      return memberMonthlyData.filter((item) => item.currentMonth.percentage < 80)
    }
    return memberMonthlyData
  }, [memberMonthlyData, activeFilter])

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-8 animate-fade-in-up pb-12">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
                <CalendarRange className="h-7 w-7" />
              </div>
              Mapa de Alocação
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
              Acompanhamento de capacidade mensal e distribuição de horas dos Usuários CEDRO para os
              próximos 6 meses.
            </p>
          </div>
        </div>

        {/* 3. CARDS DE RESUMO (Topo) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Usuários CEDRO */}
          <Card className="border-slate-200/80 shadow-sm hover:shadow transition-all duration-200">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Usuário(a)s CEDRO
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-2xl font-bold text-slate-900">{summaryMetrics.totalMembers}</p>
                  <span className="text-xs text-slate-500">membros ativos</span>
                </div>
              </div>
              <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80 shadow-xs">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Capacidade Total Somada */}
          <Card className="border-slate-200/80 shadow-sm hover:shadow transition-all duration-200">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Capacidade Total
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-2xl font-bold text-slate-900">
                    {summaryMetrics.totalCapacity.toLocaleString('pt-BR')}h
                  </p>
                  <span className="text-xs text-slate-500">/mês global</span>
                </div>
              </div>
              <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/80 shadow-xs">
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Média de Ocupação no Mês Atual */}
          <Card
            className="border-slate-200/80 shadow-sm hover:shadow transition-all duration-200 cursor-pointer"
            onClick={() => setActiveFilter(activeFilter === 'all' ? 'all' : 'all')}
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Média Ocupação ({next6Months[0]?.label})
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-2xl font-bold text-slate-900">
                    {summaryMetrics.currentAvgOccupancy}%
                  </p>
                  <span className="text-xs text-slate-500">
                    ({summaryMetrics.totalAllocatedHoursCurrentMonth}h alocadas)
                  </span>
                </div>
              </div>
              <div className="h-11 w-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100/80 shadow-xs">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Membros Sobrecarregados no Mês Atual */}
          <Card
            className={`border-slate-200/80 shadow-sm hover:shadow transition-all duration-200 cursor-pointer ${
              summaryMetrics.currentOverloadedCount > 0 ? 'ring-2 ring-red-200 bg-red-50/20' : ''
            }`}
            onClick={() => setActiveFilter(activeFilter === 'overloaded' ? 'all' : 'overloaded')}
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Sobrecarregados ({next6Months[0]?.label})
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p
                    className={`text-2xl font-bold ${
                      summaryMetrics.currentOverloadedCount > 0 ? 'text-red-600' : 'text-slate-900'
                    }`}
                  >
                    {summaryMetrics.currentOverloadedCount}
                  </p>
                  <span className="text-xs text-slate-500">
                    {summaryMetrics.currentOverloadedCount === 1
                      ? 'membro (>100%)'
                      : 'membros (>100%)'}
                  </span>
                </div>
              </div>
              <div
                className={`h-11 w-11 rounded-xl flex items-center justify-center border shadow-xs ${
                  summaryMetrics.currentOverloadedCount > 0
                    ? 'bg-red-100 text-red-600 border-red-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 1. TIMELINE DE CAPACIDADE (Seção Principal) */}
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span>Timeline de Capacidade</span>
                  <Badge
                    variant="outline"
                    className="font-normal text-xs text-slate-600 bg-slate-50"
                  >
                    Próximos 6 Meses
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Capacidade mensal de 170h (ou personalizada) com barras verticais proporcionais às
                  horas alocadas.
                </CardDescription>
              </div>

              {/* Filtro rápido */}
              <div className="flex items-center gap-1.5 self-start sm:self-center bg-slate-100 p-1 rounded-lg text-xs font-medium text-slate-600">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Todos ({memberMonthlyData.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('overloaded')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeFilter === 'overloaded'
                      ? 'bg-red-500 text-white shadow-xs font-semibold'
                      : 'hover:text-red-600'
                  }`}
                >
                  &gt;100% ({summaryMetrics.currentOverloadedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('available')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeFilter === 'available'
                      ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                      : 'hover:text-emerald-700'
                  }`}
                >
                  &lt;80%
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {filteredMemberData.length === 0 ? (
              <div className="text-center py-12 text-slate-500 space-y-2">
                <p className="font-medium text-slate-700">Nenhum Usuário CEDRO encontrado.</p>
                <p className="text-xs text-slate-400">
                  {activeFilter !== 'all'
                    ? 'Nenhum membro corresponde ao filtro selecionado.'
                    : 'Cadastre Usuários CEDRO e tarefas com horas planejadas para visualizar o mapa.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  {/* Cabeçalho dos meses */}
                  <div className="flex items-center pb-3 border-b border-slate-100 mb-4 text-xs font-semibold text-slate-500">
                    <div className="w-56 shrink-0 pr-4">Usuário(a) CEDRO</div>
                    <div className="flex-1 grid grid-cols-6 gap-3 text-center">
                      {next6Months.map((slot, index) => (
                        <div
                          key={slot.key}
                          className={`py-1 rounded font-medium flex flex-col items-center ${
                            index === 0
                              ? 'bg-primary/5 text-primary border border-primary/20 font-bold'
                              : 'text-slate-600'
                          }`}
                        >
                          <span className="capitalize">{slot.label}</span>
                          {index === 0 && (
                            <span className="text-[10px] font-normal text-primary/80">
                              Mês Atual
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Linhas de Membros */}
                  <div className="space-y-3">
                    {filteredMemberData.map(({ member, capacity, months }) => (
                      <div
                        key={member.id}
                        className="flex items-center p-2.5 rounded-xl hover:bg-slate-50/80 transition-colors border border-transparent hover:border-slate-100"
                      >
                        {/* Identificação do Usuário */}
                        <div className="w-56 shrink-0 pr-4 flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase shrink-0 border border-slate-200">
                            {member.avatar ? (
                              <img
                                src={member.avatar}
                                alt={member.name}
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : (
                              (member.name || 'U').slice(0, 2)
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-sm font-semibold text-slate-900 truncate"
                              title={member.name}
                            >
                              {member.name}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <span className="font-medium text-slate-600 truncate max-w-[90px]">
                                {member.function || 'Membro'}
                              </span>
                              <span>•</span>
                              <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded text-[11px]">
                                {capacity}h/mês
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Colunas dos 6 Meses com Barra de Capacidade */}
                        <div className="flex-1 grid grid-cols-6 gap-3">
                          {months.map((m) => {
                            // Altura proporcional: se 85h em 170h capacity -> 50%
                            // Cap em 100% para não vazar a caixa visualmente, mas o percentual e tooltip mostram o real
                            const barHeightPercent = Math.min(100, Math.max(0, m.percentage))

                            return (
                              <Tooltip key={m.key}>
                                <TooltipTrigger asChild>
                                  <div className="cursor-pointer flex flex-col items-center justify-center group">
                                    {/* Slot da Barra de Capacidade (Fundo Cinza Claro 170h) */}
                                    <div className="w-full h-14 bg-slate-100 rounded-lg relative overflow-hidden flex items-end border border-slate-200/70 p-0.5 group-hover:border-slate-400/60 transition-all">
                                      {/* Linha pontilhada indicando 100% da capacidade */}
                                      <div className="absolute top-0 left-0 right-0 border-t border-slate-300 z-10 opacity-40 pointer-events-none" />

                                      {/* Barra sobreposta colorida proporcional */}
                                      <div
                                        className={`w-full rounded-md transition-all duration-300 ${m.barColor} ${
                                          m.percentage > 100 ? 'shadow-sm animate-pulse' : ''
                                        }`}
                                        style={{
                                          height: `${barHeightPercent}%`,
                                        }}
                                      />

                                      {/* Texto flutuante discreto com o valor em horas */}
                                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700 z-20 pointer-events-none drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                                        {m.allocatedHours > 0 ? `${m.allocatedHours}h` : '0h'}
                                      </span>
                                    </div>

                                    {/* Percentual abaixo da barra */}
                                    <span
                                      className={`text-[11px] font-semibold mt-1 ${
                                        m.percentage > 100
                                          ? 'text-red-600 font-bold'
                                          : m.percentage >= 80
                                            ? 'text-amber-600'
                                            : 'text-slate-500'
                                      }`}
                                    >
                                      {m.percentage}%
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="max-w-xs p-3 bg-slate-900 text-white border-slate-800 shadow-xl"
                                >
                                  <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                                      <span className="font-bold text-slate-100">
                                        {member.name}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className={`text-[10px] px-1.5 py-0 ${
                                          m.percentage > 100
                                            ? 'bg-red-950 text-red-300 border-red-700'
                                            : m.percentage >= 80
                                              ? 'bg-amber-950 text-amber-300 border-amber-700'
                                              : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                        }`}
                                      >
                                        {m.percentage}%
                                      </Badge>
                                    </div>
                                    <p className="text-slate-300 capitalize">
                                      <span className="text-slate-400">Mês:</span> {m.fullLabel}
                                    </p>
                                    <p className="text-slate-300">
                                      <span className="text-slate-400">Alocação:</span>{' '}
                                      <strong className="text-white">{m.allocatedHours}h</strong> /{' '}
                                      {m.capacity}h ({m.percentage}%)
                                    </p>
                                    <p className="text-slate-300">
                                      <span className="text-slate-400">Disponibilidade:</span>{' '}
                                      <strong
                                        className={
                                          m.capacity - m.allocatedHours < 0
                                            ? 'text-red-400'
                                            : 'text-emerald-400'
                                        }
                                      >
                                        {Math.round((m.capacity - m.allocatedHours) * 10) / 10}h
                                      </strong>
                                    </p>
                                    {m.details && m.details.length > 0 && (
                                      <div className="pt-1.5 border-t border-slate-800 space-y-1">
                                        <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                                          Tarefas Alocadas no Mês:
                                        </p>
                                        <ul className="space-y-1 max-h-24 overflow-y-auto pr-1">
                                          {m.details.map((d, i) => (
                                            <li
                                              key={i}
                                              className="text-[11px] text-slate-300 flex justify-between gap-2"
                                            >
                                              <span className="truncate" title={d.title}>
                                                • {d.title} ({d.projectName})
                                              </span>
                                              <span className="font-semibold text-white shrink-0">
                                                {Math.round(d.hoursInMonth * 10) / 10}h
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Legenda da Timeline */}
                  <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 text-slate-400" />
                        Capacidade (170h):
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded bg-emerald-500" />
                        <span>&lt; 80% (Disponível)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded bg-amber-500" />
                        <span>80% a 100% (Ocupação Ideal / Alta)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded bg-red-500" />
                        <span>&gt; 100% (Sobrecarregado)</span>
                      </div>
                    </div>
                    <span className="text-slate-400 text-[11px]">
                      Fundo cinza claro = 100% da capacidade mensal do membro.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. HEATMAP DE ALOCAÇÃO (Segunda Seção, Abaixo da Timeline) */}
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span>Heatmap de Alocação</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Matriz de calor da taxa de ocupação dos Usuários CEDRO para planejamento a médio
                  prazo.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {filteredMemberData.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                Nenhum dado para exibir no Heatmap.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  {/* Tabela do Heatmap */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
                    {/* Header */}
                    <div className="grid grid-cols-7 bg-slate-50/90 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <div className="p-3 border-r border-slate-200">Usuário(a) CEDRO</div>
                      {next6Months.map((slot, i) => (
                        <div
                          key={slot.key}
                          className={`p-3 text-center capitalize border-r border-slate-200 last:border-r-0 ${
                            i === 0 ? 'bg-primary/5 text-primary font-bold' : ''
                          }`}
                        >
                          {slot.label}
                        </div>
                      ))}
                    </div>

                    {/* Linhas da Matriz */}
                    <div className="divide-y divide-slate-100">
                      {filteredMemberData.map(({ member, capacity, months }) => (
                        <div
                          key={`hm-${member.id}`}
                          className="grid grid-cols-7 items-stretch hover:bg-slate-50/50 transition-colors"
                        >
                          {/* Coluna do Membro */}
                          <div className="p-3 border-r border-slate-200/80 flex flex-col justify-center bg-white">
                            <span
                              className="text-xs font-semibold text-slate-900 truncate"
                              title={member.name}
                            >
                              {member.name}
                            </span>
                            <span className="text-[11px] text-slate-500">Cap: {capacity}h/mês</span>
                          </div>

                          {/* Células de Heatmap para os 6 meses */}
                          {months.map((m) => {
                            return (
                              <Tooltip key={`hm-${member.id}-${m.key}`}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`p-3 flex items-center justify-center border-r border-slate-200/60 last:border-r-0 cursor-pointer transition-all hover:scale-[1.02] hover:z-10 ${m.heatBg}`}
                                  >
                                    <span
                                      className={`text-xs font-bold tracking-tight ${m.heatText}`}
                                    >
                                      {m.percentage}%
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="p-2.5 bg-slate-900 text-white text-xs space-y-1 shadow-lg"
                                >
                                  <p className="font-bold text-slate-100">{member.name}</p>
                                  <p className="text-slate-300 capitalize">
                                    {m.fullLabel}:{' '}
                                    <strong className="text-white">
                                      {m.allocatedHours}h / {m.capacity}h
                                    </strong>
                                  </p>
                                  <p className="text-slate-300">
                                    Ocupação:{' '}
                                    <strong className="text-white">{m.percentage}%</strong>
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Legenda do Heatmap */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-700">
                    <span className="font-semibold text-slate-900">Legenda de Ocupação:</span>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-800 border border-green-200">
                          &lt; 80%
                        </span>
                        <span className="text-slate-600">🟢 Disponível / Adequado</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                          80% - 100%
                        </span>
                        <span className="text-slate-600">🟡 Ocupação Alta / Ideal</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                          &gt; 100%
                        </span>
                        <span className="text-slate-600">🔴 Sobrecarregado</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
