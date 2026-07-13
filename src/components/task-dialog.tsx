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
import { extractFieldErrors, getErrorMessage, type FieldErrors } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const { toast } = useToast()
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
    setFieldErrors({})
  }, [open, task])

  const update = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }))
    setFieldErrors((p) => ({ ...p, [field]: '' }))
  }

  const handleSubmit = async () => {
    const errors: FieldErrors = {}
    if (!form.title.trim()) errors.title = 'O título é obrigatório.'
    if (!form.allocation) errors.allocation = 'Selecione um membro.'
    if (!form.status) errors.status = 'O status é obrigatório.'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSaving(true)
    setFieldErrors({})
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
            <Label>Membro Atribuído</Label>
            <Select value={form.allocation} onValueChange={(v) => update('allocation', v)}>
              <SelectTrigger
                className={cn(
                  fieldErrors.allocation && 'border-red-500 focus-visible:ring-red-500',
                )}
              >
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
            {fieldErrors.allocation && (
              <p className="text-xs text-red-500">{fieldErrors.allocation}</p>
            )}
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
            {fieldErrors.status && <p className="text-xs text-red-500">{fieldErrors.status}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !form.title.trim() || !form.allocation}
            >
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
