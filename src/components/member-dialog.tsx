import { useState, useEffect, ReactNode } from 'react'
import { UserPlus, Loader2, Pencil, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import {
  createTeamMember,
  updateTeamMember,
  getTeamMemberCredentials,
  type TeamMember,
} from '@/services/team-members'
import { CredentialPanel } from '@/components/credential-panel'

const sectorOptions = ['Meio-Ambiente', 'Desenvolvimento Urbano', 'Administrativo']
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const roleOptions = [
  { value: 'user', label: 'Usuário' },
  { value: 'admin', label: 'Administrador' },
]

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
  const [form, setForm] = useState({
    name: '',
    function: '',
    setor: '',
    email: '',
    role: 'user',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [credentials, setCredentials] = useState<{
    email: string
    tempPassword: string
    accessUrl: string
  } | null>(null)

  useEffect(() => {
    if (open) {
      setCredentials(null)
      setForm({
        name: member?.name || '',
        function: member?.function || '',
        setor: member?.setor || '',
        email: member?.email || '',
        role: member?.role || 'user',
      })
      setAvatarPreview(member?.avatar || '')
      setAvatarFile(null)
      setFieldErrors({})
    }
  }, [open, member])

  const update = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }))
    setFieldErrors((p) => ({ ...p, [field]: '' }))
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async () => {
    const errors: FieldErrors = {}
    if (!form.name.trim()) errors.name = 'O nome é obrigatório.'
    if (!form.function.trim()) errors.function = 'A função é obrigatória.'
    if (!form.setor) errors.setor = 'O setor é obrigatório.'
    if (!form.email.trim()) errors.email = 'O email é obrigatório.'
    else if (!emailRegex.test(form.email.trim())) errors.email = 'Informe um email válido.'
    if (!form.role) errors.role = 'O tipo de usuário é obrigatório.'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setSaving(true)
    setFieldErrors({})
    try {
      const payload = {
        name: form.name.trim(),
        function: form.function.trim(),
        setor: form.setor,
        email: form.email.trim(),
        role: form.role,
        avatar: avatarFile,
      }
      if (isEdit && member) {
        await updateTeamMember(member.id, payload)
        toast({ title: 'Usuário CEDRO atualizado com sucesso!' })
        setOpen(false)
      } else {
        const result = await createTeamMember(payload)
        try {
          const creds = await getTeamMemberCredentials(result.id)
          setCredentials({
            email: result.email,
            tempPassword: creds.tempPassword,
            accessUrl: creds.accessUrl,
          })
        } catch {
          toast({
            title: 'Usuário CEDRO cadastrado, mas houve erro ao gerar credenciais',
            description: 'O Usuário CEDRO foi criado, mas as credenciais não puderam ser obtidas.',
            variant: 'destructive',
          })
          setOpen(false)
        }
      }
      onCreated?.()
    } catch (err) {
      const pbErrors = extractFieldErrors(err)
      if (Object.keys(pbErrors).length > 0) {
        setFieldErrors(pbErrors)
      } else {
        toast({
          title: isEdit ? 'Erro ao atualizar Usuário CEDRO' : 'Erro ao cadastrar Usuário CEDRO',
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
    emailRegex.test(form.email.trim()) &&
    form.role

  const defaultTrigger = isEdit ? (
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  ) : (
    <Button size="sm">
      <UserPlus className="h-4 w-4 mr-2" /> Cadastrar Novo Usuário CEDRO
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {credentials
              ? 'Credenciais do Novo Usuário CEDRO'
              : isEdit
                ? 'Editar Usuário CEDRO'
                : 'Cadastrar Novo Usuário CEDRO'}
          </DialogTitle>
        </DialogHeader>
        {credentials ? (
          <CredentialPanel
            email={credentials.email}
            tempPassword={credentials.tempPassword}
            accessUrl={credentials.accessUrl}
            onClose={() => {
              setCredentials(null)
              setOpen(false)
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-20 w-20 border-2 border-slate-200">
                <AvatarImage src={avatarPreview} alt="Avatar" />
                <AvatarFallback className="bg-slate-100 text-slate-400 text-2xl">
                  {form.name?.charAt(0).toUpperCase() || <Upload className="h-6 w-6" />}
                </AvatarFallback>
              </Avatar>
              <Label
                htmlFor="avatar-upload"
                className="cursor-pointer text-sm text-primary hover:underline"
              >
                {avatarPreview ? 'Alterar foto' : 'Adicionar foto'}
              </Label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
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
              {fieldErrors.function && (
                <p className="text-xs text-red-500">{fieldErrors.function}</p>
              )}
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
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Select value={form.role} onValueChange={(v) => update('role', v)}>
                <SelectTrigger
                  className={cn(fieldErrors.role && 'border-red-500 focus-visible:ring-red-500')}
                >
                  <SelectValue placeholder="Selecione o tipo de usuário" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.role && <p className="text-xs text-red-500">{fieldErrors.role}</p>}
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
                  'Cadastrar Usuário CEDRO'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
