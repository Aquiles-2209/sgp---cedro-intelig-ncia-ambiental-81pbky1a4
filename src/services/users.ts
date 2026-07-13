import pb from '@/lib/pocketbase/client'

export interface SimpleUser {
  id: string
  name: string
  email: string
}

export const getUsers = async (): Promise<SimpleUser[]> => {
  const records = await pb.collection('users').getFullList({ sort: 'name' })
  return records.map((r: any) => ({
    id: r.id,
    name: r.name || r.email || 'Usuário',
    email: r.email || '',
  }))
}
