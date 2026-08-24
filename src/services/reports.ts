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
  memberSector: string
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
  const startFilterDate =
    startDate.includes(' ') || startDate.includes('T') ? startDate : `${startDate} 00:00:00`
  const endFilterDate =
    endDate.includes(' ') || endDate.includes('T') ? endDate : `${endDate} 23:59:59`

  for (let i = 0; i < taskIds.length; i += BATCH_SIZE) {
    const batch = taskIds.slice(i, i + BATCH_SIZE)
    const taskFilter = batch.map((id) => `task = "${id}"`).join(' || ')
    const filter = `(${taskFilter}) && start_time >= "${startFilterDate}" && start_time <= "${endFilterDate}"`
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

async function fetchTaskAssignmentsByTaskBatched(taskIds: string[]): Promise<any[]> {
  const allAssignments: any[] = []
  const seenIds = new Set<string>()
  for (let i = 0; i < taskIds.length; i += BATCH_SIZE) {
    const batch = taskIds.slice(i, i + BATCH_SIZE)
    const taskFilter = batch.map((id) => `task = "${id}"`).join(' || ')
    try {
      const batchAssignments = await pb.collection('task_assignments').getFullList({
        filter: taskFilter,
        expand: 'team_member',
      })
      for (const entry of batchAssignments as any[]) {
        if (!seenIds.has(entry.id)) {
          seenIds.add(entry.id)
          allAssignments.push(entry)
        }
      }
    } catch (err) {
      console.error('[fetchReportData] Error fetching task_assignments batch:', err)
    }
  }
  return allAssignments
}

export async function fetchReportData(
  projectIds: string[],
  startDate: string,
  endDate: string,
  teamMemberId?: string,
): Promise<ReportRow[]> {
  const rows: ReportRow[] = []

  let targetMember: any = null
  if (teamMemberId) {
    try {
      targetMember = await pb.collection('team_members').getOne(teamMemberId)
    } catch {
      targetMember = null
    }
  }

  const targetMemberName = targetMember?.name ? targetMember.name.trim().toLowerCase() : ''
  const targetMemberEmail = targetMember?.email ? targetMember.email.trim().toLowerCase() : ''
  const targetMemberSector = targetMember?.setor || ''

  let targetProjectIds = projectIds
  if (!targetProjectIds || targetProjectIds.length === 0) {
    try {
      const allProjects = await pb.collection('projects').getFullList({ sort: 'name' })
      targetProjectIds = allProjects.map((p) => p.id)
    } catch {
      targetProjectIds = []
    }
  }

  for (const projectId of targetProjectIds) {
    try {
      const project = await pb.collection('projects').getOne(projectId)
      const projectSetor = (project as any).setor || '—'

      const allocations = await pb.collection('allocations').getFullList({
        filter: `project = "${projectId}"`,
        sort: 'start_date',
        expand: 'user',
      })

      const tasks = await pb.collection('tasks').getFullList({
        filter: `project = "${projectId}"`,
        expand: 'members',
      })

      const allocationMap = new Map<string, any>(allocations.map((a: any) => [a.id, a]))
      const taskIds = (tasks as any[]).map((t) => t.id)

      if (allocations.length === 0 && tasks.length === 0) {
        continue
      }

      const [timeEntries, taskAssignments] = await Promise.all([
        taskIds.length > 0
          ? fetchTimeEntriesByTaskBatched(taskIds, startDate, endDate)
          : Promise.resolve([]),
        taskIds.length > 0 ? fetchTaskAssignmentsByTaskBatched(taskIds) : Promise.resolve([]),
      ])

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

      const assignmentsByTask = new Map<string, any[]>()
      for (const ta of taskAssignments) {
        if (!ta.task) continue
        const list = assignmentsByTask.get(ta.task)
        if (list) {
          list.push(ta)
        } else {
          assignmentsByTask.set(ta.task, [ta])
        }
      }

      if (teamMemberId && targetMember) {
        // FILTERED BY SPECIFIC TEAM MEMBER
        for (const task of tasks as any[]) {
          const taskTitle = (task.title || '').trim()
          if (!taskTitle) continue

          const taskAllocIds: string[] = Array.isArray(task.allocation)
            ? task.allocation
            : task.allocation
              ? [task.allocation]
              : []

          const taskAssignmentsForTask = assignmentsByTask.get(task.id) || []
          const allTaskTimeEntries = timeEntriesByTask.get(task.id) || []

          // Check if target member has time entries on this task
          const memberTimeEntries = allTaskTimeEntries.filter((te) => {
            if (te.team_member === targetMember.id) return true
            if (te.expand?.team_member?.id === targetMember.id) return true
            const alloc = te.allocation ? allocationMap.get(te.allocation) : null
            const name = (alloc?.member_name || te.expand?.allocation?.member_name || '')
              .trim()
              .toLowerCase()
            if (targetMemberName && name && name === targetMemberName) return true
            const uId = alloc?.user || te.expand?.allocation?.user
            const finalUId = typeof uId === 'string' ? uId : uId?.id
            if (finalUId && finalUId === targetMember.id) return true
            return false
          })

          // Check if target member is assigned via allocations linked to this task
          const memberTaskAllocs = taskAllocIds
            .map((id) => allocationMap.get(id))
            .filter((alloc) => {
              if (!alloc) return false
              const name = (alloc.member_name || alloc.expand?.user?.name || '')
                .trim()
                .toLowerCase()
              if (targetMemberName && name === targetMemberName) return true
              const uId = alloc.user || alloc.expand?.user?.id
              if (uId && uId === targetMember.id) return true
              const email = (alloc.expand?.user?.email || '').trim().toLowerCase()
              if (targetMemberEmail && email === targetMemberEmail) return true
              return false
            })

          // Check if target member is assigned via task_assignments
          const memberTaskAssignments = taskAssignmentsForTask.filter((ta) => {
            const tmId =
              typeof ta.team_member === 'string'
                ? ta.team_member
                : ta.team_member?.id || ta.expand?.team_member?.id
            return tmId === targetMember.id
          })

          // Check if target member is in task.members
          const directMembers: any[] = Array.isArray(task.members) ? task.members : []
          const isDirectMember = directMembers.some((m) => {
            const mId = typeof m === 'string' ? m : m?.id
            return mId === targetMember.id
          })

          const isMemberInvolved =
            memberTimeEntries.length > 0 ||
            memberTaskAllocs.length > 0 ||
            memberTaskAssignments.length > 0 ||
            isDirectMember

          if (!isMemberInvolved) {
            continue
          }

          // Calculate worked hours and earliest launch date
          let hoursWorked = 0
          let launchDate = ''
          for (const te of memberTimeEntries) {
            hoursWorked += (te.duration || 0) / 3600
            const created = te.start_time || te.created || ''
            if (created && (!launchDate || created < launchDate)) {
              launchDate = created
            }
          }

          // Activity date resolution
          let activityDate = ''
          if (memberTaskAllocs.length > 0 && memberTaskAllocs[0].start_date) {
            activityDate = normalizeDate(memberTaskAllocs[0].start_date)
          } else if (memberTaskAssignments.length > 0 && memberTaskAssignments[0].start_date) {
            activityDate = normalizeDate(memberTaskAssignments[0].start_date)
          } else if (task.start_date) {
            activityDate = normalizeDate(task.start_date)
          } else if (memberTimeEntries.length > 0) {
            activityDate = normalizeDate(
              memberTimeEntries[0].start_time || memberTimeEntries[0].created,
            )
          }

          const normalizedActivityDate = normalizeDate(activityDate)
          const normalizedLaunchDate = normalizeDate(launchDate)

          if (!normalizedActivityDate && !normalizedLaunchDate && hoursWorked === 0) {
            continue
          }

          const activityInRange =
            normalizedActivityDate !== '' &&
            normalizedActivityDate >= startDate &&
            normalizedActivityDate <= endDate
          const launchInRange =
            normalizedLaunchDate !== '' &&
            normalizedLaunchDate >= startDate &&
            normalizedLaunchDate <= endDate
          const hasWorkedInRange = hoursWorked > 0

          if (!activityInRange && !launchInRange && !hasWorkedInRange) {
            continue
          }

          rows.push({
            client: (project as any).client || '—',
            projectName: (project as any).name,
            memberSector: targetMemberSector || projectSetor || '—',
            memberName: targetMember.name || '—',
            activityTitle: taskTitle,
            activityLaunchDate: activityDate,
            launchDate: launchDate,
            plannedHours: task.planned_hours || 0,
            allocatedHours: task.allocated_hours || 0,
            hoursWorked,
          })
        }
      } else {
        // GENERAL REPORT (ALL OR SPECIFIC PROJECTS)
        const groupMap = new Map<string, ReportGroup>()

        for (const task of tasks as any[]) {
          const taskTitle = (task.title || '').trim()
          if (!taskTitle) continue

          const taskAllocIds: string[] = Array.isArray(task.allocation)
            ? task.allocation
            : task.allocation
              ? [task.allocation]
              : []

          const taskAssignmentsForTask = assignmentsByTask.get(task.id) || []
          const allTaskTimeEntries = timeEntriesByTask.get(task.id) || []

          const memberHoursMap = new Map<string, number>()
          const memberLaunchDateMap = new Map<string, string>()
          const memberSectorMap = new Map<string, string>()

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
            if (te.expand?.team_member?.setor) {
              memberSectorMap.set(memberName, te.expand.team_member.setor)
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

          for (const ta of taskAssignmentsForTask) {
            const memberName = ta.expand?.team_member?.name
            if (memberName && !memberDateMap.has(memberName)) {
              memberDateMap.set(memberName, normalizeDate(ta.start_date || task.start_date || ''))
              if (ta.expand?.team_member?.setor) {
                memberSectorMap.set(memberName, ta.expand.team_member.setor)
              }
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
                memberSector: projectSetor,
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
            const sector = memberSectorMap.get(memberName) || projectSetor

            const existing = groupMap.get(key)
            if (existing) {
              existing.hoursWorked += hoursWorked
              if (launchDate && (!existing.launchDate || launchDate < existing.launchDate)) {
                existing.launchDate = launchDate
              }
            } else {
              groupMap.set(key, {
                memberName,
                memberSector: sector,
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
            memberSector: group.memberSector || projectSetor,
            memberName: group.memberName,
            activityTitle: group.taskTitle,
            activityLaunchDate: group.activityDate,
            launchDate: group.launchDate,
            plannedHours: group.plannedHours,
            allocatedHours: group.allocatedHours,
            hoursWorked: group.hoursWorked,
          })
        }
      }
    } catch (err) {
      console.error(`[fetchReportData] Error processing project ${projectId}:`, err)
    }
  }

  return rows.sort((a, b) => {
    const dateA = a.launchDate || a.activityLaunchDate || ''
    const dateB = b.launchDate || b.activityLaunchDate || ''
    return dateA.localeCompare(dateB)
  })
}

export async function fetchReportDataByMember(
  teamMemberId: string,
  startDate: string,
  endDate: string,
  projectIds?: string[],
): Promise<ReportRow[]> {
  return fetchReportData(projectIds || [], startDate, endDate, teamMemberId)
}
