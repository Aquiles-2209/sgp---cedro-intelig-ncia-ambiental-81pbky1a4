import { useState } from 'react'
import { KeyRound, Loader2, Copy, Check, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getTeamMemberCredentials } from '@/services/team-members'
import type { TeamMember } from '@/types/models'
import { useAuth } from '@/hooks/use-auth'

interface RegeneratePasswordButtonProps {
  member: TeamMember
}

export function RegeneratePasswordButton({ member }: RegeneratePasswordButtonProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'master'
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [copiedPass, setCopiedPass] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [credentials, setCredentials] = useState<{
    email: string
    tempPassword: string
    loginUrl: string
  } | null>(null)

  const hasEmail = !!member.email

  if (!isAdmin) return null

  const handleRegenerate = async () => {
    if (!hasEmail) {
      toast.error('Não é possível regenerar a senha: membro sem e-mail cadastrado.')
      return
    }
    setLoading(true)
    try {
      const creds = await getTeamMemberCredentials(member.id)
      const loginUrl = 'https://gestao-de-projetos-e-equipes-1aaac.goskip.app/login'
      const data = {
        email: creds.email || member.email,
        tempPassword: creds.tempPassword,
        loginUrl,
      }
      setCredentials(data)
      setOpen(true)

      toast.success(`Senha regenerada para ${member.name}!`, {
        description: `E-mail: ${data.email} | Senha: ${data.tempPassword}`,
        duration: 10000,
      })
    } catch {
      toast.error('Erro ao regenerar senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, type: 'pass' | 'url') => {
    navigator.clipboard.writeText(text)
    if (type === 'pass') {
      setCopiedPass(true)
      setTimeout(() => setCopiedPass(false), 2000)
    } else {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    }
    toast.success('Copiado para a área de transferência!')
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50"
        disabled={!hasEmail || loading}
        onClick={handleRegenerate}
        title={hasEmail ? 'Regenerar Senha' : 'Membro sem e-mail cadastrado'}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <KeyRound className="h-5 w-5 text-amber-500" />
              Credenciais Geradas
            </DialogTitle>
            <DialogDescription>
              A senha temporária para <strong>{member.name}</strong> foi gerada com sucesso.
            </DialogDescription>
          </DialogHeader>

          {credentials && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500">E-mail do Usuário</Label>
                <Input value={credentials.email} readOnly className="bg-slate-50 font-medium" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500">
                  Nova Senha Temporária
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={credentials.tempPassword}
                    readOnly
                    className="bg-amber-50 font-mono font-bold text-amber-900 border-amber-200"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(credentials.tempPassword, 'pass')}
                  >
                    {copiedPass ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500">
                  Link de Acesso (Login)
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={credentials.loginUrl}
                    readOnly
                    className="bg-slate-50 text-xs text-slate-600"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(credentials.loginUrl, 'url')}
                  >
                    {copiedUrl ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button type="button" variant="outline" size="icon" asChild>
                    <a href={credentials.loginUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-end">
            <Button onClick={() => setOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
