import pb from '@/lib/pocketbase/client'
import type { TeamMember } from '@/types/models'

export type { TeamMember }

function normalizeMember(r: any): TeamMember {
  return {
    ...r,
    avatar: r.avatar
      ? `${import.meta.env.VITE_POCKETBASE_URL}/api/files/team_members/${r.id}/${r.avatar}`
      : '',
  } as TeamMember
}

export const getTeamMembers = async (): Promise<TeamMember[]> => {
  const records = await pb.collection('team_members').getFullList({ sort: 'name' })
  return records.map(normalizeMember)
}

export const createTeamMember = async (data: {
  name: string
  function: string
  setor: string
  email: string
  avatar?: File | null
}): Promise<TeamMember> => {
  const fd = new FormData()
  fd.append('name', data.name)
  fd.append('function', data.function)
  fd.append('setor', data.setor)
  fd.append('email', data.email)
  if (data.avatar) fd.append('avatar', data.avatar)
  const record = await pb.collection('team_members').create(fd)
  return normalizeMember(record)
}

export const updateTeamMember = async (
  id: string,
  data: { name?: string; function?: string; setor?: string; email?: string; avatar?: File | null },
): Promise<TeamMember> => {
  const fd = new FormData()
  if (data.name !== undefined) fd.append('name', data.name)
  if (data.function !== undefined) fd.append('function', data.function)
  if (data.setor !== undefined) fd.append('setor', data.setor)
  if (data.email !== undefined) fd.append('email', data.email)
  if (data.avatar) fd.append('avatar', data.avatar)
  const record = await pb.collection('team_members').update(id, fd)
  return normalizeMember(record)
}

export const deleteTeamMember = async (id: string): Promise<void> =>
  pb.collection('team_members').delete(id)
