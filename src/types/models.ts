export type ProjectStatus = 'Em Andamento' | 'Concluído' | 'Planejado'

export type ProjectSetor = 'Mineração' | 'Geração de Energia' | 'Infraestrutura'

export interface Project {
  id: string
  name: string
  description: string
  contract_id: string
  client: string
  start_date: string
  end_date: string
  status: ProjectStatus
  setor: ProjectSetor
  created: string
  updated: string
}

export interface Allocation {
  id: string
  project: string
  member_name: string
  function: string
  start_date: string
  end_date: string
  user: string
  created: string
  updated: string
  expand?: { project?: Project }
}

export function normalizeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return dateStr.split('T')[0].split(' ')[0]
}

export function safeFormatDate(dateStr: string | null | undefined): string {
  const normalized = normalizeDate(dateStr)
  if (!normalized) return '—'
  const d = new Date(normalized + 'T00:00:00')
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR')
}

export function isDeadlineSoon(endDate: string | null | undefined): boolean {
  if (!endDate) return false
  const d = new Date(normalizeDate(endDate) + 'T00:00:00')
  if (isNaN(d.getTime())) return false
  const days = differenceInDays(d, new Date())
  return days >= 0 && days <= 7
}

export function getProgress(start: string, end: string): number {
  const s = new Date(normalizeDate(start) + 'T00:00:00').getTime()
  const e = new Date(normalizeDate(end) + 'T00:00:00').getTime()
  const now = Date.now()
  if (now < s) return 0
  if (now > e) return 100
  return Math.round(((now - s) / (e - s)) * 100)
}

export type TaskStatus = 'Pendente' | 'Em Andamento' | 'Concluído'

export interface TeamMember {
  id: string
  name: string
  function: string
  setor: string
  email: string
  avatar: string
  role: string
  created: string
  updated: string
}

export interface Task {
  id: string
  project: string
  allocation: string[]
  members: string[]
  title: string
  description: string
  start_date: string
  status: TaskStatus
  due_date: string
  planned_hours: number
  allocated_hours: number | null
  created: string
  updated: string
  expand?: { project?: Project; allocation?: Allocation[]; members?: TeamMember[] }
}

export interface TaskAssignment {
  id: string
  task: string
  team_member: string
  start_date: string
  end_date: string
  created: string
  updated: string
  expand?: { task?: Task; team_member?: TeamMember }
}

export interface TimeEntry {
  id: string
  task: string
  allocation: string
  team_member: string
  start_time: string
  end_time: string
  duration: number
  created: string
  updated: string
  expand?: { task?: Task; allocation?: Allocation; team_member?: TeamMember }
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
}

export function formatLiveTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function filterAllocationsByProject(
  allocations: Allocation[],
  projectId: string,
): Allocation[] {
  if (!allocations || !projectId) return []
  const targetId = projectId.trim()
  return allocations.filter((a) => {
    if (!a.project) return false
    const projId =
      typeof a.project === 'string'
        ? a.project.trim()
        : (a.project as any)?.id?.trim() || a.expand?.project?.id?.trim() || ''
    return projId === targetId
  })
}

