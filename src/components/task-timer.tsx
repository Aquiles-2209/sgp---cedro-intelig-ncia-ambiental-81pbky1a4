import { useState, useEffect } from 'react'
import { Play, Pause } from 'lucide-react'
import { TimeEntry, formatDuration, formatLiveTimer } from '@/types/models'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MemberTimerProps {
  taskId: string
  memberId: string
  timeEntries: TimeEntry[]
  onStart: (taskId: string, memberId: string) => Promise<void>
  onStop: (entryId: string) => Promise<void>
  canStart?: boolean
}

export function MemberTimer({
  taskId,
  memberId,
  timeEntries,
  onStart,
  onStop,
  canStart = true,
}: MemberTimerProps) {
  const [elapsed, setElapsed] = useState(0)

  const activeEntry = timeEntries.find(
    (te) => te.task === taskId && te.team_member === memberId && !te.end_time,
  )
  const isActive = !!activeEntry

  const memberEntries = timeEntries.filter(
    (te) => te.task === taskId && te.team_member === memberId,
  )
  const totalSeconds =
    memberEntries.reduce((sum, te) => sum + (te.duration || 0), 0) + (isActive ? elapsed : 0)

  useEffect(() => {
    if (!isActive || !activeEntry) return
    const startTime = new Date(activeEntry.start_time).getTime()
    const update = () => setElapsed(Math.floor((Date.now() - startTime) / 1000))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [isActive, activeEntry])

  const handleStart = async () => {
    await onStart(taskId, memberId)
  }

  const handleStop = async () => {
    if (!activeEntry) return
    await onStop(activeEntry.id)
  }

  const totalTimeLabel =
    totalSeconds > 0 ? (
      <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
        {formatDuration(totalSeconds)}
      </span>
    ) : null

  if (isActive) {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="destructive"
          className="h-7 bg-emerald-600 hover:bg-emerald-700"
          onClick={handleStop}
        >
          <Pause className="h-3 w-3 mr-1" />
          <span className="font-mono text-xs">{formatLiveTimer(elapsed)}</span>
        </Button>
        {totalTimeLabel}
      </div>
    )
  }

  const startDisabled = !canStart

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        className={cn('h-7', startDisabled && 'opacity-50 cursor-not-allowed')}
        disabled={startDisabled}
        onClick={handleStart}
      >
        <Play className="h-3 w-3 mr-1" />
        <span className="text-xs">Play</span>
      </Button>
      {totalTimeLabel}
    </div>
  )
}
