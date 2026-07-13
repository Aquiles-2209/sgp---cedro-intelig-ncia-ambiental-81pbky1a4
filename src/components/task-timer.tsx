import { useState, useEffect } from 'react'
import { Play, Pause, Clock } from 'lucide-react'
import { TimeEntry, formatDuration, formatLiveTimer } from '@/types/models'
import { Button } from '@/components/ui/button'

interface TaskTimerProps {
  taskId: string
  allocationIds: string[]
  timeEntries: TimeEntry[]
  onStart: (taskId: string, allocationId: string) => Promise<void>
  onStop: (entryId: string) => Promise<void>
}

export function TaskTimer({ taskId, allocationIds, timeEntries, onStart, onStop }: TaskTimerProps) {
  const [elapsed, setElapsed] = useState(0)

  const activeEntries = timeEntries.filter(
    (te) => allocationIds.includes(te.allocation) && !te.end_time,
  )
  const activeEntryForThisTask = activeEntries.find((te) => te.task === taskId)
  const activeEntryForOtherTask = activeEntries.find((te) => te.task !== taskId)
  const isActive = !!activeEntryForThisTask
  const isBlocked = !isActive && !!activeEntryForOtherTask

  const totalSeconds =
    timeEntries
      .filter((te) => te.task === taskId)
      .reduce((sum, te) => sum + (te.duration || 0), 0) + (isActive ? elapsed : 0)

  useEffect(() => {
    if (!isActive || !activeEntryForThisTask) return
    const startTime = new Date(activeEntryForThisTask.start_time).getTime()
    const update = () => setElapsed(Math.floor((Date.now() - startTime) / 1000))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [isActive, activeEntryForThisTask])

  const handlePlay = async () => {
    if (activeEntries.length > 0 || allocationIds.length === 0) return
    await onStart(taskId, allocationIds[0])
  }

  const handlePause = async () => {
    if (!activeEntryForThisTask) return
    await onStop(activeEntryForThisTask.id)
  }

  const totalTimeLabel =
    totalSeconds > 0 ? (
      <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
        Total: {formatDuration(totalSeconds)}
      </span>
    ) : null

  if (isActive) {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="destructive" className="h-8" onClick={handlePause}>
          <Pause className="h-3.5 w-3.5 mr-1" />
          <span className="font-mono text-xs">{formatLiveTimer(elapsed)}</span>
        </Button>
        {totalTimeLabel}
      </div>
    )
  }

  if (isBlocked) {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled className="h-8 opacity-50">
          <Clock className="h-3.5 w-3.5 mr-1" />
          <span className="text-xs">Em uso</span>
        </Button>
        {totalTimeLabel}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        className="h-8"
        onClick={handlePlay}
        disabled={allocationIds.length === 0}
      >
        <Play className="h-3.5 w-3.5 mr-1" />
        <span className="text-xs">Iniciar</span>
      </Button>
      {totalTimeLabel}
    </div>
  )
}
