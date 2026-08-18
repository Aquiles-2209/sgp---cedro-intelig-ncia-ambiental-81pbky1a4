import pb from '@/lib/pocketbase/client'
import { Notification } from '@/types/models'

export const getNotifications = async (userId: string): Promise<Notification[]> =>
  pb.collection('notifications').getFullList({
    filter: `user = "${userId}"`,
    sort: '-created',
  })

export const markNotificationAsRead = async (id: string): Promise<Notification> =>
  pb.collection('notifications').update(id, { is_read: true })

export const deleteNotification = async (id: string): Promise<void> => {
  await pb.collection('notifications').delete(id)
}
