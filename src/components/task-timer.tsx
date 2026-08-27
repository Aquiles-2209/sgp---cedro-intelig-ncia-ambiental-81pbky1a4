import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Clock } from 'lucide-react'
import { TimeEntry, formatDuration, formatLiveTimer } from '@/types/models'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface MemberTimerProps {
  taskId: string
  memberId: string
  timeEntries: TimeEntry[]
  plannedHours?: number
  previousSeconds?: number
  activityType?: 'Campo' | 'Escritório' | string
  onStart: (taskId: string, memberId: string) => Promise<void>
  onStop: (entryId: string, endTime?: string, duration?: number) => Promise<void>
  onAdjustHours?: (taskId: string, memberId: string, hours: number, isAdd: boolean) => Promise<void>
  canStart?: boolean
  disabledReason?: string
}

export function MemberTimer({
  taskId,
  memberId,
  timeEntries,
  plannedHours,
  previousSeconds = 0,
  activityType,
  onStart,
  onStop,
  onAdjustHours,
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
    plannedHoursRef.current = plannedHours || 0
    previousSecondsRef.current = previousSeconds
    if (!wasActiveRef.current && activeEntry) {
      startTimeRef.current = new Date(activeEntry.start_time).getTime()
      entryIdRef.current = activeEntry.id
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

      if (
        !isStoppingRef.current &&
        plannedHoursRef.current > 0 &&
        previousSecondsRef.current + currentElapsed >= plannedHoursRef.current * 3600
      ) {
        isStoppingRef.current = true
        const maxLimitSeconds = plannedHoursRef.current * 3600
        const clampedDuration = Math.max(0, maxLimitSeconds - previousSecondsRef.current)
        const stopEndTime = new Date(startTimeRef.current + clampedDuration * 1000).toISOString()
        setElapsed(clampedDuration)
        onStopRef.current(entryIdRef.current, stopEndTime, clampedDuration).catch(() => {
          isStoppingRef.current = false
        })
      } else {
        setElapsed(currentElapsed)
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

  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [adjustHoursValue, setAdjustHoursValue] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  const handleAdjust = async (isAdd: boolean) => {
    const val = parseFloat(adjustHoursValue.replace(',', '.'))
    if (isNaN(val) || val <= 0) return
    if (!onAdjustHours) return

    setAdjusting(true)
    try {
      await onAdjustHours(taskId, memberId, val, isAdd)
      setAdjustDialogOpen(false)
      setAdjustHoursValue('')
    } finally {
      setAdjusting(false)
    }
  }

  const totalTimeLabel =
    totalSeconds !== 0 ? (
      <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
        {formatDuration(totalSeconds)}
      </span>
    ) : null

  const isCampo = activityType === 'Campo'

  const adjustHoursButtonAndDialog = isCampo ? (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-6 text-[11px] px-2 text-slate-600 hover:text-slate-900 border-slate-200"
        onClick={() => {
          setAdjustHoursValue('')
          setAdjustDialogOpen(true)
        }}
      >
        <Clock className="h-3 w-3 mr-1" />
        Adicionar/Subtrair Horas
      </Button>

      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Adicionar/Subtrair Horas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-xs text-slate-600 block">
              Valor em horas decimais (ex: 0.5 para 30 min, 1.0 para 1 hora):
            </label>
            <Input
              type="number"
              step="any"
              min="0.01"
              placeholder="Ex: 1.5"
              value={adjustHoursValue}
              onChange={(e) => setAdjustHoursValue(e.target.value)}
              disabled={adjusting}
              autoFocus
            />
          </div>
          <DialogFooter className="flex-row justify-end gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAdjustDialogOpen(false)}
              disabled={adjusting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => handleAdjust(false)}
              disabled={
                adjusting ||
                !adjustHoursValue ||
                isNaN(parseFloat(adjustHoursValue.replace(',', '.'))) ||
                parseFloat(adjustHoursValue.replace(',', '.')) <= 0
              }
            >
              Subtrair
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => handleAdjust(true)}
              disabled={
                adjusting ||
                !adjustHoursValue ||
                isNaN(parseFloat(adjustHoursValue.replace(',', '.'))) ||
                parseFloat(adjustHoursValue.replace(',', '.')) <= 0
              }
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  ) : null

  if (isActive) {
    return (
      <div className="flex flex-col items-start gap-1.5">
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
        {adjustHoursButtonAndDialog}
      </div>
    )
  }

  const startDisabled = !canStart

  return (
    <div className="flex flex-col items-start gap-1.5">
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
      {adjustHoursButtonAndDialog}
    </div>
  )
}
