import { useState, ReactNode } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { inviteUser } from '@/services/user-invite'

interface InviteUserDialogProps {
  onInvited?: () => void
  trigger?: ReactNode
}

export function InviteUserDialog({ onInvited, trigger }: InviteUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'user' as 'admin' | 'user' })
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})
  const { toast } = useToast()

  const update = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: undefined }))
  }

  const handleSubmit = async () => {
    const errs: typeof errors = {}
    if (!form.name.trim()) errs.name = 'O nome é obrigatório.'
    if (!form.email.trim()) errs.email = 'O email é obrigatório.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email inválido.'
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSaving(true)
    try {
      const result = await inviteUser({
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
      })
      toast({
        title: 'Usuário(a) convidado(a) com sucesso!',
        description: `Senha temporária: ${result.tempPassword}`,
      })
      setOpen(false)
      setForm({ name: '', email: '', role: 'user' })
      onInvited?.()
    } catch (err) {
      toast({
        title: 'Erro ao convidar usuário',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <UserPlus className="h-4 w-4 mr-2" /> Convidar Usuário(a)
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar Novo(a) Usuário(a)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Nome completo"
              className={cn(errors.name && 'border-red-500 focus-visible:ring-red-500')}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="email@exemplo.com"
              className={cn(errors.email && 'border-red-500 focus-visible:ring-red-500')}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label>Função</Label>
            <Select value={form.role} onValueChange={(v) => update('role', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuário(a)</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !form.name.trim() || !form.email.trim()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Convidar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
