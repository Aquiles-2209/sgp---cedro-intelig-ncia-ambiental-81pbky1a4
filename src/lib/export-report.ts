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

interface ReportGroup {
  memberName: string
  taskTitle: string
  activityDate: string
  plannedHours: number
  allocatedHours: number
  hoursWorked: number
}

export function exportProjectReport(
  project: Project,
  allocations: Allocation[],
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

  const projectSetor = project.setor || '—'
  let totalPlanned = 0
  let totalAllocated = 0
  let totalWorked = 0

  const allocationMap = new Map(allocations.map((a) => [a.id, a]))

  const groupMap = new Map<string, ReportGroup>()

  for (const task of tasks) {
    const taskTitle = (task.title || '').trim()
    if (!taskTitle) continue

    const taskAllocIds: string[] = Array.isArray(task.allocation)
      ? task.allocation
      : task.allocation
        ? [task.allocation]
        : []

    if (taskAllocIds.length === 0) {
      const key = `—||${taskTitle}`
      const existing = groupMap.get(key)
      if (!existing) {
        groupMap.set(key, {
          memberName: '—',
          taskTitle,
          activityDate: '',
          plannedHours: task.planned_hours || 0,
          allocatedHours: task.allocated_hours || 0,
          hoursWorked: 0,
        })
      }
      continue
    }

    for (const allocId of taskAllocIds) {
      const alloc = allocationMap.get(allocId)
      if (!alloc) continue

      const memberName = alloc.member_name || '—'
      const key = `${memberName}||${taskTitle}`

      const taskTimeEntries = timeEntries.filter(
        (te) => te.task === task.id && te.allocation === allocId,
      )
      const hoursWorked = taskTimeEntries.reduce((sum, te) => sum + (te.duration || 0), 0) / 3600

      const existing = groupMap.get(key)
      if (existing) {
        existing.hoursWorked += hoursWorked
      } else {
        groupMap.set(key, {
          memberName,
          taskTitle,
          activityDate: normalizeDate(alloc.start_date || ''),
          plannedHours: task.planned_hours || 0,
          allocatedHours: task.allocated_hours || 0,
          hoursWorked,
        })
      }
    }
  }

  const sortedGroups = [...groupMap.values()].sort((a, b) =>
    (a.activityDate || '').localeCompare(b.activityDate || ''),
  )

  for (const group of sortedGroups) {
    totalPlanned += group.plannedHours
    totalAllocated += group.allocatedHours
    totalWorked += group.hoursWorked

    lines.push(
      [
        escapeCsv(project.client || '—'),
        escapeCsv(project.name),
        escapeCsv(projectSetor),
        escapeCsv(group.memberName),
        escapeCsv(group.taskTitle),
        escapeCsv(formatDateBR(group.activityDate)),
        group.plannedHours.toFixed(2),
        group.allocatedHours.toFixed(2),
        group.hoursWorked.toFixed(2),
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
