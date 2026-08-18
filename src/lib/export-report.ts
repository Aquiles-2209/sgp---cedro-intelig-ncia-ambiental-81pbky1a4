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

function resolveMemberName(te: TimeEntry, allocationMap: Map<string, Allocation>): string {
  if (te.allocation) {
    const alloc = allocationMap.get(te.allocation)
    if (alloc?.member_name) return alloc.member_name
    if (te.expand?.allocation?.member_name) return te.expand.allocation.member_name
  }
  if (te.expand?.team_member?.name) return te.expand.team_member.name
  return '—'
}

interface ReportGroup {
  memberName: string
  taskTitle: string
  activityDate: string
  launchDate: string
  plannedHours: number
  allocatedHours: number
  hoursWorked: number
}

export function exportProjectReport(
  project: Project,
  allocations: Allocation[],
  tasks: Task[],
  timeEntries: TimeEntry[],
  startDate: string,
  endDate: string,
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
    'Total Horas',
    'Saldo Horas',
  ]

  const lines: string[] = [headers.map(escapeCsv).join(',')]

  const projectSetor = project.setor || '—'
  let totalPlanned = 0
  let totalAllocated = 0
  let totalWorked = 0
  let totalTotal = 0

  const allocationMap = new Map(allocations.map((a) => [a.id, a]))

  const timeEntriesByTask = new Map<string, TimeEntry[]>()
  for (const te of timeEntries) {
    if (!te.task) continue
    const list = timeEntriesByTask.get(te.task)
    if (list) {
      list.push(te)
    } else {
      timeEntriesByTask.set(te.task, [te])
    }
  }

  const groupMap = new Map<string, ReportGroup>()

  for (const task of tasks) {
    const taskTitle = (task.title || '').trim()
    if (!taskTitle) continue

    const taskAllocIds: string[] = Array.isArray(task.allocation)
      ? task.allocation
      : task.allocation
        ? [task.allocation]
        : []

    const allTaskTimeEntries = timeEntriesByTask.get(task.id) || []

    const memberHoursMap = new Map<string, number>()
    const memberLaunchDateMap = new Map<string, string>()
    for (const te of allTaskTimeEntries) {
      const memberName = resolveMemberName(te, allocationMap)
      const hours = (te.duration || 0) / 3600
      memberHoursMap.set(memberName, (memberHoursMap.get(memberName) || 0) + hours)
      const created = te.created || ''
      if (created) {
        const existing = memberLaunchDateMap.get(memberName)
        if (!existing || created < existing) {
          memberLaunchDateMap.set(memberName, created)
        }
      }
    }

    const memberDateMap = new Map<string, string>()
    for (const allocId of taskAllocIds) {
      const alloc = allocationMap.get(allocId)
      if (!alloc) continue
      const memberName = alloc.member_name || '—'
      if (!memberDateMap.has(memberName)) {
        memberDateMap.set(memberName, normalizeDate(alloc.start_date || ''))
      }
    }
    for (const memberName of memberHoursMap.keys()) {
      if (!memberDateMap.has(memberName)) {
        memberDateMap.set(memberName, '')
      }
    }

    if (memberDateMap.size === 0) {
      const key = `—||${taskTitle}`
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          memberName: '—',
          taskTitle,
          activityDate: '',
          launchDate: '',
          plannedHours: task.planned_hours || 0,
          allocatedHours: task.allocated_hours || 0,
          hoursWorked: 0,
        })
      }
      continue
    }

    for (const [memberName, activityDate] of memberDateMap) {
      const key = `${memberName}||${taskTitle}`
      const hoursWorked = memberHoursMap.get(memberName) || 0
      const launchDate = memberLaunchDateMap.get(memberName) || ''

      const existing = groupMap.get(key)
      if (existing) {
        existing.hoursWorked += hoursWorked
        if (launchDate && (!existing.launchDate || launchDate < existing.launchDate)) {
          existing.launchDate = launchDate
        }
      } else {
        groupMap.set(key, {
          memberName,
          taskTitle,
          activityDate,
          launchDate,
          plannedHours: task.planned_hours || 0,
          allocatedHours: task.allocated_hours || 0,
          hoursWorked,
        })
      }
    }
  }

  const sortedGroups = [...groupMap.values()].sort((a, b) => {
    const dateA = a.launchDate || a.activityDate || ''
    const dateB = b.launchDate || b.activityDate || ''
    return dateA.localeCompare(dateB)
  })

  const filteredGroups = sortedGroups.filter((group) => {
    const normalizedActivityDate = normalizeDate(group.activityDate)
    const normalizedLaunchDate = normalizeDate(group.launchDate)

    if (!normalizedActivityDate && !normalizedLaunchDate) return false

    const activityInRange =
      normalizedActivityDate !== '' &&
      normalizedActivityDate >= startDate &&
      normalizedActivityDate <= endDate
    const launchInRange =
      normalizedLaunchDate !== '' &&
      normalizedLaunchDate >= startDate &&
      normalizedLaunchDate <= endDate

    return activityInRange || launchInRange
  })

  filteredGroups.forEach((group, idx) => {
    const groupTotal = group.allocatedHours + group.hoursWorked
    const groupBalance = group.plannedHours - groupTotal

    totalPlanned += group.plannedHours
    totalAllocated += group.allocatedHours
    totalWorked += group.hoursWorked
    totalTotal += groupTotal

    const showTask = idx === 0 || filteredGroups[idx - 1].taskTitle !== group.taskTitle

    lines.push(
      [
        escapeCsv(project.client || '—'),
        escapeCsv(project.name),
        escapeCsv(projectSetor),
        escapeCsv(group.memberName),
        escapeCsv(showTask ? group.taskTitle : ''),
        escapeCsv(formatDateBR(group.activityDate)),
        group.plannedHours.toFixed(2),
        group.allocatedHours.toFixed(2),
        group.hoursWorked.toFixed(2),
        groupTotal.toFixed(2),
        groupBalance.toFixed(2),
      ].join(','),
    )
  })

  const totalBalance = totalPlanned - totalTotal

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
      totalTotal.toFixed(2),
      totalBalance.toFixed(2),
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
