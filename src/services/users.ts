import pb from '@/lib/pocketbase/client'

export interface SimpleUser {
  id: string
  name: string
  email: string
  avatar: string
  role: 'admin' | 'user'
}

export const getUsers = async (): Promise<SimpleUser[]> => {
  const records = await pb.collection('users').getFullList({ sort: 'name' })
  return records.map((r: any) => ({
    id: r.id,
    name: r.name || r.email || 'Usuário',
    email: r.email || '',
    avatar: r.avatar
      ? `${import.meta.env.VITE_POCKETBASE_URL}/api/files/users/${r.id}/${r.avatar}`
      : '',
    role: (r.role as 'admin' | 'user') || 'user',
  }))
}

export const createUser = async (data: {
  name: string
  email: string
  password: string
}): Promise<SimpleUser> => {
  const record = await pb.collection('users').create({
    name: data.name,
    email: data.email,
    password: data.password,
    passwordConfirm: data.password,
  })
  return {
    id: record.id,
    name: record.name || record.email || 'Usuário',
    email: record.email || '',
    avatar: '',
    role: 'user',
  }
}

export const updateUserRole = async (id: string, role: 'admin' | 'user'): Promise<void> => {
  await pb.collection('users').update(id, { role })
}

export const deleteUser = async (id: string): Promise<void> => {
  await pb.collection('users').delete(id)
}

export const getUserLastActivity = async (): Promise<Record<string, string>> => {
  const timeEntries = await pb.collection('time_entries').getFullList({
    sort: '-end_time',
    expand: 'allocation',
  })
  const result: Record<string, string> = {}
  for (const te of timeEntries as any[]) {
    if (!te.end_time) continue
    const alloc = te.expand?.allocation
    if (!alloc?.user) continue
    if (!result[alloc.user]) {
      result[alloc.user] = te.end_time
    }
  }
  return result
}
