import pb from '@/lib/pocketbase/client'
import type { TeamMember } from '@/types/models'

export type { TeamMember }

export const getTeamMembers = async (): Promise<TeamMember[]> =>
  pb.collection('team_members').getFullList({ sort: 'name' })

export const createTeamMember = async (data: {
  name: string
  function: string
  setor: string
  email: string
}): Promise<TeamMember> => pb.collection('team_members').create(data)

export const updateTeamMember = async (
  id: string,
  data: { name?: string; function?: string; setor?: string; email?: string },
): Promise<TeamMember> => pb.collection('team_members').update(id, data)

export const deleteTeamMember = async (id: string): Promise<void> =>
  pb.collection('team_members').delete(id)
