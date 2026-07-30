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
  launchDate: string
  plannedHours: number
  allocatedHours: number
  hoursWorked: number
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

function resolveMemberName(te: any, allocationMap: Map<string, any>): string {
  if (te.allocation) {
    const alloc = allocationMap.get(te.allocation)
    if (alloc?.member_name) return alloc.member_name
    if (te.expand?.allocation?.member_name) return te.expand.allocation.member_name
  }
  if (te.expand?.team_member?.name) return te.expand.team_member.name
  return '—'
}

async function fetchTimeEntriesByTaskBatched(
  taskIds: string[],
  startDate: string,
  endDate: string,
): Promise<any[]> {
  const allEntries: any[] = []
  const seenIds = new Set<string>()
  for (let i = 0; i < taskIds.length; i += BATCH_SIZE) {
    const batch = taskIds.slice(i, i + BATCH_SIZE)
    const taskFilter = batch.map((id) => `task = "${id}"`).join(' || ')
    const filter = `(${taskFilter}) && start_time >= "${startDate}" && start_time <= "${endDate}"`
    try {
      const batchEntries = await pb.collection('time_entries').getFullList({
        filter,
        expand: 'team_member,task,allocation',
      })
      for (const entry of batchEntries as any[]) {
        if (!seenIds.has(entry.id)) {
          seenIds.add(entry.id)
          allEntries.push(entry)
        }
      }
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

      const tasks = await pb.collection('tasks').getFullList({
        filter: `project = "${projectId}"`,
      })

      const allocationMap = new Map<string, any>(allocations.map((a: any) => [a.id, a]))

      const taskIds = (tasks as any[]).map((t) => t.id)
      const timeEntries =
        taskIds.length > 0 ? await fetchTimeEntriesByTaskBatched(taskIds, startDate, endDate) : []

      if (allocations.length === 0 && tasks.length === 0) {
        continue
      }

      const timeEntriesByTask = new Map<string, any[]>()
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

      for (const task of tasks as any[]) {
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

      for (const group of groupMap.values()) {
        const normalizedActivityDate = normalizeDate(group.activityDate)
        const normalizedLaunchDate = normalizeDate(group.launchDate)

        if (!normalizedActivityDate && !normalizedLaunchDate) continue

        const activityInRange =
          normalizedActivityDate !== '' &&
          normalizedActivityDate >= startDate &&
          normalizedActivityDate <= endDate
        const launchInRange =
          normalizedLaunchDate !== '' &&
          normalizedLaunchDate >= startDate &&
          normalizedLaunchDate <= endDate

        if (!activityInRange && !launchInRange) continue

        rows.push({
          client: (project as any).client || '—',
          projectName: (project as any).name,
          memberSector: projectSetor,
          memberName: group.memberName,
          activityTitle: group.taskTitle,
          activityLaunchDate: group.activityDate,
          launchDate: group.launchDate,
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
