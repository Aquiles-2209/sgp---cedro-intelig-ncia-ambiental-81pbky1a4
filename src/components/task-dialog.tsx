import { useState, useEffect, useRef, ReactNode } from 'react'
import { Plus, Loader2, X } from 'lucide-react'
import { Task, TaskStatus, TeamMember, TaskAssignment } from '@/types/models'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/date-picker'
import { extractFieldErrors, getErrorMessage, type FieldErrors } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  createTaskAssignment,
  updateTaskAssignment,
  deleteTaskAssignment,
} from '@/services/task-assignments'
import { createTask, updateTask } from '@/services/tasks'
import { getTaskAssignmentsByTask } from '@/services/task-assignments'
import { useAuth } from '@/hooks/use-auth'

const statusOptions: TaskStatus[] = ['Pendente', 'Em Andamento', 'Concluído']

interface TaskDialogProps {
  projectId: string
  teamMembers: TeamMember[]
  onAdd?: (data: Partial<Task>) => Promise<Task | void>
  onEdit?: (id: string, data: Partial<Task>) => Promise<Task | void>
  task?: Task
  taskAssignments?: TaskAssignment[]
  trigger?: ReactNode
}

export function TaskDialog({
  projectId,
  teamMembers,
  onAdd,
  onEdit,
  task,
  taskAssignments,
  trigger,
}: TaskDialogProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const { toast } = useToast()
  const { user } = useAuth()
  const isMaster = user?.role === 'master'
  const isEdit = !!task

  const [form, setForm] = useState({
    title: '',
    description: '',
    members: [] as string[],
    memberPercentages: {} as Record<string, string>,
    start_date: '',
    due_date: '',
    status: 'Pendente' as TaskStatus,
    planned_hours: '',
    activity_type: '' as '' | 'Campo' | 'Escritório',
  })

  const taskAssignmentsRef = useRef(taskAssignments)
  taskAssignmentsRef.current = taskAssignments

  useEffect(() => {
    if (open && task) {
      const currentTaskAssignments = (taskAssignmentsRef.current || []).filter(
        (ta) => ta.task === task.id,
      )
      const assignedMemberIds = Array.from(
        new Set([...currentTaskAssignments.map((ta) => ta.team_member), ...(task.members || [])]),
      )
      const percentages: Record<string, string> = {}
      currentTaskAssignments.forEach((ta) => {
        if (ta.workload_percentage !== undefined && ta.workload_percentage !== null) {
          percentages[ta.team_member] = String(ta.workload_percentage)
        }
      })

      setForm({
        title: task.title || '',
        description: task.description || '',
        members: assignedMemberIds,
        memberPercentages: percentages,
        start_date: task.start_date || '',
        due_date: task.due_date || '',
        status: task.status || 'Pendente',
        planned_hours: task.planned_hours ? String(task.planned_hours) : '',
        activity_type: task.activity_type || '',
      })
    } else if (open && !task) {
      setForm({
        title: '',
        description: '',
        members: [],
        memberPercentages: {},
        start_date: '',
        due_date: '',
        status: 'Pendente',
        planned_hours: '',
        activity_type: '',
      })
    }
    setFieldErrors({})
  }, [open, task])

  const update = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }))
    setFieldErrors((p) => ({ ...p, [field]: '' }))
  }

  const updateMemberPercentage = (memberId: string, value: string) => {
    setForm((p) => ({
      ...p,
      memberPercentages: {
        ...p.memberPercentages,
        [memberId]: value,
      },
    }))
  }

  const addMember = (memberId: string) => {
    if (!form.members.includes(memberId)) {
      setForm((p) => {
        const nextMembers = [...p.members, memberId]
        const nextPercentages = { ...p.memberPercentages }
        if (!nextPercentages[memberId]) {
          // If 1 member, default 100%, otherwise leave blank or equal share if not set
          if (nextMembers.length === 1) {
            nextPercentages[memberId] = '100'
          } else {
            nextPercentages[memberId] = ''
          }
        }
        return {
          ...p,
          members: nextMembers,
          memberPercentages: nextPercentages,
        }
      })
    }
  }

  const removeMember = (memberId: string) => {
    setForm((p) => {
      const nextPercentages = { ...p.memberPercentages }
      delete nextPercentages[memberId]
      return {
        ...p,
        members: p.members.filter((id) => id !== memberId),
        memberPercentages: nextPercentages,
      }
    })
  }

  const handleSubmit = async () => {
    const errors: FieldErrors = {}
    if (!form.title.trim()) errors.title = 'O título é obrigatório.'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSaving(true)
    setFieldErrors({})
    try {
      const data: Partial<Task> = {
        project: projectId,
        members: form.members,
        title: form.title,
        description: form.description,
        status: form.status,
        start_date: form.start_date,
        due_date: form.due_date,
        planned_hours: form.planned_hours ? Number(form.planned_hours) : 0,
        activity_type: (form.activity_type as 'Campo' | 'Escritório') || undefined,
      }
      let taskId = task?.id
      if (isEdit && onEdit) {
        await onEdit(task!.id, data)
      } else if (onAdd) {
        const result: any = await onAdd(data)
        if (result && result.id) {
          taskId = result.id
        }
      }

      // Sincronizar task_assignments
      if (taskId) {
        const currentAssignments = (taskAssignmentsRef.current || []).filter(
          (ta) => ta.task === taskId,
        )
        const currentMemberIds = currentAssignments.map((ta) => ta.team_member)
        const selectedMemberIds = form.members

        // Removidos
        const toRemove = currentAssignments.filter(
          (ta) => !selectedMemberIds.includes(ta.team_member),
        )
        for (const ta of toRemove) {
          await deleteTaskAssignment(ta.id)
        }

        // Adicionados
        const toAdd = selectedMemberIds.filter((id) => !currentMemberIds.includes(id))
        for (const memberId of toAdd) {
          const rawPct = form.memberPercentages[memberId]
          const pct = rawPct !== undefined && rawPct !== '' ? Number(rawPct) : undefined
          await createTaskAssignment({
            task: taskId,
            team_member: memberId,
            start_date: form.start_date || undefined,
            end_date: form.due_date || undefined,
            workload_percentage: pct !== undefined && !isNaN(pct) ? pct : undefined,
          })
        }

        // Atualizados (datas de início/término ou workload_percentage)
        const toKeep = currentAssignments.filter((ta) => selectedMemberIds.includes(ta.team_member))
        for (const ta of toKeep) {
          const updateData: Partial<TaskAssignment> = {}
          if (form.start_date && !ta.start_date) {
            updateData.start_date = form.start_date
          }
          if (form.due_date && !ta.end_date) {
            updateData.end_date = form.due_date
          }
          const rawPct = form.memberPercentages[ta.team_member]
          const pct = rawPct !== undefined && rawPct !== '' ? Number(rawPct) : 0
          if (ta.workload_percentage !== pct) {
            updateData.workload_percentage = pct
          }
          if (Object.keys(updateData).length > 0) {
            await updateTaskAssignment(ta.id, updateData)
          }
        }
      }
      setOpen(false)
    } catch (err) {
      const pbErrors = extractFieldErrors(err)
      if (Object.keys(pbErrors).length > 0) {
        setFieldErrors(pbErrors)
      } else {
        toast({
          title: 'Erro ao salvar tarefa',
          description: getErrorMessage(err),
          variant: 'destructive',
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const defaultTrigger = (
    <Button size="sm">
      <Plus className="h-4 w-4 mr-2" /> Nova Tarefa
    </Button>
  )

  const availableMembers = teamMembers.filter((m) => !form.members.includes(m.id))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Título da tarefa"
              className={cn(fieldErrors.title && 'border-red-500 focus-visible:ring-red-500')}
            />
            {fieldErrors.title && <p className="text-xs text-red-500">{fieldErrors.title}</p>}
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={3}
              placeholder="Detalhes da tarefa"
            />
          </div>
          <div className="space-y-2">
            <div>
              <Label>Usuário(a)s CEDRO da Equipe</Label>
              <p className="text-xs text-slate-400 mt-0.5">
                Cada Usuário(a) CEDRO terá controle individual de datas e tempo na tarefa.
              </p>
            </div>
            {form.members.length > 0 && (
              <div className="space-y-2 border border-slate-200 rounded-lg p-2.5 bg-slate-50/50">
                <div className="text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                  <span>Membro Alocado</span>
                  <span>Rateio (%)</span>
                </div>
                {form.members.map((memberId) => {
                  const member = teamMembers.find((m) => m.id === memberId)
                  const pctVal = form.memberPercentages[memberId] ?? ''
                  const plannedNum = parseFloat(form.planned_hours) || 0
                  const pctNum = parseFloat(pctVal) || 0
                  const calculatedHours =
                    plannedNum > 0 && pctNum > 0 ? (plannedNum * pctNum) / 100 : null

                  return (
                    <div
                      key={memberId}
                      className="flex items-center justify-between gap-3 bg-white p-2 rounded border border-slate-200"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xs font-medium text-slate-800 truncate">
                          {member?.name || 'Membro'}
                        </span>
                        {member?.function && (
                          <span className="text-[10px] text-slate-400 truncate">
                            ({member.function})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {calculatedHours !== null && (
                          <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            {Number.isInteger(calculatedHours)
                              ? `${calculatedHours}h`
                              : `${calculatedHours.toFixed(1)}h`}
                          </span>
                        )}
                        <div className="flex items-center gap-1 w-24">
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            placeholder="1-100"
                            value={pctVal}
                            onChange={(e) => {
                              const val = e.target.value
                              if (val === '') {
                                updateMemberPercentage(memberId, '')
                                return
                              }
                              const num = Number(val)
                              if (num >= 0 && num <= 100) {
                                updateMemberPercentage(memberId, val)
                              }
                            }}
                            className="h-8 text-xs text-right pr-2"
                          />
                          <span className="text-xs text-slate-500">%</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMember(memberId)}
                          className="rounded-full hover:bg-slate-100 p-1 text-slate-400 hover:text-slate-600"
                          title="Remover membro"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {availableMembers.length > 0 && (
              <Select value="" onValueChange={(v) => addMember(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Adicionar Usuário(a) CEDRO da equipe" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} — {m.function}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {teamMembers.length === 0 && (
              <p className="text-xs text-slate-400">
                Nenhum(a) Usuário(a) CEDRO cadastrado(a). Cadastre Usuário(a)s CEDRO na aba
                Usuário(a)s CEDRO.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <DatePicker value={form.start_date} onChange={(v) => update('start_date', v)} />
            </div>
            <div className="space-y-2">
              <Label>Data de Finalização</Label>
              <DatePicker value={form.due_date} onChange={(v) => update('due_date', v)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Horas Previstas</Label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={form.planned_hours}
              onChange={(e) => update('planned_hours', e.target.value)}
              placeholder="0"
              disabled={isEdit && !isMaster}
            />
          </div>
          <div className="space-y-2">
            <Label>Atividades</Label>
            <Select value={form.activity_type} onValueChange={(v) => update('activity_type', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de atividade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Campo">Campo</SelectItem>
                <SelectItem value="Escritório">Escritório</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => update('status', v)}>
              <SelectTrigger
                className={cn(fieldErrors.status && 'border-red-500 focus-visible:ring-red-500')}
              >
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
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !form.title.trim()}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEdit ? (
                'Salvar Alterações'
              ) : (
                'Criar Tarefa'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
