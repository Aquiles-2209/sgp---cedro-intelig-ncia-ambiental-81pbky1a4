import { Link } from 'react-router-dom'
import {
  Briefcase,
  Activity,
  Users,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  FileCheck,
  ShieldAlert,
} from 'lucide-react'
import { useAppState } from '@/hooks/use-app-state'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { getProgress, isDeadlineSoon, normalizeDate, safeFormatDate } from '@/types/models'
import { calculateLicenseStatus } from '@/lib/environmental-licenses'

export default function Dashboard() {
  const { projects, allocations, environmentalLicenses } = useAppState()
  const { user } = useAuth()
  const canViewLicenseAlerts = user?.role === 'master' || user?.role === 'admin'

  const activeProjects = projects.filter((p) => p.status === 'Em Andamento')
  const completedProjects = projects.filter((p) => p.status === 'Concluído')
  const upcomingDeadlines = allocations.filter((a) => isDeadlineSoon(a.end_date))

  // Licenças ambientais a vencer (somente dentro da janela de alerta 180 ou 30 dias, ou já vencidas para atenção)
  const expiringLicenses = environmentalLicenses
    .map((lic) => {
      const proj = projects.find((p) => p.id === lic.project)
      const alertInfo = calculateLicenseStatus(lic)
      return {
        ...lic,
        projectName: proj?.name || 'Projeto',
        ...alertInfo,
      }
    })
    .filter((lic) => lic.isAlert || lic.status === 'Vencida')
    .sort((a, b) => a.daysRemaining - b.daysRemaining)

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
                      {projAllocs.length} Usuário(a)s CEDRO alocado(a)s
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
            <CardDescription>Usuário(a)s CEDRO com prazo próximo (7 dias).</CardDescription>
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

      {canViewLicenseAlerts && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                Licenças Ambientais a Vencer
              </CardTitle>
              <CardDescription>
                Alertas automáticos de vigência e prazos de renovação (visível para Master e
                Administrativo).
              </CardDescription>
            </div>
            {expiringLicenses.length > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                {expiringLicenses.length} licença(s) requerem atenção
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {expiringLicenses.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-sm">
                Nenhuma licença ambiental próxima do vencimento no momento.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {expiringLicenses.map((lic) => {
                  const displayType =
                    lic.license_type === 'Outras' && lic.description
                      ? `Outras — ${lic.description}`
                      : lic.license_type
                  const isExpired = lic.status === 'Vencida'

                  return (
                    <Link
                      key={lic.id}
                      to={`/projetos/${lic.project}#licencas-ambientais`}
                      className={`block p-4 rounded-xl border transition-all hover:shadow-md ${
                        isExpired
                          ? 'bg-red-50/60 border-red-200 hover:border-red-300'
                          : 'bg-amber-50/60 border-amber-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block truncate">
                            {lic.projectName}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 mt-0.5 line-clamp-1">
                            {displayType}
                          </h4>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            isExpired
                              ? 'bg-red-100 text-red-800 border-red-300 shrink-0 text-[11px]'
                              : 'bg-amber-100 text-amber-800 border-amber-300 shrink-0 text-[11px]'
                          }
                        >
                          {isExpired ? 'Vencida' : `${lic.daysRemaining} dias`}
                        </Badge>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                        <span className="text-slate-600">
                          Vencimento: <strong>{safeFormatDate(lic.end_date)}</strong>
                        </span>
                        <span
                          className={`font-medium ${isExpired ? 'text-red-700' : 'text-amber-700'}`}
                        >
                          {isExpired
                            ? `Venceu há ${Math.abs(lic.daysRemaining)}d`
                            : 'Providenciar renovação'}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
