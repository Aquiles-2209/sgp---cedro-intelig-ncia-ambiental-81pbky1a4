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

import { differenceInDays } from 'date-fns'
