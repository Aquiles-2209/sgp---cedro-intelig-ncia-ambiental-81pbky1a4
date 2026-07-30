import { useState, ReactNode } from 'react'
import { Loader2, Eye, EyeOff, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { cn } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'

interface ChangePasswordDialogProps {
  trigger?: ReactNode
}

export function ChangePasswordDialog({ trigger }: ChangePasswordDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})
  const [show, setShow] = useState({ current: false, next: false, confirm: false })

  const update = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: undefined }))
  }

  const toggleShow = (field: string) => {
    setShow((p) => ({ ...p, [field]: !p[field] }))
  }

  const reset = () => {
    setForm({ current: '', next: '', confirm: '' })
    setErrors({})
    setShow({ current: false, next: false, confirm: false })
  }

  const validate = () => {
    const errs: typeof errors = {}
    if (!form.current) errs.current = 'A senha atual é obrigatória.'
    if (!form.next) errs.next = 'A nova senha é obrigatória.'
    else if (form.next.length < 8) errs.next = 'A senha deve ter no mínimo 8 caracteres.'
    if (!form.confirm) errs.confirm = 'A confirmação é obrigatória.'
    else if (form.next !== form.confirm) errs.confirm = 'As senhas não coincidem.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!user) return
    if (!validate()) return

    setSaving(true)
    try {
      await pb.collection('users').authWithPassword(user.email, form.current)

      await pb.collection('users').update(user.id, {
        password: form.next,
        passwordConfirm: form.confirm,
      })

      toast({ title: 'Senha alterada com sucesso!' })
      setOpen(false)
      reset()
    } catch (err) {
      const msg = getErrorMessage(err)
      const lowerMsg = msg.toLowerCase()
      const isCurrentWrong =
        lowerMsg.includes('invalid login') ||
        lowerMsg.includes('incorrect') ||
        lowerMsg.includes('credentials') ||
        lowerMsg.includes('senha atual')
      const isBlankError = lowerMsg.includes('cannot be blank')
      toast({
        title: isCurrentWrong
          ? 'Senha atual incorreta'
          : isBlankError
            ? 'Erro de validação'
            : 'Erro ao alterar senha',
        description: isCurrentWrong
          ? 'A senha atual informada está incorreta.'
          : isBlankError
            ? 'Verifique se todos os campos foram preenchidos corretamente.'
            : msg || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <KeyRound className="h-4 w-4 mr-2" /> Editar Cadastro
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" /> Alterar Senha
          </DialogTitle>
          <DialogDescription>
            Atualize sua senha de acesso. Todos os campos são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-pwd">Senha Atual</Label>
            <div className="relative">
              <Input
                id="current-pwd"
                type={show.current ? 'text' : 'password'}
                value={form.current}
                onChange={(e) => update('current', e.target.value)}
                placeholder="••••••••"
                className={cn(
                  'pr-10',
                  errors.current && 'border-red-500 focus-visible:ring-red-500',
                )}
              />
              <button
                type="button"
                onClick={() => toggleShow('current')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {show.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.current && <p className="text-xs text-red-500">{errors.current}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="next-pwd">Nova Senha</Label>
            <div className="relative">
              <Input
                id="next-pwd"
                type={show.next ? 'text' : 'password'}
                value={form.next}
                onChange={(e) => update('next', e.target.value)}
                placeholder="••••••••"
                className={cn('pr-10', errors.next && 'border-red-500 focus-visible:ring-red-500')}
              />
              <button
                type="button"
                onClick={() => toggleShow('next')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {show.next ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.next && <p className="text-xs text-red-500">{errors.next}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-pwd">Confirme Nova Senha</Label>
            <div className="relative">
              <Input
                id="confirm-pwd"
                type={show.confirm ? 'text' : 'password'}
                value={form.confirm}
                onChange={(e) => update('confirm', e.target.value)}
                placeholder="••••••••"
                className={cn(
                  'pr-10',
                  errors.confirm && 'border-red-500 focus-visible:ring-red-500',
                )}
              />
              <button
                type="button"
                onClick={() => toggleShow('confirm')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {show.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirm && <p className="text-xs text-red-500">{errors.confirm}</p>}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
