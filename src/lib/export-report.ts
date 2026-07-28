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

  const sortedAllocations = [...allocations].sort((a, b) =>
    normalizeDate(a.start_date || '').localeCompare(normalizeDate(b.start_date || '')),
  )

  for (const alloc of sortedAllocations) {
    const allocTasks = tasks.filter((t) => {
      const ta = t.allocation
      if (Array.isArray(ta)) return ta.includes(alloc.id)
      return ta === alloc.id
    })

    const allocTimeEntries = timeEntries.filter((te) => te.allocation === alloc.id)

    const plannedHours = allocTasks.reduce((sum, t) => sum + (t.planned_hours || 0), 0)
    const allocatedHours = allocTasks.reduce((sum, t) => sum + (t.allocated_hours || 0), 0)
    const hoursWorked = allocTimeEntries.reduce((sum, te) => sum + (te.duration || 0), 0) / 3600

    totalPlanned += plannedHours
    totalAllocated += allocatedHours
    totalWorked += hoursWorked

    const activityTitle =
      allocTasks
        .map((t) => t.title)
        .filter(Boolean)
        .join('; ') || '—'
    const activityDate = normalizeDate(alloc.start_date || '')

    lines.push(
      [
        escapeCsv(project.client || '—'),
        escapeCsv(project.name),
        escapeCsv(projectSetor),
        escapeCsv(alloc.member_name || '—'),
        escapeCsv(activityTitle),
        escapeCsv(formatDateBR(activityDate)),
        plannedHours.toFixed(2),
        allocatedHours.toFixed(2),
        hoursWorked.toFixed(2),
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
