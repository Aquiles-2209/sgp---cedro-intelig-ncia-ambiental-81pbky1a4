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
    }
  }
}

export const getAuditLogs = async (): Promise<AuditLog[]> =>
  pb.collection('audit_logs').getFullList({ sort: '-created', expand: 'user' })
