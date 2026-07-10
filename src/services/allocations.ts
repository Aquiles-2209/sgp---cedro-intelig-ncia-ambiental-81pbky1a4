import pb from '@/lib/pocketbase/client'
import { Allocation } from '@/types/models'

export const getAllocations = async (): Promise<Allocation[]> =>
  pb.collection('allocations').getFullList({ sort: '-created', expand: 'project' })

export const getAllocationsByProject = async (projectId: string): Promise<Allocation[]> =>
  pb
    .collection('allocations')
    .getFullList({ filter: `project = "${projectId}"`, sort: 'start_date' })

export const createAllocation = async (data: Partial<Allocation>): Promise<Allocation> =>
  pb.collection('allocations').create(data)

export const updateAllocation = async (
  id: string,
  data: Partial<Allocation>,
): Promise<Allocation> => pb.collection('allocations').update(id, data)

export const deleteAllocation = async (id: string): Promise<void> =>
  pb.collection('allocations').delete(id)
