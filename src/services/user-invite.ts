import pb from '@/lib/pocketbase/client'

export interface InviteUserResponse {
  id: string
  name: string
  email: string
  role: string
  tempPassword: string
}

export const inviteUser = async (data: {
  name: string
  email: string
  role: 'admin' | 'user'
}): Promise<InviteUserResponse> =>
  pb.send('/backend/v1/invite-user', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  })
