import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CredentialPanelProps {
  email: string
  tempPassword: string
  accessUrl: string
  onClose: () => void
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-sm" />
        <Button size="icon" variant="outline" onClick={handleCopy} className="shrink-0">
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

export function CredentialPanel({ email, tempPassword, accessUrl, onClose }: CredentialPanelProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
        Usuário CEDRO cadastrado com sucesso! Compartilhe as credenciais abaixo com o novo Usuário
        CEDRO.
      </div>
      <CopyField label="Login" value={email} />
      <CopyField label="Senha Temporária" value={tempPassword} />
      <CopyField label="Link de Acesso" value={accessUrl} />
      <Button className="w-full" onClick={onClose}>
        Fechar
      </Button>
    </div>
  )
}
