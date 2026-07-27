import { useState } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getTeamMemberCredentials } from '@/services/team-members'
import type { TeamMember } from '@/types/models'

interface RegeneratePasswordButtonProps {
  member: TeamMember
}

export function RegeneratePasswordButton({ member }: RegeneratePasswordButtonProps) {
  const [loading, setLoading] = useState(false)
  const hasEmail = !!member.email

  const handleRegenerate = async () => {
    if (!hasEmail) {
      toast.error('Não é possível regenerar a senha: membro sem e-mail cadastrado.')
      return
    }
    setLoading(true)
    try {
      const creds = await getTeamMemberCredentials(member.id)
      const loginUrl = `${creds.accessUrl}/login`
      toast.success('Senha regenerada com sucesso!', {
        description: (
          <div className="space-y-1">
            <p>
              <strong>Login:</strong> {creds.email}
            </p>
            <p>
              <strong>Senha:</strong> {creds.tempPassword}
            </p>
            <p>
              <strong>Acesso:</strong> {loginUrl}
            </p>
          </div>
        ),
        duration: 15000,
      })
    } catch {
      toast.error('Erro ao regenerar senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      disabled={!hasEmail || loading}
      onClick={handleRegenerate}
      title={hasEmail ? 'Regenerar Senha' : 'Membro sem e-mail cadastrado'}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
    </Button>
  )
}
