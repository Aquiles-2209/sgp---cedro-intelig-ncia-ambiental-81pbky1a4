import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { useAppState } from '@/hooks/use-app-state'
import { useToast } from '@/hooks/use-toast'
import { ProjectStatus, ProjectSetor } from '@/types/models'
import { getUsers, SimpleUser } from '@/services/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function ProjectNew() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { addProject } = useAppState()
  const [saving, setSaving] = useState(false)
  const [adminUsers, setAdminUsers] = useState<SimpleUser[]>([])
  const [form, setForm] = useState({
    name: '',
    description: '',
    contract_id: '',
    client: '',
    start_date: '',
    end_date: '',
    status: 'Planejado' as ProjectStatus,
    setor: 'Infraestrutura' as ProjectSetor,
    project_manager: '',
  })

  useEffect(() => {
    getUsers()
      .then((users) => setAdminUsers(users.filter((u) => u.role === 'admin')))
      .catch(() => {})
  }, [])

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      const { project_manager, ...rest } = form
      const payload = {
        ...rest,
        ...(project_manager ? { project_manager } : {}),
      }
      const project = await addProject(payload)
      navigate(`/projetos/${project.id}/editar`)
    } catch (err) {
      setSaving(false)
      toast({
        title: 'Erro ao salvar projeto',
        description: 'Verifique suas permissões.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Novo Projeto</h1>
          <p className="text-slate-500 text-sm">Cadastre os detalhes do contrato.</p>
        </div>
      </div>
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 space-y-6">
          <h3 className="font-semibold text-lg text-slate-800 border-b border-slate-100 pb-2">
            Detalhes Básicos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Nome do Projeto</Label>
              <Input
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Ex: App de Logística"
              />
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input
                value={form.client}
                onChange={(e) => update('client', e.target.value)}
                placeholder="Nome da empresa"
              />
            </div>
            <div className="space-y-2">
              <Label>Número do Contrato</Label>
              <Input
                value={form.contract_id}
                onChange={(e) => update('contract_id', e.target.value)}
                placeholder="Ex: CTR-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(val) => update('status', val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Planejado">Planejado</SelectItem>
                  <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select value={form.setor} onValueChange={(val) => update('setor', val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mineração">Mineração</SelectItem>
                  <SelectItem value="Geração de Energia">Geração de Energia</SelectItem>
                  <SelectItem value="Infraestrutura">Infraestrutura</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => update('start_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Término</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => update('end_date', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição e Objetivos</Label>
            <Textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={4}
              placeholder="Descreva o escopo..."
            />
          </div>
          <div className="space-y-2">
            <Label>Gerente do Projeto</Label>
            <Select
              value={form.project_manager || '__none__'}
              onValueChange={(val) => update('project_manager', val === '__none__' ? '' : val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um Admin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhum —</SelectItem>
                {adminUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          <Save className="w-4 h-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar Projeto'}
        </Button>
      </div>
    </div>
  )
}
