import { Link } from 'react-router-dom'
import { Briefcase, Activity, Users, AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react'
import { useAppState } from '@/hooks/use-app-state'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { getProgress, isDeadlineSoon, normalizeDate } from '@/types/models'

export default function Dashboard() {
  const { projects, allocations } = useAppState()

  const activeProjects = projects.filter((p) => p.status === 'Em Andamento')
  const completedProjects = projects.filter((p) => p.status === 'Concluído')
  const upcomingDeadlines = allocations.filter((a) => isDeadlineSoon(a.end_date))

  const metrics = [
    {
      title: 'Total de Projetos',
      value: projects.length,
      icon: Briefcase,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      title: 'Projetos Ativos',
      value: activeProjects.length,
      icon: Activity,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
    },
    {
      title: 'Pessoas Alocadas',
      value: new Set(allocations.map((a) => a.member_name)).size,
      icon: Users,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
    },
    {
      title: 'Prazos Próximos',
      value: upcomingDeadlines.length,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-100',
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Visão geral das suas operações e equipes.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m, i) => (
          <Card
            key={i}
            className="border-slate-200 shadow-sm hover:shadow-md transition-shadow group"
          >
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">{m.title}</p>
                <p className="text-3xl font-bold text-slate-900">{m.value}</p>
              </div>
              <div
                className={`h-12 w-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${m.bg} ${m.color}`}
              >
                <m.icon className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4 border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-xl">Projetos em Andamento</CardTitle>
              <CardDescription>Acompanhe o progresso das entregas ativas.</CardDescription>
            </div>
            <Link
              to="/projetos"
              className="text-sm font-medium text-primary hover:underline flex items-center"
            >
              Ver todos <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-6">
            {activeProjects.map((project) => {
              const progress = getProgress(project.start_date, project.end_date)
              const projAllocs = allocations.filter((a) => a.project === project.id)
              return (
                <div
                  key={project.id}
                  className="flex flex-col gap-3 group relative p-4 -mx-4 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-900 line-clamp-1">
                        <Link
                          to={`/projetos/${project.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {project.name}
                        </Link>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {project.contract_id} • {project.client}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                      {progress}%
                    </Badge>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-600">
                      {projAllocs.length} Usuários CEDRO alocados
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Prazo:{' '}
                      {new Date(normalizeDate(project.end_date) + 'T00:00:00').toLocaleDateString(
                        'pt-BR',
                      )}
                    </span>
                  </div>
                </div>
              )
            })}
            {activeProjects.length === 0 && (
              <div className="text-center py-8 text-slate-500">Nenhum projeto em andamento.</div>
            )}
          </CardContent>
        </Card>
        <Card className="md:col-span-3 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Alertas de Prazo</CardTitle>
            <CardDescription>Usuários CEDRO com prazo próximo (7 dias).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingDeadlines.map((a) => {
              const project = projects.find((p) => p.id === a.project)
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-red-50 border border-red-100"
                >
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-semibold text-slate-900 truncate">{a.member_name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {project?.name} • {a.function}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-red-600">
                    {new Date(normalizeDate(a.end_date) + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )
            })}
            {upcomingDeadlines.length === 0 && (
              <div className="space-y-3">
                <div className="text-center py-4 text-slate-500 text-sm">Nenhum prazo próximo.</div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-3">
                    Últimos Concluídos
                  </p>
                  {completedProjects.slice(0, 3).map((project) => (
                    <div key={project.id} className="flex items-center gap-3 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {project.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{project.client}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
