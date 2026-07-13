import { useState, useEffect, ReactNode } from 'react'
import { UserPlus, Loader2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { extractFieldErrors, getErrorMessage, type FieldErrors } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { createTeamMember, updateTeamMember, type TeamMember } from '@/services/team-members'

interface MemberDialogProps {
  onCreated?: () => void
  trigger?: ReactNode
  member?: TeamMember
}

export function MemberDialog({ onCreated, trigger, member }: MemberDialogProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const { toast } = useToast()
  const isEdit = !!member

  const [form, setForm] = useState({ name: '', function: '' })

  useEffect(() => {
    if (open) {
      setForm({
        name: member?.name || '',
        function: member?.function || '',
      })
      setFieldErrors({})
    }
  }, [open, member])

  const update = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }))
    setFieldErrors((p) => ({ ...p, [field]: '' }))
  }

  const handleSubmit = async () => {
    const errors: FieldErrors = {}
    if (!form.name.trim()) errors.name = 'O nome é obrigatório.'
    if (!form.function.trim()) errors.function = 'A função é obrigatória.'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSaving(true)
    setFieldErrors({})
    try {
      if (isEdit && member) {
        await updateTeamMember(member.id, {
          name: form.name.trim(),
          function: form.function.trim(),
        })
        toast({ title: 'Membro atualizado com sucesso!' })
      } else {
        await createTeamMember({
          name: form.name.trim(),
          function: form.function.trim(),
        })
        toast({ title: 'Membro cadastrado com sucesso!' })
      }
      setOpen(false)
      onCreated?.()
    } catch (err) {
      const pbErrors = extractFieldErrors(err)
      if (Object.keys(pbErrors).length > 0) {
        setFieldErrors(pbErrors)
      } else {
        toast({
          title: isEdit ? 'Erro ao atualizar membro' : 'Erro ao cadastrar membro',
          description: getErrorMessage(err),
          variant: 'destructive',
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const defaultTrigger = isEdit ? (
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  ) : (
    <Button size="sm">
      <UserPlus className="h-4 w-4 mr-2" /> Cadastrar Novo Membro
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Membro' : 'Cadastrar Novo Membro'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Nome completo"
              className={cn(fieldErrors.name && 'border-red-500 focus-visible:ring-red-500')}
            />
            {fieldErrors.name && <p className="text-xs text-red-500">{fieldErrors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label>Função</Label>
            <Input
              value={form.function}
              onChange={(e) => update('function', e.target.value)}
              placeholder="Ex: Desenvolvedor, Designer, Gerente"
              className={cn(fieldErrors.function && 'border-red-500 focus-visible:ring-red-500')}
            />
            {fieldErrors.function && <p className="text-xs text-red-500">{fieldErrors.function}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !form.name.trim() || !form.function.trim()}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEdit ? (
                'Salvar Alterações'
              ) : (
                'Cadastrar Membro'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
