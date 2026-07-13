import { Pencil, Trash2, X, Users } from 'lucide-react'
import {
  Task,
  TaskStatus,
  Allocation,
  TimeEntry,
  TeamMember,
  safeFormatDate,
  formatDuration,
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
import { TaskTimer } from '@/components/task-timer'

const statusOptions: TaskStatus[] = ['Pendente', 'Em Andamento', 'Concluído']

const statusBadge: Record<TaskStatus, string> = {
  Pendente: 'bg-amber-50 text-amber-700 border-amber-200',
  'Em Andamento': 'bg-blue-50 text-blue-700 border-blue-200',
  Concluído: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

interface TaskListProps {
  tasks: Task[]
  allocations: Allocation[]
  timeEntries: TimeEntry[]
  projectId: string
  teamMembers: TeamMember[]
  onEdit: (id: string, data: Partial<Task>) => Promise<void>
  onEditStatus: (id: string, status: TaskStatus) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onStartTimer: (taskId: string, allocationId: string) => Promise<void>
  onStopTimer: (entryId: string) => Promise<void>
  onRemoveAllocation: (taskId: string, allocationId: string) => Promise<void>
  onRemoveMember: (taskId: string, memberId: string) => Promise<void>
}

export function TaskList({
  tasks,
  allocations,
  timeEntries,
  projectId,
  teamMembers,
  onEdit,
  onEditStatus,
  onDelete,
  onStartTimer,
  onStopTimer,
  onRemoveAllocation,
  onRemoveMember,
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
        const taskAllocations: Allocation[] = Array.isArray(task.expand?.allocation)
          ? task.expand.allocation
          : task.expand?.allocation
            ? [task.expand.allocation]
            : []
        const taskMembers: TeamMember[] = (task.members || [])
          .map((id) => teamMembers.find((m) => m.id === id))
          .filter(Boolean) as TeamMember[]
        const totalTime = timeEntries
          .filter((te) => te.task === task.id)
          .reduce((sum, te) => sum + (te.duration || 0), 0)

        return (
          <div
            key={task.id}
            className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
          >
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
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {taskAllocations.map((alloc) => (
                  <Badge
                    key={alloc.id}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1 text-xs"
                  >
                    {alloc.member_name}
                    <button
                      onClick={() => onRemoveAllocation(task.id, alloc.id)}
                      className="rounded-full hover:bg-slate-300 p-0.5"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
                {taskMembers.map((member) => (
                  <Badge
                    key={member.id}
                    variant="outline"
                    className="flex items-center gap-1 pr-1 text-xs"
                  >
                    <Users className="h-2.5 w-2.5" />
                    {member.name}
                    <button
                      onClick={() => onRemoveMember(task.id, member.id)}
                      className="rounded-full hover:bg-slate-300 p-0.5"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
                {taskAllocations.length === 0 && taskMembers.length === 0 && (
                  <span className="text-xs text-slate-400">Sem membros atribuídos</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 flex-wrap">
                {task.start_date && <span>Início: {safeFormatDate(task.start_date)}</span>}
                {task.due_date && <span>Prazo: {safeFormatDate(task.due_date)}</span>}
                {totalTime > 0 && (
                  <span className="text-slate-600 font-medium">
                    Trabalhado: {formatDuration(totalTime)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <TaskTimer
                taskId={task.id}
                allocationIds={task.allocation || []}
                timeEntries={timeEntries}
                onStart={onStartTimer}
                onStop={onStopTimer}
              />
              <div className="flex items-center gap-1">
                <TaskDialog
                  projectId={projectId}
                  allocations={allocations}
                  teamMembers={teamMembers}
                  onEdit={onEdit}
                  task={task}
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
          </div>
        )
      })}
    </div>
  )
}
