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

export function exportProjectReport(
  project: Project,
  _allocations: Allocation[],
  tasks: Task[],
  timeEntries: TimeEntry[],
): void {
  const headers = [
    'Nome do Cliente',
    'Nome do Projeto',
    'Setor do membro',
    'Nome do membro da equipe',
    'Data de Lançamento da Atividade',
    'Total da Hora Prevista',
    'Total de horas trabalhadas no período selecionado',
  ]

  const lines: string[] = [headers.map(escapeCsv).join(',')]

  const grouped = new Map<
    string,
    {
      memberName: string
      memberSector: string
      activityDate: string
      hours: number
      plannedHours: number
      taskIds: Set<string>
    }
  >()

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

    const existing = grouped.get(key)
    if (existing) {
      existing.hours += hours
      if (!existing.taskIds.has(task.id)) {
        existing.taskIds.add(task.id)
        existing.plannedHours += taskPlannedHours
      }
    } else {
      grouped.set(key, {
        memberName,
        memberSector,
        activityDate,
        hours,
        plannedHours: taskPlannedHours,
        taskIds: new Set([task.id]),
      })
    }
  }

  const sorted = Array.from(grouped.values()).sort((a, b) =>
    a.activityDate.localeCompare(b.activityDate),
  )

  for (const g of sorted) {
    lines.push(
      [
        escapeCsv(project.client || '—'),
        escapeCsv(project.name),
        escapeCsv(g.memberSector),
        escapeCsv(g.memberName),
        escapeCsv(formatDateBR(g.activityDate)),
        g.plannedHours.toFixed(2),
        g.hours.toFixed(2),
      ].join(','),
    )
  }

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
