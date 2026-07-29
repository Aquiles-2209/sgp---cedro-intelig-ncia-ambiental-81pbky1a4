import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Calendar, Users2, Briefcase, Pencil, Download, Loader2 } from 'lucide-react'
import { useAppState } from '@/hooks/use-app-state'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ProjectStatus,
  normalizeDate,
  filterAllocationsByProject,
  getUniqueAllocatedCount,
} from '@/types/models'
import { exportProjectReport } from '@/lib/export-report'

const statusColors: Record<ProjectStatus, string> = {
  'Em Andamento': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Concluído: 'bg-slate-100 text-slate-700 border-slate-200',
  Planejado: 'bg-blue-50 text-blue-700 border-blue-200',
}

export default function Projects() {
  const { projects, allocations, tasks, taskAssignments, loading } = useAppState()
  const { user, loading: authLoading } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')

  const visibleProjects = isAdmin
    ? projects
    : projects.filter((p) =>
        allocations.some((a) => {
          const allocUser =
            typeof a.user === 'string' ? a.user : (a as any)?.user?.id || a.expand?.user?.id
          return allocUser === user?.id && filterAllocationsByProject(allocations, p.id).length > 0
        }),
      )

  const filtered = visibleProjects.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.contract_id.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'todos' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  if (loading || authLoading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
        <div className="flex gap-4 mb-6">
          <div className="h-10 flex-1 max-w-md bg-slate-100 rounded animate-pulse" />
          <div className="h-10 w-40 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {isAdmin ? 'Projetos' : 'Meus Projetos'}
          </h1>
          <p className="text-slate-500 mt-1">
            {isAdmin
              ? 'Gerencie todos os contratos e alocações.'
              : 'Visualize os projetos nos quais você está alocado.'}
          </p>
        </div>
        {isAdmin && (
          <Button asChild className="shrink-0">
            <Link to="/projetos/novo">
              <Plus className="h-4 w-4 mr-2" /> Novo Projeto
            </Link>
          </Button>
        )}
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
          className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
        {filtered.map((project) => {
          const projAllocs = filterAllocationsByProject(allocations, project.id)
          const projTasks = tasks.filter((t) => {
            const pId =
              typeof t.project === 'string'
                ? t.project
                : (t.project as any)?.id || t.expand?.project?.id
            return pId === project.id
          })
          const projAssignments = (taskAssignments || []).filter((ta) => {
            const taskObj = ta.expand?.task
            const pId =
              typeof taskObj?.project === 'string' ? taskObj.project : taskObj?.project?.id
            return pId === project.id || projTasks.some((t) => t.id === ta.task)
          })
          const allocCount = getUniqueAllocatedCount(projAllocs, projTasks, projAssignments)
          const handleExport = () => exportProjectReport(project, projAllocs, projTasks)
          const isUserAllocated = projAllocs.some((a) => {
            const allocUser =
              typeof a.user === 'string' ? a.user : (a as any)?.user?.id || a.expand?.user?.id
            return allocUser === user?.id
          })
          return (
            <Card
              key={project.id}
              className={cn(
                'hover:shadow-md transition-all duration-300 hover:-translate-y-1 group',
                !isAdmin && isUserAllocated && 'bg-blue-200',
              )}
            >
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className={statusColors[project.status]}>
                    {project.status}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded">
                      {project.contract_id}
                    </span>
                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={handleExport}
                          title="Exportar relatório"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                          <Link to={`/projetos/${project.id}/editar`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <h3
                    className={cn(
                      'font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors',
                      !isAdmin && isUserAllocated ? 'text-green-800' : 'text-slate-900',
                    )}
                  >
                    <Link to={`/projetos/${project.id}`}>{project.name}</Link>
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">{project.client}</p>
                </div>
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center text-sm text-slate-500">
                    <Calendar className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
                    <span>
                      {new Date(normalizeDate(project.start_date) + 'T00:00:00').toLocaleDateString(
                        'pt-BR',
                      )}{' '}
                      até{' '}
                      {new Date(normalizeDate(project.end_date) + 'T00:00:00').toLocaleDateString(
                        'pt-BR',
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center">
                      <Users2 className="mr-2 h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600">{allocCount} Usuário(s) CEDRO</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
            <Briefcase className="h-10 w-10 text-slate-300 mb-3" />
            <p>Nenhum projeto cadastrado.</p>
          </div>
        )}
      </div>
    </div>
  )
}
