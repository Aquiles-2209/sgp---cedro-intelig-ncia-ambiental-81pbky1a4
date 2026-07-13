export type ProjectStatus = 'Em Andamento' | 'Concluído' | 'Planejado'

export interface Project {
  id: string
  name: string
  description: string
  contract_id: string
  client: string
  start_date: string
  end_date: string
  status: ProjectStatus
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
  created: string
  updated: string
  expand?: { project?: Project }
}

export function normalizeDate(dateStr: string): string {
  if (!dateStr) return ''
  return dateStr.split('T')[0].split(' ')[0]
}

export function isDeadlineSoon(endDate: string): boolean {
  const days = differenceInDays(new Date(normalizeDate(endDate) + 'T00:00:00'), new Date())
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

export interface Task {
  id: string
  project: string
  allocation: string
  title: string
  description: string
  start_date: string
  status: TaskStatus
  due_date: string
  created: string
  updated: string
  expand?: { project?: Project; allocation?: Allocation }
}

export interface TimeEntry {
  id: string
  task: string
  allocation: string
  start_time: string
  end_time: string
  duration: number
  created: string
  updated: string
  expand?: { task?: Task; allocation?: Allocation }
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
