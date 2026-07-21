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

import { differenceInDays } from 'date-fns'
