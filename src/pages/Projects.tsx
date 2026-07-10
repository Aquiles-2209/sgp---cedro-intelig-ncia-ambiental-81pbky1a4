import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Calendar, Users2 } from 'lucide-react'
import { useAppState } from '@/hooks/use-app-state'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProjectStatus } from '@/types/models'

const statusColors: Record<ProjectStatus, string> = {
  'Em Andamento': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Concluído: 'bg-slate-100 text-slate-700 border-slate-200',
  Planejado: 'bg-blue-50 text-blue-700 border-blue-200',
}

export default function Projects() {
  const { projects, teams } = useAppState()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.contractId.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'todos' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Projetos</h1>
          <p className="text-slate-500 mt-1">Gerencie todos os contratos e alocações.</p>
        </div>
        <Button asChild className="shrink-0">
          <Link to="/projetos/novo">
            <Plus className="h-4 w-4 mr-2" /> Novo Projeto
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome ou contrato..."
            className="pl-9 h-10 bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="todos">Todos os Status</option>
          <option value="Em Andamento">Em Andamento</option>
          <option value="Planejado">Planejado</option>
          <option value="Concluído">Concluído</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filteredProjects.map((project) => {
          // Flatten all team members for this project
          const projectMembers = project.teamIds
            .flatMap((tid) => teams.find((t) => t.id === tid)?.members || [])
            .slice(0, 5) // display up to 5

          return (
            <Card
              key={project.id}
              className="hover:shadow-md transition-all duration-300 hover:-translate-y-1 group"
            >
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className={statusColors[project.status]}>
                    {project.status}
                  </Badge>
                  <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded">
                    {project.contractId}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-lg text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">
                    <Link to={`/projetos/${project.id}`}>{project.name}</Link>
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">{project.client}</p>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center text-sm text-slate-500">
                    <Calendar className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
                    <span>
                      {new Date(project.startDate).toLocaleDateString('pt-BR')} até{' '}
                      {new Date(project.endDate).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center">
                      <Users2 className="mr-2 h-4 w-4 text-slate-400" />
                      <div className="flex -space-x-2">
                        {projectMembers.map((m, i) => (
                          <Avatar key={i} className="h-6 w-6 border-2 border-white">
                            <AvatarImage src={m.avatar} />
                            <AvatarFallback className="text-[9px]">
                              {m.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    </div>
                    {project.teamIds.length > 0 && (
                      <span className="text-xs text-slate-400 font-medium">
                        {project.teamIds.length} Equipe(s)
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {filteredProjects.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
            <Briefcase className="h-10 w-10 text-slate-300 mb-3" />
            <p>Nenhum projeto encontrado com os filtros atuais.</p>
          </div>
        )}
      </div>
    </div>
  )
}
