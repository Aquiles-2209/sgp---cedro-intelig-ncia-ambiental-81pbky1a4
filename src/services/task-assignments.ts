import pb from '@/lib/pocketbase/client'
import { TaskAssignment } from '@/types/models'

export const getTaskAssignments = async (): Promise<TaskAssignment[]> =>
  pb.collection('task_assignments').getFullList({ sort: '-created', expand: 'task,team_member' })

export const getTaskAssignmentsByTask = async (taskId: string): Promise<TaskAssignment[]> =>
  pb.collection('task_assignments').getFullList({
    filter: `task = "${taskId}"`,
    sort: '-created',
    expand: 'team_member',
  })

export const createTaskAssignment = async (
  data: Partial<TaskAssignment>,
): Promise<TaskAssignment> => pb.collection('task_assignments').create(data)

export const updateTaskAssignment = async (
  id: string,
  data: Partial<TaskAssignment>,
): Promise<TaskAssignment> => pb.collection('task_assignments').update(id, data)

export const deleteTaskAssignment = async (id: string): Promise<void> =>
  pb.collection('task_assignments').delete(id)
