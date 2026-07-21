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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { extractFieldErrors, getErrorMessage, type FieldErrors } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { createTeamMember, updateTeamMember, type TeamMember } from '@/services/team-members'

const sectorOptions = ['Meio-Ambiente', 'Desenvolvimento Urbano', 'Administrativo']

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

  const [form, setForm] = useState({ name: '', function: '', setor: '', email: '' })

  useEffect(() => {
    if (open) {
      setForm({
        name: member?.name || '',
        function: member?.function || '',
        setor: member?.setor || '',
        email: member?.email || '',
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
    if (!form.setor) errors.setor = 'O setor é obrigatório.'
    if (!form.email.trim()) {
      errors.email = 'O email é obrigatório.'
    } else if (!emailRegex.test(form.email.trim())) {
      errors.email = 'Informe um email válido (ex: nome@exemplo.com).'
    }
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
          setor: form.setor,
          email: form.email.trim(),
        })
        toast({ title: 'Membro atualizado com sucesso!' })
      } else {
        await createTeamMember({
          name: form.name.trim(),
          function: form.function.trim(),
          setor: form.setor,
          email: form.email.trim(),
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

  const isFormValid =
    form.name.trim() &&
    form.function.trim() &&
    form.setor &&
    form.email.trim() &&
    emailRegex.test(form.email.trim())

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
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="nome@exemplo.com"
              className={cn(fieldErrors.email && 'border-red-500 focus-visible:ring-red-500')}
            />
            {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
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
          <div className="space-y-2">
            <Label>Setor</Label>
            <Select value={form.setor} onValueChange={(v) => update('setor', v)}>
              <SelectTrigger
                className={cn(fieldErrors.setor && 'border-red-500 focus-visible:ring-red-500')}
              >
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent>
                {sectorOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.setor && <p className="text-xs text-red-500">{fieldErrors.setor}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !isFormValid}>
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
