import pb from '@/lib/pocketbase/client'
import { Allocation } from '@/types/models'

export const getAllocations = async (): Promise<Allocation[]> =>
  pb.collection('allocations').getFullList({ sort: '-created', expand: 'project,user' })

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

export const deleteAllocation = async (id: string): Promise<void> => {
  await pb.collection('allocations').delete(id)
}

export const ensureAllocationForMember = async ({
  projectId,
  memberId,
  memberName,
  memberFunction,
  memberEmail,
  startDate,
  endDate,
}: {
  projectId: string
  memberId?: string
  memberName: string
  memberFunction?: string
  memberEmail?: string
  startDate?: string
  endDate?: string
}): Promise<Allocation | null> => {
  try {
    const existing = await pb.collection('allocations').getFullList<Allocation>({
      filter: `project = "${projectId}"`,
    })

    const cleanMemberName = (memberName || '').trim()
    const cleanEmail = (memberEmail || '').trim().toLowerCase()

    let matchedUserId = ''
    if (cleanEmail) {
      try {
        const userByEmail = await pb.collection('users').getFirstListItem(`email = "${cleanEmail}"`)
        if (userByEmail) matchedUserId = userByEmail.id
      } catch {
        /* silent */
      }
    }

    const alreadyExists = existing.some((a) => {
      if (matchedUserId && a.user && a.user === matchedUserId) return true
      if (
        cleanMemberName &&
        a.member_name &&
        a.member_name.trim().toLowerCase() === cleanMemberName.toLowerCase()
      ) {
        return true
      }
      return false
    })

    if (alreadyExists) return null

    const todayIso = new Date().toISOString()
    const allocStart = startDate || todayIso
    const allocEnd = endDate || allocStart

    const created = await pb.collection('allocations').create<Allocation>({
      project: projectId,
      member_name: cleanMemberName || 'Usuário(a) CEDRO',
      function: memberFunction?.trim() || 'Usuário(a) CEDRO',
      start_date: allocStart,
      end_date: allocEnd,
      ...(matchedUserId ? { user: matchedUserId } : {}),
    })

    return created
  } catch (err) {
    console.warn('[ensureAllocationForMember] could not ensure allocation:', err)
    return null
  }
}