export function getUniqueAllocatedCount(
  projAllocs: Allocation[] = [],
  projTasks: Task[] = [],
  projTaskAssignments: TaskAssignment[] = [],
): number {
  const allocs = projAllocs || []
  const tasks = projTasks || []
  const assignments = projTaskAssignments || []

  if (allocs.length === 0 && tasks.length === 0 && assignments.length === 0) {
    return 0
  }

  interface IdentityRef {
    userId?: string
    teamMemberId?: string
    email?: string
    name?: string
    fallbackKey?: string
  }

  const refs: IdentityRef[] = []

  // 1. Process allocations
  allocs.forEach((a) => {
    const rawUser = a.user
    const userId = typeof rawUser === 'string' ? rawUser.trim() : (rawUser as any)?.id?.trim()
    const expandedUser = (a.expand as any)?.user
    const finalUserId = userId || expandedUser?.id?.trim()
    const email = (expandedUser?.email || '').trim().toLowerCase()
    const name = (a.member_name || expandedUser?.name || '').trim().toLowerCase()

    if (finalUserId || email || (name && name !== '-' && name !== 'n/a')) {
      refs.push({
        userId: finalUserId || undefined,
        email: email && email.includes('@') ? email : undefined,
        name: name && name !== '-' && name !== 'n/a' ? name : undefined,
      })
    } else {
      refs.push({ fallbackKey: `alloc:${a.id}` })
    }
  })

  // 2. Process task assignments
  assignments.forEach((ta) => {
    const rawTm = ta.team_member
    const tmId = typeof rawTm === 'string' ? rawTm.trim() : (rawTm as any)?.id?.trim()
    const expandedTm = ta.expand?.team_member
    const finalTmId = tmId || expandedTm?.id?.trim()
    const email = (expandedTm?.email || '').trim().toLowerCase()
    const name = (expandedTm?.name || '').trim().toLowerCase()

    if (finalTmId || email || (name && name !== '-' && name !== 'n/a')) {
      refs.push({
        teamMemberId: finalTmId || undefined,
        email: email && email.includes('@') ? email : undefined,
        name: name && name !== '-' && name !== 'n/a' ? name : undefined,
      })
    } else {
      refs.push({ fallbackKey: `ta:${ta.id}` })
    }
  })

  // 3. Process task direct members
  tasks.forEach((t) => {
    if (Array.isArray(t.members)) {
      t.members.forEach((m: any) => {
        const tmId = typeof m === 'string' ? m.trim() : m?.id?.trim()
        const name = (m?.name || '').trim().toLowerCase()
        const email = (m?.email || '').trim().toLowerCase()
        if (tmId || email || name) {
          refs.push({
            teamMemberId: tmId || undefined,
            email: email && email.includes('@') ? email : undefined,
            name: name && name !== '-' && name !== 'n/a' ? name : undefined,
          })
        }
      })
    }
    if (Array.isArray(t.expand?.members)) {
      t.expand.members.forEach((m: any) => {
        const tmId = m?.id?.trim()
        const name = (m?.name || '').trim().toLowerCase()
        const email = (m?.email || '').trim().toLowerCase()
        if (tmId || email || name) {
          refs.push({
            teamMemberId: tmId || undefined,
            email: email && email.includes('@') ? email : undefined,
            name: name && name !== '-' && name !== 'n/a' ? name : undefined,
          })
        }
      })
    }
  })

  if (refs.length === 0) return 0

  const nameToUsers = new Map<string, Set<string>>()
  const emailToUsers = new Map<string, Set<string>>()

  refs.forEach((r) => {
    const explicitId = r.userId
      ? `usr:${r.userId}`
      : r.teamMemberId
        ? `tm:${r.teamMemberId}`
        : undefined
    if (explicitId) {
      if (r.name) {
        if (!nameToUsers.has(r.name)) nameToUsers.set(r.name, new Set())
        nameToUsers.get(r.name)!.add(explicitId)
      }
      if (r.email) {
        if (!emailToUsers.has(r.email)) emailToUsers.set(r.email, new Set())
        emailToUsers.get(r.email)!.add(explicitId)
      }
    }
  })

  const groups = new Set<string>()

  refs.forEach((r, idx) => {
    if (r.userId) {
      groups.add(`usr:${r.userId}`)
      return
    }
    if (r.teamMemberId) {
      groups.add(`tm:${r.teamMemberId}`)
      return
    }
    if (r.email) {
      const mapped = emailToUsers.get(r.email)
      if (mapped && mapped.size === 1) {
        groups.add(Array.from(mapped)[0])
        return
      } else if (!mapped || mapped.size === 0) {
        groups.add(`email:${r.email}`)
        return
      }
    }
    if (r.name) {
      const mapped = nameToUsers.get(r.name)
      if (mapped && mapped.size === 1) {
        groups.add(Array.from(mapped)[0])
        return
      } else if (!mapped || mapped.size === 0) {
        groups.add(`name:${r.name}`)
        return
      }
    }
    groups.add(`fallback:${r.fallbackKey || idx}`)
  })

  return groups.size
}

export function isUserAllocatedToProject(
  userId: string | undefined,
  userEmail: string | undefined,
  projectId: string,
  allocations: Allocation[],
  taskAssignments: TaskAssignment[],
  tasks: Task[] = [],
): boolean {
  if (!userId) return false

  const hasAllocation = allocations.some((a) => {
    const allocUser =
      typeof a.user === 'string' ? a.user : (a as any)?.user?.id || a.expand?.user?.id
    const allocProject =
      typeof a.project === 'string' ? a.project : (a as any)?.project?.id || a.expand?.project?.id
    return allocUser === userId && allocProject === projectId
  })
  if (hasAllocation) return true

  if (!userEmail) return false
  const lowerEmail = userEmail.toLowerCase()

  const projectTaskIds = new Set(
    tasks
      .filter((t) => {
        const pId =
          typeof t.project === 'string'
            ? t.project
            : (t.project as any)?.id || t.expand?.project?.id
        return pId === projectId
      })
      .map((t) => t.id),
  )

  return taskAssignments.some((ta) => {
    const tm = ta.expand?.team_member
    const tmEmail = typeof tm?.email === 'string' ? tm.email.toLowerCase() : ''
    if (!tmEmail || tmEmail !== lowerEmail) return false

    const taskFromExpand = ta.expand?.task
    const taskProject =
      typeof taskFromExpand?.project === 'string'
        ? taskFromExpand.project
        : taskFromExpand?.project?.id
    return taskProject === projectId || projectTaskIds.has(ta.task)
  })
}

import { differenceInDays } from 'date-fns'
