import pb from '@/lib/pocketbase/client'
import { normalizeDate } from '@/types/models'

export interface ReportRow {
  client: string
  projectName: string
  memberSector: string
  memberName: string
  completionDate: string
  hoursWorked: number
}

function formatDateBR(dateStr: string): string {
  const normalized = normalizeDate(dateStr)
  if (!normalized) return ''
  const [year, month, day] = normalized.split('-')
  return `${day}/${month}/${year}`
}

export async function fetchReportData(
  projectIds: string[],
  startDate: string,
  endDate: string,
): Promise<ReportRow[]> {
  const projectFilter = projectIds.map((id) => `project = "${id}"`).join(' || ')
  const tasks = await pb.collection('tasks').getFullList({ filter: projectFilter })
  const taskIds = tasks.map((t) => t.id)

  if (taskIds.length === 0) return []

  const BATCH_SIZE = 20
  const batches: Promise<any[]>[] = []

  for (let i = 0; i < taskIds.length; i += BATCH_SIZE) {
    const batch = taskIds.slice(i, i + BATCH_SIZE)
    const taskFilter = batch.map((id) => `task = "${id}"`).join(' || ')
    const filter = `(${taskFilter}) && end_time >= "${startDate}" && end_time <= "${endDate} 23:59:59"`
    batches.push(
      pb.collection('time_entries').getFullList({
        filter,
        expand: 'task.project,team_member',
        sort: 'end_time',
      }),
    )
  }

  const results = await Promise.all(batches)
  const timeEntries = results.flat()

  const latestTimeByTaskMember = new Map<string, string>()

  for (const te of timeEntries) {
    const expand = te.expand as any
    const task = expand?.task
    const teamMember = expand?.team_member
    const taskMemberKey = `${task?.id || ''}|${teamMember?.id || ''}`
    const endTime = normalizeDate(te.end_time || '')
    if (endTime) {
      const existing = latestTimeByTaskMember.get(taskMemberKey)
      if (!existing || endTime > existing) {
        latestTimeByTaskMember.set(taskMemberKey, endTime)
      }
    }
  }

  const grouped = new Map<string, { row: ReportRow; sortDate: string }>()

  for (const te of timeEntries) {
    const expand = te.expand as any
    const task = expand?.task
    const project = task?.expand?.project
    const teamMember = expand?.team_member
    const taskMemberKey = `${task?.id || ''}|${teamMember?.id || ''}`
    const dueDate = normalizeDate(task?.due_date || '')
    const latestTimeEntryDate = latestTimeByTaskMember.get(taskMemberKey) || ''
    const completionDateRaw = dueDate || latestTimeEntryDate
    const key = `${project?.id || ''}|${teamMember?.id || ''}|${completionDateRaw}`
    const hours = (te.duration || 0) / 3600

    const existing = grouped.get(key)
    if (existing) {
      existing.row.hoursWorked += hours
    } else {
      grouped.set(key, {
        row: {
          client: project?.client || '—',
          projectName: project?.name || '—',
          memberSector: teamMember?.setor || '—',
          memberName: teamMember?.name || '—',
          completionDate: formatDateBR(completionDateRaw),
          hoursWorked: hours,
        },
        sortDate: completionDateRaw,
      })
    }
  }

  return Array.from(grouped.values())
    .sort((a, b) => a.sortDate.localeCompare(b.sortDate))
    .map((g) => g.row)
}
