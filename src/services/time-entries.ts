import pb from '@/lib/pocketbase/client'
import { TimeEntry } from '@/types/models'
import { fetchReportData } from '@/services/reports'

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
  const [projects, timeEntries] = await Promise.all([
    pb.collection('projects').getFullList(),
    pb.collection('time_entries').getFullList({ expand: 'task' }),
  ])

  const projectIds = projects.map((p: any) => p.id)
  const reportRows = await fetchReportData(projectIds, '2020-01-01', '2030-12-31')

  const projectMap = new Map<string, any>(projects.map((p: any) => [p.id, p]))
  const projectHoursMap = new Map<string, number>()

  for (const row of reportRows) {
    const totalRowHours = (row.allocatedHours || 0) + (row.hoursWorked || 0)
    // Find project by projectName if needed, or by iterating projects
    // fetchReportData returns projectName
    const currentHours = projectHoursMap.get(row.projectName) || 0
    projectHoursMap.set(row.projectName, currentHours + totalRowHours)
  }

  // Count real time_entries per project
  const projectEntryCountMap = new Map<string, number>()
  for (const te of timeEntries as any[]) {
    const pid = te.expand?.task?.project
    if (pid) {
      projectEntryCountMap.set(pid, (projectEntryCountMap.get(pid) || 0) + 1)
    }
  }

  const results: Array<{
    projectId: string
    projectName: string
    totalHours: number
    entryCount: number
  }> = []

  for (const proj of projects as any[]) {
    const totalHours = projectHoursMap.get(proj.name) || 0
    const entryCount = projectEntryCountMap.get(proj.id) || 0

    if (totalHours > 0 || entryCount > 0) {
      results.push({
        projectId: proj.id,
        projectName: proj.name || 'Desconhecido',
        totalHours,
        entryCount,
      })
    }
  }

  return results.sort((a, b) => b.totalHours - a.totalHours)
}
