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
  onEdit: (id: string, data: Partial<Task>) => Promise<void>
  onEditStatus: (id: string, status: TaskStatus) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onStartTimer: (taskId: string, memberId: string) => Promise<void>
  onStopTimer: (entryId: string) => Promise<void>
  onRemoveMember: (taskId: string, memberId: string) => Promise<void>
  onSetAssignmentDate: (
    taskId: string,
    memberId: string,
    field: 'start_date' | 'end_date',
    value: string,
  ) => Promise<void>
}

export function TaskList({
  tasks,
  timeEntries,
  taskAssignments,
  projectId,
  teamMembers,
  onEdit,
  onEditStatus,
  onDelete,
  onStartTimer,
  onStopTimer,
  onRemoveMember,
  onSetAssignmentDate,
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
        const taskMembers = taskAssignmentsForTask
          .map((ta) => teamMembers.find((m) => m.id === ta.team_member))
          .filter(Boolean) as TeamMember[]

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
            </div>

            {taskMembers.length > 0 ? (
              <div className="mt-2 space-y-1">
                {taskMembers.map((member) => {
                  const assignment = taskAssignments.find(
                    (ta) => ta.task === task.id && ta.team_member === member.id,
                  )
                  const hasActiveTimer = timeEntries.some(
                    (te) => te.task === task.id && te.team_member === member.id && !te.end_time,
                  )
                  return (
                    <div
                      key={member.id}
                      className={cn(
                        'py-1 px-2 rounded-md transition-colors',
                        hasActiveTimer && 'bg-blue-50',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Users className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="text-xs text-slate-600 truncate">{member.name}</span>
                          <button
                            onClick={() => onRemoveMember(task.id, member.id)}
                            className="rounded-full hover:bg-slate-200 p-0.5 shrink-0"
                          >
                            <X className="h-2.5 w-2.5 text-slate-400" />
                          </button>
                        </div>
                        <MemberTimer
                          taskId={task.id}
                          memberId={member.id}
                          timeEntries={timeEntries}
                          onStart={onStartTimer}
                          onStop={onStopTimer}
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-1 ml-4">
                        <DatePicker
                          compact
                          value={assignment?.start_date || ''}
                          onChange={(v) => onSetAssignmentDate(task.id, member.id, 'start_date', v)}
                          placeholder="Início"
                        />
                        <DatePicker
                          compact
                          value={assignment?.end_date || ''}
                          onChange={(v) => onSetAssignmentDate(task.id, member.id, 'end_date', v)}
                          placeholder="Término"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-2">Sem membros atribuídos</p>
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
