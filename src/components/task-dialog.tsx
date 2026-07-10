import { useState } from 'react'
import { Plus, Loader2, Trash2 } from 'lucide-react'
import { Task, TaskStatus, Allocation, normalizeDate } from '@/types/models'
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

interface TaskDialogProps {
  projectId: string
  allocations: Allocation[]
  onAdd: (data: Partial<Task>) => Promise<void>
}

const statusOptions: TaskStatus[] = ['Pendente', 'Em Andamento', 'Concluído']

const statusBadge: Record<TaskStatus, string> = {
  Pendente: 'bg-amber-50 text-amber-700 border-amber-200',
  'Em Andamento': 'bg-blue-50 text-blue-700 border-blue-200',
  Concluído: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export function TaskDialog({ projectId, allocations, onAdd }: TaskDialogProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    allocation: '',
    due_date: '',
    status: 'Pendente' as TaskStatus,
  })

  const reset = () =>
    setForm({ title: '', description: '', allocation: '', due_date: '', status: 'Pendente' })

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    if (!form.title || !form.allocation) return
    setSaving(true)
    try {
      await onAdd({
        project: projectId,
        allocation: form.allocation,
        title: form.title,
        description: form.description,
        status: form.status,
        due_date: form.due_date,
      })
      reset()
      setOpen(false)
    } catch {
      /* handled by toast */
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" /> Nova Tarefa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Título da tarefa"
            />
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
            <Label>Membro Atribuído</Label>
            <Select value={form.allocation} onValueChange={(v) => update('allocation', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar membro" />
              </SelectTrigger>
              <SelectContent>
                {allocations.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.member_name} — {a.function}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {allocations.length === 0 && (
              <p className="text-xs text-red-500">Nenhum membro alocado neste projeto.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prazo</Label>
              <DatePicker value={form.due_date} onChange={(v) => update('due_date', v)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update('status', v)}>
                <SelectTrigger>
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
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !form.title || !form.allocation}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Tarefa'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface TaskListProps {
  tasks: Task[]
  onEditStatus: (id: string, status: TaskStatus) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function TaskList({ tasks, onEditStatus, onDelete }: TaskListProps) {
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
        const memberName = task.expand?.allocation?.member_name || '—'
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
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                <span>{memberName}</span>
                {task.due_date && (
                  <span>
                    Prazo:{' '}
                    {new Date(normalizeDate(task.due_date) + 'T00:00:00').toLocaleDateString(
                      'pt-BR',
                    )}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Select
                value={task.status}
                onValueChange={(v) => onEditStatus(task.id, v as TaskStatus)}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
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
        )
      })}
    </div>
  )
}
