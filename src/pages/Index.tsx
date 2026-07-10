import { Link } from 'react-router-dom'
import { Briefcase, Users, FileText, CheckCircle2, ChevronRight, Activity } from 'lucide-react'
import { useAppState } from '@/hooks/use-app-state'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'

function getProgress(start: string, end: string) {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  const now = new Date().getTime()
  if (now < s) return 0
  if (now > e) return 100
  return Math.round(((now - s) / (e - s)) * 100)
}

export default function Dashboard() {
  const { projects, teams } = useAppState()

  const activeProjects = projects.filter((p) => p.status === 'Em Andamento')
  const activeTeams = new Set(activeProjects.flatMap((p) => p.teamIds)).size
  const totalMembers = teams.reduce((acc, team) => acc + team.members.length, 0)
  const completedProjects = projects.filter((p) => p.status === 'Concluído')

  const metrics = [
    {
      title: 'Total de Projetos',
      value: projects.length,
      icon: Briefcase,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      title: 'Contratos Ativos',
      value: activeProjects.length,
      icon: Activity,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
    },
    {
      title: 'Equipes Alocadas',
      value: activeTeams,
      icon: Users,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
    },
    {
      title: 'Membros da Equipe',
      value: totalMembers,
      icon: FileText,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
  ]

  return (
    <div className="space-y-8 animate-stagger-1">
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
              const progress = getProgress(project.startDate, project.endDate)
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
                        {project.contractId} • {project.client}
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
                    <div className="flex -space-x-2 overflow-hidden">
                      {project.teamIds.map((tid) => {
                        const team = teams.find((t) => t.id === tid)
                        return team?.members.slice(0, 3).map((m) => (
                          <Avatar key={m.id} className="h-7 w-7 border-2 border-white inline-block">
                            <AvatarImage src={m.avatar} alt={m.name} />
                            <AvatarFallback className="text-[10px]">
                              {m.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ))
                      })}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      Prazo: {new Date(project.endDate).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              )
            })}
            {activeProjects.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                Nenhum projeto em andamento no momento.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Últimos Concluídos</CardTitle>
            <CardDescription>Projetos finalizados recentemente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {completedProjects.slice(0, 4).map((project) => (
              <div key={project.id} className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h4 className="text-sm font-semibold text-slate-900 truncate">{project.name}</h4>
                  <p className="text-xs text-slate-500 truncate">{project.client}</p>
                </div>
              </div>
            ))}
            {completedProjects.length === 0 && (
              <div className="text-center py-6 text-slate-500 text-sm">
                Nenhum projeto concluído ainda.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
