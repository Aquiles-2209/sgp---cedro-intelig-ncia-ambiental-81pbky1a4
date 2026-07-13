import pb from '@/lib/pocketbase/client'
import { Task, Allocation } from '@/types/models'

function normalizeTaskRecord(r: any): Task {
  const allocation: string[] = Array.isArray(r.allocation)
    ? r.allocation
    : r.allocation
      ? [r.allocation]
      : []

  let expandedAllocations: Allocation[] | undefined
  if (r.expand?.allocation) {
    const raw = r.expand.allocation
    expandedAllocations = Array.isArray(raw) ? raw : [raw]
  }

  return {
    ...r,
    allocation,
    expand: r.expand ? { ...r.expand, allocation: expandedAllocations } : undefined,
  } as Task
}

export const getTasks = async (): Promise<Task[]> => {
  const records = await pb
    .collection('tasks')
    .getFullList({ sort: '-created', expand: 'project,allocation' })
  return records.map(normalizeTaskRecord)
}

export const getTasksByProject = async (projectId: string): Promise<Task[]> => {
  const records = await pb.collection('tasks').getFullList({
    filter: `project = "${projectId}"`,
    sort: 'due_date',
    expand: 'allocation',
  })
  return records.map(normalizeTaskRecord)
}

export const createTask = async (data: Partial<Task>): Promise<Task> => {
  const record = await pb.collection('tasks').create(data)
  return normalizeTaskRecord(record)
}

export const updateTask = async (id: string, data: Partial<Task>): Promise<Task> => {
  const record = await pb.collection('tasks').update(id, data)
  return normalizeTaskRecord(record)
}

export const deleteTask = async (id: string): Promise<void> => pb.collection('tasks').delete(id)
