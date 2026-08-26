import { useState, useEffect, useRef } from 'react'
import { Play, Pause } from 'lucide-react'
import { TimeEntry, formatDuration, formatLiveTimer } from '@/types/models'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MemberTimerProps {
  taskId: string
  memberId: string
  timeEntries: TimeEntry[]
  plannedHours?: number
  previousSeconds?: number
  onStart: (taskId: string, memberId: string) => Promise<void>
  onStop: (entryId: string, endTime?: string, duration?: number) => Promise<void>
  canStart?: boolean
  disabledReason?: string
}

export function MemberTimer({
  taskId,
  memberId,
  timeEntries,
  plannedHours,
  previousSeconds = 0,
  onStart,
  onStop,
  canStart = true,
  disabledReason,
}: MemberTimerProps) {
  const [elapsed, setElapsed] = useState(0)
  const isStoppingRef = useRef(false)
  const onStopRef = useRef(onStop)
  onStopRef.current = onStop

  const startTimeRef = useRef(0)
  const entryIdRef = useRef('')
  const plannedHoursRef = useRef(0)
  const previousSecondsRef = useRef(0)
  const wasActiveRef = useRef(false)

  const activeEntry = timeEntries.find(
    (te) => te.task === taskId && te.team_member === memberId && !te.end_time,
  )
  const isActive = !!activeEntry

  if (isActive) {
    if (!wasActiveRef.current && activeEntry) {
      startTimeRef.current = new Date(activeEntry.start_time).getTime()
      entryIdRef.current = activeEntry.id
      plannedHoursRef.current = plannedHours || 0
      previousSecondsRef.current = previousSeconds
      wasActiveRef.current = true
    }
  } else {
    if (wasActiveRef.current) {
      startTimeRef.current = 0
      entryIdRef.current = ''
      plannedHoursRef.current = 0
      previousSecondsRef.current = 0
      isStoppingRef.current = false
      wasActiveRef.current = false
    }
  }

  const memberEntries = timeEntries.filter(
    (te) => te.task === taskId && te.team_member === memberId,
  )
  const totalSeconds =
    memberEntries.reduce((sum, te) => sum + (te.duration || 0), 0) + (isActive ? elapsed : 0)

  useEffect(() => {
    if (!isActive) {
      setElapsed(0)
      return
    }

    const update = () => {
      const currentNow = Date.now()
      const currentElapsed = Math.max(0, Math.floor((currentNow - startTimeRef.current) / 1000))
      setElapsed(currentElapsed)
      if (
        !isStoppingRef.current &&
        plannedHoursRef.current > 0 &&
        previousSecondsRef.current + currentElapsed >= plannedHoursRef.current * 3600
      ) {
        isStoppingRef.current = true
        const stopEndTime = new Date(currentNow).toISOString()
        onStopRef.current(entryIdRef.current, stopEndTime, currentElapsed).catch(() => {
          isStoppingRef.current = false
        })
      }
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [isActive])

  const handleStart = async () => {
    await onStart(taskId, memberId)
  }

  const handleStop = async () => {
    if (!activeEntry) return
    await onStopRef.current(activeEntry.id)
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
    <div
      className="flex items-center gap-2"
      title={startDisabled && disabledReason ? disabledReason : undefined}
    >
      <Button
        size="sm"
        variant="outline"
        className={cn('h-7', startDisabled && 'opacity-50 cursor-not-allowed')}
        disabled={startDisabled}
        onClick={handleStart}
        title={startDisabled && disabledReason ? disabledReason : undefined}
      >
        <Play className="h-3 w-3 mr-1" />
        <span className="text-xs">Play</span>
      </Button>
      {totalTimeLabel}
    </div>
  )
}
