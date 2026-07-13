import { useState, useEffect, ReactNode } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Task, TaskStatus, Allocation } from '@/types/models'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

const statusOptions: TaskStatus[] = ['Pendente', 'Em Andamento', 'Concluído']

interface TaskDialogProps {
  projectId: string
  allocations: Allocation[]
  onAdd?: (data: Partial<Task>) => Promise<void>
  onEdit?: (id: string, data: Partial<Task>) => Promise<void>
  task?: Task
  trigger?: ReactNode
}

export function TaskDialog({
  projectId,
  allocations,
  onAdd,
  onEdit,
  task,
  trigger,
}: TaskDialogProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const isEdit = !!task

  const [form, setForm] = useState({
    title: '',
    description: '',
    allocation: '',
    start_date: '',
    due_date: '',
    status: 'Pendente' as TaskStatus,
  })

  useEffect(() => {
    if (open && task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        allocation: task.allocation || '',
        start_date: task.start_date || '',
        due_date: task.due_date || '',
        status: task.status || 'Pendente',
      })
    } else if (open && !task) {
      setForm({
        title: '',
        description: '',
        allocation: '',
        start_date: '',
        due_date: '',
        status: 'Pendente',
      })
    }
  }, [open, task])

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }))

  const handleSubmit = async () => {
    if (!form.title || !form.allocation) return
    setSaving(true)
    try {
      const data = {
        project: projectId,
        allocation: form.allocation,
        title: form.title,
        description: form.description,
        status: form.status,
        start_date: form.start_date,
        due_date: form.due_date,
      }
      if (isEdit && onEdit) {
        await onEdit(task!.id, data)
      } else if (onAdd) {
        await onAdd(data)
      }
      setOpen(false)
    } catch {
      /* toast handles error */
    } finally {
      setSaving(false)
    }
  }

  const defaultTrigger = (
    <Button size="sm">
      <Plus className="h-4 w-4 mr-2" /> Nova Tarefa
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
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
              <Label>Data de Início</Label>
              <DatePicker value={form.start_date} onChange={(v) => update('start_date', v)} />
            </div>
            <div className="space-y-2">
              <Label>Data de Finalização</Label>
              <DatePicker value={form.due_date} onChange={(v) => update('due_date', v)} />
            </div>
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
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !form.title || !form.allocation}>
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
