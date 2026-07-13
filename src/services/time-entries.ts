import pb from '@/lib/pocketbase/client'
import { TimeEntry } from '@/types/models'

export const getTimeEntries = async (): Promise<TimeEntry[]> =>
  pb
    .collection('time_entries')
    .getFullList({ sort: '-created', expand: 'task,allocation,team_member' })

export const getTimeEntriesByTask = async (taskId: string): Promise<TimeEntry[]> =>
  pb.collection('time_entries').getFullList({
    filter: `task = "${taskId}"`,
    sort: 'start_time',
    expand: 'allocation,team_member',
  })

export const getTimeEntriesByAllocation = async (allocationId: string): Promise<TimeEntry[]> =>
  pb.collection('time_entries').getFullList({
    filter: `allocation = "${allocationId}"`,
    sort: 'start_time',
  })

export const getTimeEntriesByTeamMember = async (memberId: string): Promise<TimeEntry[]> =>
  pb.collection('time_entries').getFullList({
    filter: `team_member = "${memberId}"`,
    sort: 'start_time',
  })

export const createTimeEntry = async (data: Partial<TimeEntry>): Promise<TimeEntry> =>
  pb.collection('time_entries').create(data)

export const updateTimeEntry = async (id: string, data: Partial<TimeEntry>): Promise<TimeEntry> =>
  pb.collection('time_entries').update(id, data)

export const deleteTimeEntry = async (id: string): Promise<void> =>
  pb.collection('time_entries').delete(id)
