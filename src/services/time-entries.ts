import pb from '@/lib/pocketbase/client'
import { TimeEntry } from '@/types/models'

export const getTimeEntriesByUser = async (userId: string): Promise<TimeEntry[]> => {
  const allocations = await pb.collection('allocations').getFullList({
    filter: `user = "${userId}"`,
  })
  if (allocations.length === 0) return []
  const allocIds = allocations.map((a: any) => a.id)
  const filter = allocIds.map((id: string) => `allocation = "${id}"`).join(' || ')
  return pb.collection('time_entries').getFullList({
    filter,
    sort: '-start_time',
    expand: 'task,allocation,team_member',
  })
}

export const getTimeEntries = async (): Promise<TimeEntry[]> =>
  pb
    .collection('time_entries')
    .getFullList({ sort: '-created', expand: 'task,allocation,team_member' })

export const getTimeEntriesByTask = async (taskId: string): Promise<TimeEntry[]> =>
  pb.collection('time_entries').getFullList({
    filter: `task = "${taskId}"`,
    sort: 'start_time',
    expand: 'allocation,team_member',
  })

export const getTimeEntriesByAllocation = async (allocationId: string): Promise<TimeEntry[]> =>
  pb.collection('time_entries').getFullList({
    filter: `allocation = "${allocationId}"`,
    sort: 'start_time',
  })

export const getTimeEntriesByTeamMember = async (memberId: string): Promise<TimeEntry[]> =>
  pb.collection('time_entries').getFullList({
    filter: `team_member = "${memberId}"`,
    sort: 'start_time',
  })

export const createTimeEntry = async (data: Partial<TimeEntry>): Promise<TimeEntry> =>
  pb.collection('time_entries').create(data)

export const updateTimeEntry = async (id: string, data: Partial<TimeEntry>): Promise<TimeEntry> =>
  pb.collection('time_entries').update(id, data)

export const deleteTimeEntry = async (id: string): Promise<void> => {
  await pb.collection('time_entries').delete(id)
}

export const getTodaysTimeEntriesByTeamMember = async (memberId: string): Promise<TimeEntry[]> => {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return pb.collection('time_entries').getFullList({
    filter: `team_member = "${memberId}" && start_time >= "${startOfDay.toISOString()}" && start_time < "${endOfDay.toISOString()}"`,
  })
}

export const getTotalHoursByProject = async (): Promise<
  Array<{ projectId: string; projectName: string; totalHours: number; entryCount: number }>
> => {
  const [timeEntries, projects, tasks] = await Promise.all([
    pb.collection('time_entries').getFullList({ expand: 'task' }),
    pb.collection('projects').getFullList(),
    pb.collection('tasks').getFullList(),
  ])
  const projectMap = new Map<string, any>(projects.map((p: any) => [p.id, p]))
  const projectHours = new Map<string, { hours: number; count: number }>()

  // Imported hours (allocated_hours on tasks, already expressed in hours)
  for (const task of tasks as any[]) {
    const pid = task.project
    if (!pid) continue
    if (!projectHours.has(pid)) projectHours.set(pid, { hours: 0, count: 0 })
    const entry = projectHours.get(pid)!
    entry.hours += Number(task.allocated_hours) || 0
  }

  // Timer hours (time_entries.duration is stored in seconds)
  for (const te of timeEntries as any[]) {
    const task = te.expand?.task
    if (!task?.project) continue
    const pid = task.project
    if (!projectHours.has(pid)) projectHours.set(pid, { hours: 0, count: 0 })
    const entry = projectHours.get(pid)!
    entry.hours += (te.duration || 0) / 3600
    entry.count += 1
  }

  return Array.from(projectHours.entries())
    .map(([projectId, data]) => ({
      projectId,
      projectName: projectMap.get(projectId)?.name || 'Desconhecido',
      totalHours: data.hours,
      entryCount: data.count,
    }))
    .sort((a, b) => b.totalHours - a.totalHours)
}
