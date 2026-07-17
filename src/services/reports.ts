import pb from '@/lib/pocketbase/client'
import { normalizeDate } from '@/types/models'

export interface ReportRow {
  client: string
  projectName: string
  memberSector: string
  memberName: string
  activityLaunchDate: string
  hoursWorked: number
}

export async function fetchReportData(
  projectIds: string[],
  startDate: string,
  endDate: string,
): Promise<ReportRow[]> {
  const projects = await pb.collection('projects').getFullList()
  const projectMap = new Map<string, any>(projects.map((p: any) => [p.id, p]))

  const timeEntries = await pb.collection('time_entries').getFullList({
    filter: `start_time >= "${startDate}" && start_time <= "${endDate}"`,
    sort: 'created',
    expand: 'team_member,task',
  })

  const rows: ReportRow[] = []

  for (const te of timeEntries as any[]) {
    const task = te.expand?.task
    if (!task) continue
    const projectId = task.project
    if (!projectIds.includes(projectId)) continue

    const project = projectMap.get(projectId)
    if (!project) continue

    const teamMember = te.expand?.team_member
    const memberName = teamMember?.name || '—'
    const memberSector = teamMember?.setor || '—'
    const activityDate = normalizeDate(te.created)
    const hours = (te.duration || 0) / 3600

    rows.push({
      client: project.client || '—',
      projectName: project.name,
      memberSector,
      memberName,
      activityLaunchDate: activityDate,
      hoursWorked: hours,
    })
  }

  return rows.sort((a, b) => a.activityLaunchDate.localeCompare(b.activityLaunchDate))
}
