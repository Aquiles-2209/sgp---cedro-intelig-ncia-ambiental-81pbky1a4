import { Pencil, Trash2, X, Users } from 'lucide-react'
import {
  Task,
  TaskStatus,
  TimeEntry,
  TeamMember,
  TaskAssignment,
  safeFormatDate,
} from '@/types/models'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TaskDialog } from '@/components/task-dialog'
import { MemberTimer } from '@/components/task-timer'
import { DatePicker } from '@/components/date-picker'
import { cn } from '@/lib/utils'

const statusOptions: TaskStatus[] = ['Pendente', 'Em Andamento', 'Concluído']

const statusBadge: Record<TaskStatus, string> = {
  Pendente: 'bg-amber-50 text-amber-700 border-amber-200',
  'Em Andamento': 'bg-blue-50 text-blue-700 border-blue-200',
  Concluído: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

interface TaskListProps {
  tasks: Task[]
  timeEntries: TimeEntry[]
  taskAssignments: TaskAssignment[]
  projectId: string
  teamMembers: TeamMember[]
  isAdmin: boolean
  isMaster?: boolean
  userAllocIds: string[]
  onEdit: (id: string, data: Partial<Task>) => Promise<Task | void>
  onEditStatus: (id: string, status: TaskStatus) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onStartTimer: (taskId: string, memberId: string) => Promise<void>
  onStopTimer: (entryId: string, endTime?: string, duration?: number) => Promise<void>
  onAdjustHours?: (taskId: string, memberId: string, hours: number, isAdd: boolean) => Promise<void>
  onRemoveMember: (taskId: string, memberId: string) => Promise<void>
  onSetAssignmentDate: (
    taskId: string,
    memberId: string,
    field: 'start_date' | 'end_date',
    value: string,
  ) => Promise<void>
  savingAssignmentKey?: string
}

export function TaskList({
  tasks,
  timeEntries,
  taskAssignments,
  projectId,
  teamMembers,
  isAdmin,
  isMaster = false,
  userAllocIds,
  onEdit,
  onEditStatus,
  onDelete,
  onStartTimer,
  onStopTimer,
  onAdjustHours,
  onRemoveMember,
  onSetAssignmentDate,
  savingAssignmentKey,
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        Nenhuma tarefa cadastrada para este projeto.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const taskAssignmentsForTask = taskAssignments.filter((ta) => ta.task === task.id)
        const assignmentMemberIds = taskAssignmentsForTask.map((ta) => ta.team_member)
        const allMemberIds = Array.from(new Set([...assignmentMemberIds, ...(task.members || [])]))
        const taskMembers = allMemberIds
          .map((id) => teamMembers.find((m) => m.id === id))
          .filter(Boolean) as TeamMember[]
        const hasTaskAllocation =
          Array.isArray(task.allocation) &&
          task.allocation.length > 0 &&
          task.allocation.some((aid) => userAllocIds.includes(aid))
        const hasProjectAllocation = userAllocIds.length > 0
        const isTaskMember = taskMembers.length > 0
        const canStartTimer = isAdmin || hasTaskAllocation || hasProjectAllocation || isTaskMember

        return (
          <div
            key={task.id}
            className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-900 text-sm">{task.title}</span>
                  <Badge variant="outline" className={statusBadge[task.status]}>
                    {task.status}
                  </Badge>
                </div>
                {task.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                )}
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1 shrink-0">
                  <TaskDialog
                    projectId={projectId}
                    teamMembers={teamMembers}
                    onEdit={onEdit}
                    task={task}
                    taskAssignments={taskAssignmentsForTask}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                  <Select
                    value={task.status}
                    onValueChange={(v) => onEditStatus(task.id, v as TaskStatus)}
                  >
                    <SelectTrigger className="h-8 w-[130px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => onDelete(task.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              )}
            </div>

            {taskMembers.length > 0 ? (
              <div className="mt-2 space-y-1.5">
                {taskMembers.map((member) => {
                  const assignment = taskAssignments.find(
                    (ta) => ta.task === task.id && ta.team_member === member.id,
                  )
                  const hasActiveTimer = timeEntries.some(
                    (te) => te.task === task.id && te.team_member === member.id && !te.end_time,
                  )

                  // Compute worked hours for this task
                  const taskEntries = timeEntries.filter((te) => te.task === task.id)
                  const workedSeconds = taskEntries.reduce((sum, te) => sum + (te.duration || 0), 0)
                  const totalPreviousSeconds =
                    Math.round((task.allocated_hours || 0) * 3600) + workedSeconds
                  const workedHours = totalPreviousSeconds / 3600
                  const plannedHours = task.planned_hours || 0

                  let canStartMember = canStartTimer
                  let disabledReason = ''

                  if (!isMaster) {
                    if (plannedHours > 0 && workedHours >= plannedHours) {
                      canStartMember = false
                      disabledReason =
                        'Saldo de horas esgotado (horas trabalhadas >= horas previstas).'
                    }
                  }
                  return (
                    <div
                      key={member.id}
                      className={cn(
                        'py-1.5 px-2.5 rounded-md transition-colors border',
                        hasActiveTimer
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-slate-50/50 border-transparent',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {hasActiveTimer ? (
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                          ) : (
                            <Users className="h-3 w-3 text-slate-400 shrink-0" />
                          )}
                          <span className="text-xs font-medium text-slate-700 truncate">
                            {member.name}
                          </span>
                          {hasActiveTimer && (
                            <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide">
                              Ativo
                            </span>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => onRemoveMember(task.id, member.id)}
                              className="rounded-full hover:bg-slate-200 p-0.5 shrink-0"
                            >
                              <X className="h-2.5 w-2.5 text-slate-400" />
                            </button>
                          )}
                        </div>
                        <MemberTimer
                          taskId={task.id}
                          memberId={member.id}
                          timeEntries={timeEntries}
                          plannedHours={task.planned_hours}
                          previousSeconds={totalPreviousSeconds}
                          activityType={task.activity_type}
                          onStart={onStartTimer}
                          onStop={onStopTimer}
                          onAdjustHours={onAdjustHours}
                          canStart={canStartMember}
                          disabledReason={disabledReason}
                        />
                      </div>
                      <div className="flex items-center gap-4 mt-2 ml-5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide whitespace-nowrap">
                            Início
                          </span>
                          <span
                            className={cn(
                              'text-xs font-medium',
                              assignment?.start_date ? 'text-slate-700' : 'text-slate-300',
                            )}
                          >
                            {assignment?.start_date
                              ? safeFormatDate(assignment.start_date)
                              : 'Não definida'}
                          </span>
                          {isAdmin && (
                            <DatePicker
                              compact
                              value={assignment?.start_date || ''}
                              onChange={(v) =>
                                onSetAssignmentDate(task.id, member.id, 'start_date', v)
                              }
                              placeholder="—"
                              loading={savingAssignmentKey === `${task.id}-${member.id}-start_date`}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide whitespace-nowrap">
                            Término
                          </span>
                          <span
                            className={cn(
                              'text-xs font-medium',
                              assignment?.end_date ? 'text-slate-700' : 'text-slate-300',
                            )}
                          >
                            {assignment?.end_date
                              ? safeFormatDate(assignment.end_date)
                              : 'Não definida'}
                          </span>
                          {isAdmin && (
                            <DatePicker
                              compact
                              value={assignment?.end_date || ''}
                              onChange={(v) =>
                                onSetAssignmentDate(task.id, member.id, 'end_date', v)
                              }
                              placeholder="—"
                              loading={savingAssignmentKey === `${task.id}-${member.id}-end_date`}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-2">Sem Usuário(a)s CEDRO atribuído(a)s</p>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
              {task.start_date && <span>Início: {safeFormatDate(task.start_date)}</span>}
              {task.due_date && <span>Prazo: {safeFormatDate(task.due_date)}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
