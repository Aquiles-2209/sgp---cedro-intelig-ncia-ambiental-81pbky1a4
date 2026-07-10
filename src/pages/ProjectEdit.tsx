import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { useAppState } from '@/hooks/use-app-state'
import { Project, ProjectTeam, ProjectMember, ProjectStatus } from '@/types/models'
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
import { DatePicker } from '@/components/date-picker'
import { ProjectTimeline } from '@/components/project-timeline'
import { ProjectTeamManager } from '@/components/project-team-manager'

const statusOptions: ProjectStatus[] = ['Planejado', 'Em Andamento', 'Concluído']

export default function ProjectEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { projects, updateProject } = useAppState()

  const existingProject = projects.find((p) => p.id === id)

  const [formData, setFormData] = useState({
    name: existingProject?.name || '',
    contractId: existingProject?.contractId || '',
    client: existingProject?.client || '',
    startDate: existingProject?.startDate || '',
    endDate: existingProject?.endDate || '',
    status: existingProject?.status || ('Planejado' as ProjectStatus),
    description: existingProject?.description || '',
  })

  const [projectTeams, setProjectTeams] = useState<ProjectTeam[]>(
    existingProject?.projectTeams || [],
  )

  if (!existingProject) {
    return <div className="p-8 text-center">Projeto não encontrado.</div>
  }

  const updateField = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }))

  const addTeam = () =>
    setProjectTeams((prev) => [...prev, { id: `pt-${Date.now()}`, name: '', members: [] }])

  const updateTeamName = (teamId: string, name: string) =>
    setProjectTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, name } : t)))

  const removeTeam = (teamId: string) =>
    setProjectTeams((prev) => prev.filter((t) => t.id !== teamId))

  const addMember = (teamId: string) => {
    const newMember: ProjectMember = {
      id: `pm-${Date.now()}`,
      name: '',
      role: '',
      startDate: formData.startDate,
      endDate: formData.endDate,
    }
    setProjectTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, members: [...t.members, newMember] } : t)),
    )
  }

  const updateMember = (
    teamId: string,
    memberId: string,
    field: keyof ProjectMember,
    value: string,
  ) =>
    setProjectTeams((prev) =>
      prev.map((t) =>
        t.id === teamId
          ? {
              ...t,
              members: t.members.map((m) => (m.id === memberId ? { ...m, [field]: value } : m)),
            }
          : t,
      ),
    )

  const removeMember = (teamId: string, memberId: string) =>
    setProjectTeams((prev) =>
      prev.map((t) =>
        t.id === teamId ? { ...t, members: t.members.filter((m) => m.id !== memberId) } : t,
      ),
    )

  const handleSave = () => {
    updateProject({ ...existingProject, ...formData, projectTeams })
    navigate(`/projetos/${id}`)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Editar Projeto</h1>
          <p className="text-slate-500 text-sm">
            Modifique detalhes e gerencie alocações de equipe.
          </p>
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
              <Input value={formData.name} onChange={(e) => updateField('name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input
                value={formData.client}
                onChange={(e) => updateField('client', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Número do Contrato</Label>
              <Input
                value={formData.contractId}
                onChange={(e) => updateField('contractId', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => updateField('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <DatePicker
                value={formData.startDate}
                onChange={(v) => updateField('startDate', v)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Término</Label>
              <DatePicker value={formData.endDate} onChange={(v) => updateField('endDate', v)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição e Objetivos</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <ProjectTeamManager
            teams={projectTeams}
            onAddTeam={addTeam}
            onUpdateTeamName={updateTeamName}
            onRemoveTeam={removeTeam}
            onAddMember={addMember}
            onUpdateMember={updateMember}
            onRemoveMember={removeMember}
          />
        </CardContent>
      </Card>

      {projectTeams.some((t) => t.members.length > 0) && (
        <ProjectTimeline
          teams={projectTeams}
          projectStart={formData.startDate}
          projectEnd={formData.endDate}
        />
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" /> Salvar Alterações
        </Button>
      </div>
    </div>
  )
}
