import pb from '@/lib/pocketbase/client'
import { Task } from '@/types/models'

export const getTasks = async (): Promise<Task[]> =>
  pb.collection('tasks').getFullList({ sort: '-created', expand: 'project,allocation' })

export const getTasksByProject = async (projectId: string): Promise<Task[]> =>
  pb.collection('tasks').getFullList({
    filter: `project = "${projectId}"`,
    sort: 'due_date',
    expand: 'allocation',
  })

export const createTask = async (data: Partial<Task>): Promise<Task> =>
  pb.collection('tasks').create(data)

export const updateTask = async (id: string, data: Partial<Task>): Promise<Task> =>
  pb.collection('tasks').update(id, data)

export const deleteTask = async (id: string): Promise<void> => pb.collection('tasks').delete(id)
