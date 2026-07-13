import { useState, useEffect } from 'react'
import { Play, Pause, Clock } from 'lucide-react'
import { TimeEntry, formatDuration, formatLiveTimer } from '@/types/models'
import { Button } from '@/components/ui/button'

interface TaskTimerProps {
  taskId: string
  allocationId: string
  timeEntries: TimeEntry[]
  onStart: (taskId: string, allocationId: string) => Promise<void>
  onStop: (entryId: string) => Promise<void>
}

export function TaskTimer({ taskId, allocationId, timeEntries, onStart, onStop }: TaskTimerProps) {
  const [elapsed, setElapsed] = useState(0)

  const activeEntry = timeEntries.find((te) => te.allocation === allocationId && !te.end_time)
  const isActive = activeEntry?.task === taskId
  const isBlocked = !!activeEntry && activeEntry.task !== taskId

  const totalSeconds =
    timeEntries
      .filter((te) => te.task === taskId)
      .reduce((sum, te) => sum + (te.duration || 0), 0) + (isActive ? elapsed : 0)

  useEffect(() => {
    if (!isActive || !activeEntry) return
    const startTime = new Date(activeEntry.start_time).getTime()
    const update = () => setElapsed(Math.floor((Date.now() - startTime) / 1000))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [isActive, activeEntry])

  const handlePlay = async () => {
    if (activeEntry) return
    await onStart(taskId, allocationId)
  }

  const handlePause = async () => {
    if (!activeEntry) return
    await onStop(activeEntry.id)
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
      <Button size="sm" variant="outline" className="h-8" onClick={handlePlay}>
        <Play className="h-3.5 w-3.5 mr-1" />
        <span className="text-xs">Iniciar</span>
      </Button>
      {totalTimeLabel}
    </div>
  )
}
