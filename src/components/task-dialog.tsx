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

const statusOptions: TaskStatus[] = ['Pendente', 'Em Andamento', 'Concluído']

interface TaskDialogProps {
  projectId: string
  teamMembers: TeamMember[]
  onAdd?: (data: Partial<Task>) => Promise<void>
  onEdit?: (id: string, data: Partial<Task>) => Promise<void>
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
  const isEdit = !!task

  const [form, setForm] = useState({
    title: '',
    description: '',
    members: [] as string[],
    start_date: '',
    due_date: '',
    status: 'Pendente' as TaskStatus,
    planned_hours: '',
  })

  const taskAssignmentsRef = useRef(taskAssignments)
  taskAssignmentsRef.current = taskAssignments

  useEffect(() => {
    if (open && task) {
      const assignedMemberIds = (taskAssignmentsRef.current || [])
        .filter((ta) => ta.task === task.id)
        .map((ta) => ta.team_member)
      setForm({
        title: task.title || '',
        description: task.description || '',
        members: assignedMemberIds,
        start_date: task.start_date || '',
        due_date: task.due_date || '',
        status: task.status || 'Pendente',
        planned_hours: task.planned_hours ? String(task.planned_hours) : '',
      })
    } else if (open && !task) {
      setForm({
        title: '',
        description: '',
        members: [],
        start_date: '',
        due_date: '',
        status: 'Pendente',
        planned_hours: '',
      })
    }
    setFieldErrors({})
  }, [open, task])

  const update = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }))
    setFieldErrors((p) => ({ ...p, [field]: '' }))
  }

  const addMember = (memberId: string) => {
    if (!form.members.includes(memberId)) {
      setForm((p) => ({ ...p, members: [...p.members, memberId] }))
    }
  }

  const removeMember = (memberId: string) => {
    setForm((p) => ({ ...p, members: p.members.filter((id) => id !== memberId) }))
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
      const data = {
        project: projectId,
        members: form.members,
        title: form.title,
        description: form.description,
        status: form.status,
        start_date: form.start_date,
        due_date: form.due_date,
        planned_hours: form.planned_hours ? Number(form.planned_hours) : 0,
      }
      if (isEdit && onEdit) {
        await onEdit(task!.id, data)
      } else if (onAdd) {
        await onAdd(data)
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
              <Label>Usuários CEDRO da Equipe</Label>
              <p className="text-xs text-slate-400 mt-0.5">
                Cada Usuário CEDRO terá controle individual de datas e tempo na tarefa.
              </p>
            </div>
            {form.members.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.members.map((memberId) => {
                  const member = teamMembers.find((m) => m.id === memberId)
                  return (
                    <Badge
                      key={memberId}
                      variant="outline"
                      className="flex items-center gap-1.5 pr-1.5"
                    >
                      {member?.name}
                      <button
                        type="button"
                        onClick={() => removeMember(memberId)}
                        className="rounded-full hover:bg-slate-300 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )
                })}
              </div>
            )}
            {availableMembers.length > 0 && (
              <Select value="" onValueChange={(v) => addMember(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Adicionar Usuário CEDRO da equipe" />
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
                Nenhum Usuário CEDRO cadastrado. Cadastre Usuários CEDRO na aba Usuários CEDRO.
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
            />
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
