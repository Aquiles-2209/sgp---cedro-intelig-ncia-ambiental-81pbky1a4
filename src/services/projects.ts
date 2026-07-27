import pb from '@/lib/pocketbase/client'
import { Project } from '@/types/models'

export const getProjects = async (): Promise<Project[]> =>
  pb.collection('projects').getFullList({ sort: '-created' })

export const getProject = async (id: string): Promise<Project> =>
  pb.collection('projects').getOne(id)

export const createProject = async (data: Partial<Project>): Promise<Project> =>
  pb.collection('projects').create(data)

export const updateProject = async (id: string, data: Partial<Project>): Promise<Project> =>
  pb.collection('projects').update(id, data)

export const deleteProject = async (id: string): Promise<void> => {
  const tasks = await pb.collection('tasks').getFullList({ filter: `project = "${id}"` })
  const taskIds = tasks.map((t) => t.id)

  if (taskIds.length > 0) {
    const taskFilter = taskIds.map((tid) => `task = "${tid}"`).join(' || ')
    const assignments = await pb.collection('task_assignments').getFullList({ filter: taskFilter })
    for (const a of assignments) {
      await pb.collection('task_assignments').delete(a.id)
    }
    const timeEntriesByTask = await pb
      .collection('time_entries')
      .getFullList({ filter: taskFilter })
    for (const te of timeEntriesByTask) {
      await pb.collection('time_entries').delete(te.id)
    }
  }

  const allocations = await pb
    .collection('allocations')
    .getFullList({ filter: `project = "${id}"` })
  const allocIds = allocations.map((a) => a.id)

  if (allocIds.length > 0) {
    const allocFilter = allocIds.map((aid) => `allocation = "${aid}"`).join(' || ')
    const timeEntriesByAlloc = await pb
      .collection('time_entries')
      .getFullList({ filter: allocFilter })
    for (const te of timeEntriesByAlloc) {
      if (!taskIds.includes(te.task)) {
        await pb.collection('time_entries').delete(te.id)
      }
    }
  }

  for (const a of allocations) {
    await pb.collection('allocations').delete(a.id)
  }
  for (const t of tasks) {
    await pb.collection('tasks').delete(t.id)
  }

  await pb.collection('projects').delete(id)
}
