import pb from '@/lib/pocketbase/client'

interface AuditUser {
  id: string
  name: string
  email: string
  avatar?: string
  role?: string
}

export interface AuditLog {
  id: string
  user: string
  action: string
  resource_type: string
  resource_name: string
  created: string
  updated: string
  expand?: {
    user?: AuditUser | AuditUser[]
  }
}

export const getAuditLogs = async (): Promise<AuditLog[]> =>
  pb.collection('audit_logs').getFullList({ sort: '-created', expand: 'user' })

export function resolveAuditUser(log: Pick<AuditLog, 'user' | 'expand'>): string {
  const expanded = log.expand?.user
  if (!expanded) return 'Usuário(a) desconhecido(a)'

  const userRecord = Array.isArray(expanded) ? expanded[0] : expanded
  if (!userRecord) return 'Usuário(a) desconhecido(a)'

  const name = userRecord.name
  if (name && String(name).trim()) return String(name).trim()

  const email = userRecord.email
  if (email && String(email).trim()) return String(email).trim()

  return 'Usuário(a) desconhecido(a)'
}
