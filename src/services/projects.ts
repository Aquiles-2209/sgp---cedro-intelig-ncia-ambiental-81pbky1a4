import pb from '@/lib/pocketbase/client'
import { Project } from '@/types/models'

export const getProjects = async (): Promise<Project[]> =>
  pb.collection('projects').getFullList({ sort: '-created', expand: 'project_manager' })

export const getProject = async (id: string): Promise<Project> =>
  pb.collection('projects').getOne(id, { expand: 'project_manager' })

export const createProject = async (data: Partial<Project>): Promise<Project> =>
  pb.collection('projects').create(data)

export const updateProject = async (id: string, data: Partial<Project>): Promise<Project> =>
  pb.collection('projects').update(id, data)

export const deleteProject = async (id: string): Promise<void> => {
  await pb.collection('projects').delete(id)
}
