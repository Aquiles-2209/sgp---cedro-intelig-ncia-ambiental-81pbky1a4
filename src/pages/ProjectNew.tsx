import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save } from 'lucide-react'
import { useAppState } from '@/hooks/use-app-state'
import { Project, ProjectStatus } from '@/types/models'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'

const projectSchema = z.object({
  name: z.string().min(3, 'Nome muito curto'),
  contractId: z.string().min(1, 'Obrigatório'),
  client: z.string().min(1, 'Obrigatório'),
  startDate: z.string().min(1, 'Data inicial obrigatória'),
  endDate: z.string().min(1, 'Data final obrigatória'),
  status: z.enum(['Em Andamento', 'Planejado', 'Concluído']),
  description: z.string(),
})

type ProjectFormValues = z.infer<typeof projectSchema>

export default function ProjectNew() {
  const navigate = useNavigate()
  const { teams, addProject } = useAppState()
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { status: 'Planejado' },
  })

  const toggleTeam = (id: string) => {
    setSelectedTeams((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  const onSubmit = (data: ProjectFormValues) => {
    const newProject: Project = {
      ...data,
      id: `p-${Date.now()}`,
      teamIds: selectedTeams,
      projectTeams: [],
    }
    addProject(newProject)
    navigate('/projetos')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Novo Projeto</h1>
          <p className="text-slate-500 text-sm">
            Cadastre os detalhes do contrato e aloque as equipes.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <h3 className="font-semibold text-lg text-slate-800 border-b border-slate-100 pb-2">
              Detalhes Básicos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Nome do Projeto</Label>
                <Input {...register('name')} placeholder="Ex: App de Logística" />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input {...register('client')} placeholder="Nome da empresa cliente" />
                {errors.client && <p className="text-xs text-red-500">{errors.client.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Número do Contrato</Label>
                <Input {...register('contractId')} placeholder="Ex: CTR-001" />
                {errors.contractId && (
                  <p className="text-xs text-red-500">{errors.contractId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  {...register('status')}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="Planejado">Planejado</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Concluído">Concluído</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Input type="date" {...register('startDate')} />
                {errors.startDate && (
                  <p className="text-xs text-red-500">{errors.startDate.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Data de Término Estimada</Label>
                <Input type="date" {...register('endDate')} />
                {errors.endDate && <p className="text-xs text-red-500">{errors.endDate.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição e Objetivos</Label>
              <Textarea
                {...register('description')}
                rows={4}
                placeholder="Descreva brevemente o escopo do projeto..."
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg text-slate-800 border-b border-slate-100 pb-2 mb-4">
              Alocação de Equipes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className={`flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                    selectedTeams.includes(team.id)
                      ? 'border-primary bg-blue-50/50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                  onClick={() => toggleTeam(team.id)}
                >
                  <Checkbox
                    checked={selectedTeams.includes(team.id)}
                    id={team.id}
                    onCheckedChange={() => toggleTeam(team.id)}
                  />
                  <div className="space-y-1 leading-none pt-0.5">
                    <Label htmlFor={team.id} className="cursor-pointer font-medium text-slate-900">
                      {team.name}
                    </Label>
                    <p className="text-xs text-slate-500">
                      {team.members.length} membros disponíveis
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit">
            <Save className="w-4 h-4 mr-2" /> Salvar Projeto
          </Button>
        </div>
      </form>
    </div>
  )
}
