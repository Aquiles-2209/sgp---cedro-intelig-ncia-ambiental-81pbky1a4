import pb from '@/lib/pocketbase/client'
import { normalizeDate } from '@/types/models'

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

export async function fetchReportData(
  projectIds: string[],
  startDate: string,
  endDate: string,
): Promise<ReportRow[]> {
  const rows: ReportRow[] = []

  for (const projectId of projectIds) {
    const project = await pb.collection('projects').getOne(projectId)
    const projectSetor = (project as any).setor || '—'

    const allocations = await pb.collection('allocations').getFullList({
      filter: `project = "${projectId}"`,
      sort: 'start_date',
    })

    if (allocations.length === 0) continue

    const tasks = await pb.collection('tasks').getFullList({
      filter: `project = "${projectId}"`,
    })

    const allocationIds = allocations.map((a: any) => a.id)
    let timeEntries: any[] = []
    if (allocationIds.length > 0) {
      const allocFilter = allocationIds.map((id: string) => `allocation = "${id}"`).join(' || ')
      timeEntries = await pb.collection('time_entries').getFullList({
        filter: `(${allocFilter}) && start_time >= "${startDate}" && start_time <= "${endDate}"`,
      })
    }

    for (const allocation of allocations as any[]) {
      const allocTasks = (tasks as any[]).filter((t) => {
        const ta = t.allocation
        if (Array.isArray(ta)) return ta.includes(allocation.id)
        return ta === allocation.id
      })

      const allocTimeEntries = timeEntries.filter((te) => te.allocation === allocation.id)

      const plannedHours = allocTasks.reduce((sum, t) => sum + (t.planned_hours || 0), 0)
      const allocatedHours = allocTasks.reduce((sum, t) => sum + (t.allocated_hours || 0), 0)
      const hoursWorked = allocTimeEntries.reduce((sum, te) => sum + (te.duration || 0), 0) / 3600

      const activityTitle =
        allocTasks
          .map((t) => t.title)
          .filter(Boolean)
          .join('; ') || '—'

      rows.push({
        client: (project as any).client || '—',
        projectName: (project as any).name,
        memberSector: projectSetor,
        memberName: allocation.member_name || '—',
        activityTitle,
        activityLaunchDate: normalizeDate(allocation.start_date || ''),
        plannedHours,
        allocatedHours,
        hoursWorked,
      })
    }
  }

  return rows.sort((a, b) => a.activityLaunchDate.localeCompare(b.activityLaunchDate))
}
