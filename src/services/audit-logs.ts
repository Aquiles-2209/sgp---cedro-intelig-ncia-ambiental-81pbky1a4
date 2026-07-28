import pb from '@/lib/pocketbase/client'

export interface AuditLog {
  id: string
  user: string
  action: string
  resource_type: string
  resource_name: string
  created: string
  updated: string
  expand?: {
    user?: {
      id: string
      name: string
      email: string
      avatar?: string
      role?: string
    }
  }
}

export const getAuditLogs = async (): Promise<AuditLog[]> =>
  pb.collection('audit_logs').getFullList({ sort: '-created', expand: 'user' })

export function resolveAuditUser(log: Pick<AuditLog, 'user' | 'expand'>): string {
  const expanded = log.expand?.user
  if (!expanded) return 'Usuário desconhecido'
  if (expanded.name && expanded.name.trim()) return expanded.name
  if (expanded.email && expanded.email.trim()) return expanded.email
  return 'Usuário desconhecido'
}
