import pb from '@/lib/pocketbase/client'
import { normalizeDate } from '@/types/models'

const BATCH_SIZE = 15

export interface ReportRow {
  client: string
  projectName: string
  memberSector: string
  memberName: string
  activityTitle: string
  activityLaunchDate: string
  plannedHours: number
  allocatedHours: number
  hoursWorked: number
}

interface ReportGroup {
  memberName: string
  taskTitle: string
  activityDate: string
  plannedHours: number
  allocatedHours: number
  hoursWorked: number
}

async function fetchTimeEntriesBatched(
  allocationIds: string[],
  startDate: string,
  endDate: string,
): Promise<any[]> {
  const allEntries: any[] = []
  for (let i = 0; i < allocationIds.length; i += BATCH_SIZE) {
    const batch = allocationIds.slice(i, i + BATCH_SIZE)
    const allocFilter = batch.map((id) => `allocation = "${id}"`).join(' || ')
    const filter = `(${allocFilter}) && start_time >= "${startDate}" && start_time <= "${endDate}"`
    try {
      const batchEntries = await pb.collection('time_entries').getFullList({ filter })
      allEntries.push(...batchEntries)
    } catch (err) {
      console.error('[fetchReportData] Error fetching time_entries batch:', err)
    }
  }
  return allEntries
}

export async function fetchReportData(
  projectIds: string[],
  startDate: string,
  endDate: string,
): Promise<ReportRow[]> {
  const rows: ReportRow[] = []

  for (const projectId of projectIds) {
    try {
      const project = await pb.collection('projects').getOne(projectId)
      const projectSetor = (project as any).setor || '—'

      const allocations = await pb.collection('allocations').getFullList({
        filter: `project = "${projectId}"`,
        sort: 'start_date',
      })

      if (allocations.length === 0) {
        rows.push({
          client: (project as any).client || '—',
          projectName: (project as any).name,
          memberSector: projectSetor,
          memberName: '—',
          activityTitle: '—',
          activityLaunchDate: '',
          plannedHours: 0,
          allocatedHours: 0,
          hoursWorked: 0,
        })
        continue
      }

      const tasks = await pb.collection('tasks').getFullList({
        filter: `project = "${projectId}"`,
      })

      const allocationIds = allocations.map((a: any) => a.id)
      const timeEntries = await fetchTimeEntriesBatched(allocationIds, startDate, endDate)

      const allocationMap = new Map<string, any>(allocations.map((a: any) => [a.id, a]))

      const groupMap = new Map<string, ReportGroup>()

      for (const task of tasks as any[]) {
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
          const hoursWorked =
            taskTimeEntries.reduce((sum, te) => sum + (te.duration || 0), 0) / 3600

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

      for (const group of groupMap.values()) {
        rows.push({
          client: (project as any).client || '—',
          projectName: (project as any).name,
          memberSector: projectSetor,
          memberName: group.memberName,
          activityTitle: group.taskTitle,
          activityLaunchDate: group.activityDate,
          plannedHours: group.plannedHours,
          allocatedHours: group.allocatedHours,
          hoursWorked: group.hoursWorked,
        })
      }
    } catch (err) {
      console.error(`[fetchReportData] Error processing project ${projectId}:`, err)
    }
  }

  return rows.sort((a, b) => (a.activityLaunchDate || '').localeCompare(b.activityLaunchDate || ''))
}
