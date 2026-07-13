import { useState, useEffect, ReactNode } from 'react'
import { UserPlus, Loader2 } from 'lucide-react'
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
import { createUser } from '@/services/users'

interface MemberDialogProps {
  onCreated?: () => void
  trigger?: ReactNode
}

export function MemberDialog({ onCreated, trigger }: MemberDialogProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const { toast } = useToast()

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  })

  useEffect(() => {
    if (open) {
      setForm({ name: '', email: '', password: '' })
      setFieldErrors({})
    }
  }, [open])

  const update = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }))
    setFieldErrors((p) => ({ ...p, [field]: '' }))
  }

  const handleSubmit = async () => {
    const errors: FieldErrors = {}
    if (!form.name.trim()) errors.name = 'O nome é obrigatório.'
    if (!form.email.trim()) errors.email = 'O email é obrigatório.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errors.email = 'Formato de email inválido.'
    if (!form.password) errors.password = 'A senha é obrigatória.'
    else if (form.password.length < 8) errors.password = 'A senha deve ter no mínimo 8 caracteres.'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSaving(true)
    setFieldErrors({})
    try {
      await createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      toast({ title: 'Membro cadastrado com sucesso!' })
      setOpen(false)
      onCreated?.()
    } catch (err) {
      const pbErrors = extractFieldErrors(err)
      if (Object.keys(pbErrors).length > 0) {
        setFieldErrors(pbErrors)
      } else {
        toast({
          title: 'Erro ao cadastrar membro',
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
      <UserPlus className="h-4 w-4 mr-2" /> Cadastrar Novo Membro
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Membro</DialogTitle>
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
              placeholder="email@exemplo.com"
              className={cn(fieldErrors.email && 'border-red-500 focus-visible:ring-red-500')}
            />
            {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              placeholder="Mínimo de 8 caracteres"
              className={cn(fieldErrors.password && 'border-red-500 focus-visible:ring-red-500')}
            />
            {fieldErrors.password && <p className="text-xs text-red-500">{fieldErrors.password}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !form.name.trim() || !form.email.trim() || !form.password}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cadastrar Membro'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
