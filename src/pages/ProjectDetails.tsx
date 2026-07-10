import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Calendar, FileText, Briefcase, UserCheck, Clock } from 'lucide-react'
import { useAppState } from '@/hooks/use-app-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const statusColors: Record<string, string> = {
  'Em Andamento': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Concluído: 'bg-slate-100 text-slate-700 border-slate-200',
  Planejado: 'bg-blue-50 text-blue-700 border-blue-200',
}

export default function ProjectDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { projects } = useAppState()

  const project = projects.find((p) => p.id === id)

  if (!project) {
    return <div className="p-8 text-center">Projeto não encontrado.</div>
  }

  const hasProjectTeams = project.projectTeams && project.projectTeams.length > 0

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in-up">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/projetos')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{project.name}</h1>
              <Badge variant="outline" className={statusColors[project.status]}>
                {project.status}
              </Badge>
            </div>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> {project.client} • {project.contractId}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="bg-white"
          onClick={() => navigate(`/projetos/${id}/editar`)}
        >
          <Edit className="h-4 w-4 mr-2" /> Editar Projeto
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-slate-800">
                <FileText className="h-5 w-5 text-slate-400" /> Detalhes e Escopo
              </h3>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {project.description || 'Nenhuma descrição fornecida.'}
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Data de Início
                  </p>
                  <p className="font-medium text-slate-900 mt-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {new Date(project.startDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Previsão de Término
                  </p>
                  <p className="font-medium text-slate-900 mt-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {new Date(project.endDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-slate-800">
                <UserCheck className="h-5 w-5 text-slate-400" /> Equipes Alocadas
              </h3>
              {hasProjectTeams ? (
                <div className="space-y-3">
                  {project.projectTeams.map((team) => (
                    <div
                      key={team.id}
                      className="px-3 py-2 bg-slate-50 rounded-md border border-slate-100"
                    >
                      <p className="font-medium text-slate-900 text-sm">{team.name}</p>
                      <p className="text-xs text-slate-500">{team.members.length} membro(s)</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Nenhuma equipe alocada.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {hasProjectTeams && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-slate-800">
              <Clock className="h-5 w-5 text-slate-400" /> Alocação de Membros e Períodos
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipe</TableHead>
                  <TableHead>Membro</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Término</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.projectTeams.map((team) =>
                  team.members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium text-slate-900">{team.name}</TableCell>
                      <TableCell className="text-slate-700">{member.name}</TableCell>
                      <TableCell className="text-slate-600">{member.role}</TableCell>
                      <TableCell className="text-slate-600">
                        {new Date(member.startDate).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {new Date(member.endDate).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  )),
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
