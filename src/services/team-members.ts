import pb from '@/lib/pocketbase/client'

export interface TeamMember {
  id: string
  name: string
  function: string
  created: string
  updated: string
}

export const getTeamMembers = async (): Promise<TeamMember[]> =>
  pb.collection('team_members').getFullList({ sort: 'name' })

export const createTeamMember = async (data: {
  name: string
  function: string
}): Promise<TeamMember> => pb.collection('team_members').create(data)

export const deleteTeamMember = async (id: string): Promise<void> =>
  pb.collection('team_members').delete(id)
