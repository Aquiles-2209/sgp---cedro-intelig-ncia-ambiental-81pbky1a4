import { useState } from 'react'
import { Bell, Check, AlertCircle, Info } from 'lucide-react'
import { useAppState } from '@/hooks/use-app-state'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { safeFormatDate } from '@/types/models'

export function NotificationBell() {
  const notifications: any[] = []
  const markNotificationAsRead = (_id: string) => {}
  const [open, setOpen] = useState(false)
  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-slate-100">
          <span className="font-semibold text-sm">Notificações</span>
          {unreadCount > 0 && (
            <span className="text-xs text-slate-500">{unreadCount} não lida(s)</span>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">Nenhuma notificação.</p>
          ) : (
            notifications.slice(0, 30).map((n) => (
              <div
                key={n.id}
                className={cn(
                  'flex items-start gap-2 p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors',
                  !n.is_read && 'bg-blue-50/30',
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {n.type === 'Alert' ? (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Info className="h-4 w-4 text-blue-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm', !n.is_read && 'font-semibold')}>{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.content}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{safeFormatDate(n.created)}</p>
                </div>
                {!n.is_read && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0"
                    onClick={() => markNotificationAsRead(n.id)}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
