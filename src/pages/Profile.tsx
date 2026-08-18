import { useState } from 'react'
import { UserCircle, Loader2, Mail, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { ChangePasswordDialog } from '@/components/change-password-dialog'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import pb from '@/lib/pocketbase/client'

export default function Profile() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)

  const roleLabel =
    user?.role === 'master'
      ? 'Master'
      : user?.role === 'admin'
        ? 'Administrador'
        : 'Usuário(a) CEDRO'

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      const updated = await pb.collection('users').update(user.id, { name })
      pb.authStore.save(updated.token, updated)
      toast({ title: 'Alterações salvas com sucesso!' })
    } catch (err) {
      toast({
        title: 'Erro ao salvar alterações',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <UserCircle className="h-8 w-8 text-primary" /> Meu Perfil
        </h1>
        <p className="text-slate-500 mt-1">Visualize e atualize seus dados pessoais.</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-slate-500" /> Meus Dados
          </CardTitle>
          <CardDescription>Atualize suas informações de perfil.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border border-slate-200">
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback className="bg-primary text-white text-xl">
                {user?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <Badge variant="outline" className="text-xs">
                <Shield className="h-3 w-3 mr-1" /> {roleLabel}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-700 font-medium">
              Nome
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 bg-white border-slate-200"
              placeholder="Seu nome"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-700 font-medium">
              E-mail corporativo
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                readOnly
                tabIndex={-1}
                className="h-11 bg-slate-100 text-slate-600 cursor-not-allowed font-medium pl-9 border-slate-200"
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving || name.trim() === (user?.name || '')}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar Alterações
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-slate-500" /> Alterar Senha
          </CardTitle>
          <CardDescription>Mantenha sua conta segura atualizando sua senha.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordDialog trigger={<Button variant="outline">Alterar Senha</Button>} />
        </CardContent>
      </Card>
    </div>
  )
}
