import { Project, Allocation, Task, TimeEntry, normalizeDate } from '@/types/models'

function escapeCsv(value: string): string {
  if (!value) return ''
  const needsQuotes = value.includes(',') || value.includes('"') || value.includes('\n')
  const escaped = value.replace(/"/g, '""')
  return needsQuotes ? `"${escaped}"` : escaped
}

function formatDateBR(dateStr: string): string {
  const normalized = normalizeDate(dateStr)
  if (!normalized) return ''
  const [year, month, day] = normalized.split('-')
  return `${day}/${month}/${year}`
}

interface GroupedRow {
  memberName: string
  memberSector: string
  activityTitle: string
  activityDate: string
  hours: number
  plannedHours: number
  allocatedHours: number
  taskIds: Set<string>
}

export function exportProjectReport(
  project: Project,
  _allocations: Allocation[],
  tasks: Task[],
  timeEntries: TimeEntry[],
): void {
  const headers = [
    'Nome do Cliente',
    'Nome do Projeto',
    'Setor do Usuário CEDRO',
    'Nome do Usuário CEDRO da equipe',
    'Nome da Atividade',
    'Data de Lançamento da Atividade',
    'Total da Hora Prevista',
    'Total da Hora Alocada',
    'Total de horas trabalhadas no período selecionado',
  ]

  const lines: string[] = [headers.map(escapeCsv).join(',')]

  const grouped = new Map<string, GroupedRow>()

  for (const te of timeEntries) {
    const task = tasks.find((t) => t.id === te.task)
    if (!task) continue

    const teamMember = te.expand?.team_member
    const memberName = teamMember?.name || '—'
    const memberSector = teamMember?.setor || '—'
    const activityDate = normalizeDate(te.start_time || '')
    const key = `${memberName}|${activityDate}`
    const hours = (te.duration || 0) / 3600
    const taskPlannedHours = task.planned_hours || 0
    const taskAllocatedHours = task.allocated_hours || 0

    const existing = grouped.get(key)
    if (existing) {
      existing.hours += hours
      existing.activityTitle = existing.activityTitle + '; ' + (task.title || '—')
      if (!existing.taskIds.has(task.id)) {
        existing.taskIds.add(task.id)
        existing.plannedHours += taskPlannedHours
        existing.allocatedHours += taskAllocatedHours
      }
    } else {
      grouped.set(key, {
        memberName,
        memberSector,
        activityTitle: task.title || '—',
        activityDate,
        hours,
        plannedHours: taskPlannedHours,
        allocatedHours: taskAllocatedHours,
        taskIds: new Set([task.id]),
      })
    }
  }

  const sorted = Array.from(grouped.values()).sort((a, b) =>
    a.activityDate.localeCompare(b.activityDate),
  )

  let totalPlanned = 0
  let totalAllocated = 0
  let totalWorked = 0

  for (const g of sorted) {
    totalPlanned += g.plannedHours
    totalAllocated += g.allocatedHours
    totalWorked += g.hours

    lines.push(
      [
        escapeCsv(project.client || '—'),
        escapeCsv(project.name),
        escapeCsv(g.memberSector),
        escapeCsv(g.memberName),
        escapeCsv(g.activityTitle),
        escapeCsv(formatDateBR(g.activityDate)),
        g.plannedHours.toFixed(2),
        g.allocatedHours.toFixed(2),
        g.hours.toFixed(2),
      ].join(','),
    )
  }

  lines.push(
    [
      escapeCsv(''),
      escapeCsv(''),
      escapeCsv(''),
      escapeCsv(''),
      escapeCsv('TOTAL GERAL'),
      escapeCsv(''),
      totalPlanned.toFixed(2),
      totalAllocated.toFixed(2),
      totalWorked.toFixed(2),
    ].join(','),
  )

  const csvContent = '\uFEFF' + lines.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const safeName = project.name.replace(/[^a-zA-Z0-9]/g, '_')
  link.setAttribute('href', url)
  link.setAttribute('download', `relatorio_${safeName}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
