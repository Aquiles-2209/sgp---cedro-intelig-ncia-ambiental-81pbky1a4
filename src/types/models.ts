export type ProjectStatus = 'Em Andamento' | 'Concluído' | 'Planejado'

export interface Member {
  id: string
  name: string
  role: string
  avatar: string
}

export interface Team {
  id: string
  name: string
  members: Member[]
}

export interface ProjectMember {
  id: string
  name: string
  role: string
  startDate: string
  endDate: string
}

export interface ProjectTeam {
  id: string
  name: string
  members: ProjectMember[]
}

export interface Project {
  id: string
  name: string
  contractId: string
  client: string
  startDate: string
  endDate: string
  status: ProjectStatus
  description: string
  teamIds: string[]
  projectTeams: ProjectTeam[]
}
