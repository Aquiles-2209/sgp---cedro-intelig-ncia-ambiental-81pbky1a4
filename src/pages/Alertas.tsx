import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BellRing,
  AlertTriangle,
  Calendar,
  ExternalLink,
  Search,
  Clock,
  ShieldAlert,
  Briefcase,
} from 'lucide-react'
import { useAppState } from '@/hooks/use-app-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { calculateLicenseStatus } from '@/lib/environmental-licenses'
import { safeFormatDate } from '@/types/models'
import type { EnvironmentalLicense, Project } from '@/types/models'

interface LicenseItemWithStatus extends EnvironmentalLicense {
  daysRemaining: number
  totalValidityDays: number
  alertThresholdDays: number
  inconsistentValidity: boolean
}

interface ProjectAlertGroup {
  project: Project
  licenses: LicenseItemWithStatus[]
  minDaysRemaining: number
}

export default function AlertasPage() {
  const { projects, environmentalLicenses, loading } = useAppState()
  const [searchTerm, setSearchTerm] = useState('')

  // Agrupar apenas licenças com Status "Próxima do vencimento"
  const projectAlertGroups: ProjectAlertGroup[] = useMemo(() => {
    // 1. Filtrar licenças com status "Próxima do vencimento"
    const expiringLicenses: LicenseItemWithStatus[] = []

    for (const lic of environmentalLicenses) {
      const statusInfo = calculateLicenseStatus(lic)
      if (statusInfo.status === 'Próxima do vencimento') {
        expiringLicenses.push({
          ...lic,
          daysRemaining: statusInfo.daysRemaining,
          totalValidityDays: statusInfo.totalValidityDays,
          alertThresholdDays: statusInfo.alertThresholdDays,
          inconsistentValidity: statusInfo.inconsistentValidity,
        })
      }
    }

    // 2. Agrupar por projeto
    const map = new Map<string, LicenseItemWithStatus[]>()
    for (const lic of expiringLicenses) {
      const existing = map.get(lic.project) || []
      existing.push(lic)
      map.set(lic.project, existing)
    }

    // 3. Montar relação dos projetos
    const groups: ProjectAlertGroup[] = []
    map.forEach((licensesList, projectId) => {
      const project = projects.find((p) => p.id === projectId)
      if (project) {
        // Ordenar licenças por dias restantes (mais urgente primeiro)
        licensesList.sort((a, b) => a.daysRemaining - b.daysRemaining)
        const minDays = Math.min(...licensesList.map((l) => l.daysRemaining))
        groups.push({
          project,
          licenses: licensesList,
          minDaysRemaining: minDays,
        })
      }
    })

    // Ordenar projetos pela urgência mais próxima
    groups.sort((a, b) => a.minDaysRemaining - b.minDaysRemaining)

    return groups
  }, [projects, environmentalLicenses])

  // Filtro de busca
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return projectAlertGroups
    const term = searchTerm.toLowerCase()
    return projectAlertGroups.filter((g) => {
      const matchProject =
        g.project.name.toLowerCase().includes(term) ||
        (g.project.client && g.project.client.toLowerCase().includes(term)) ||
        (g.project.contract_id && g.project.contract_id.toLowerCase().includes(term))
      const matchLicense = g.licenses.some(
        (l) =>
          l.license_type.toLowerCase().includes(term) ||
          (l.description && l.description.toLowerCase().includes(term)),
      )
      return matchProject || matchLicense
    })
  }, [projectAlertGroups, searchTerm])

  const totalLicensesCount = useMemo(() => {
    return projectAlertGroups.reduce((acc, g) => acc + g.licenses.length, 0)
  }, [projectAlertGroups])

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Alertas</h1>
            {totalLicensesCount > 0 && (
              <span className="inline-flex items-center justify-center animate-vibrate text-amber-600 bg-amber-100 p-1.5 rounded-full">
                <BellRing className="h-5 w-5" />
              </span>
            )}
          </div>
          <p className="text-slate-500 mt-1">
            Relação dos projetos com Licenças Ambientais com status{' '}
            <strong className="text-amber-700">"Próxima do vencimento"</strong>.
          </p>
        </div>

        {/* Resumo em Badge */}
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-800 border-amber-300 px-3 py-1.5 text-xs font-semibold"
          >
            {projectAlertGroups.length} projeto(s) • {totalLicensesCount} licença(s) em alerta
          </Badge>
        </div>
      </div>

      {/* Barra de Pesquisa */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar por projeto, cliente, contrato ou tipo de licença..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-white"
        />
      </div>

      {/* Conteúdo Principal */}
      {loading ? (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center text-slate-500">
            Carregando relação de alertas...
          </CardContent>
        </Card>
      ) : filteredGroups.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhuma licença próxima do vencimento'}
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              {searchTerm
                ? 'Tente ajustar os termos de busca para encontrar o projeto ou licença desejado.'
                : 'Todas as licenças ambientais cadastradas estão dentro do prazo de vigência regular.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map(({ project, licenses }) => (
            <Card
              key={project.id}
              className="border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
            >
              {/* Cabeçalho do Projeto */}
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/projetos/${project.id}#licencas-ambientais`}
                          className="font-bold text-slate-900 hover:text-primary transition-colors truncate text-base hover:underline"
                        >
                          {project.name}
                        </Link>
                        {/* Ícone de sininho vibrando no projeto */}
                        <span
                          className="inline-flex items-center justify-center text-amber-600 animate-vibrate shrink-0"
                          title="Possui licença ambiental próxima do vencimento"
                        >
                          <BellRing className="h-4 w-4 fill-amber-100" />
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {project.contract_id && (
                          <span className="font-medium text-slate-700">
                            {project.contract_id} •{' '}
                          </span>
                        )}
                        {project.client || 'Cliente não informado'}
                        {project.setor && ` • Setor: ${project.setor}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className="bg-amber-100/70 text-amber-900 border-amber-300 text-xs font-semibold"
                    >
                      {licenses.length} {licenses.length === 1 ? 'licença' : 'licenças'} em alerta
                    </Badge>
                    <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-xs">
                      <Link to={`/projetos/${project.id}#licencas-ambientais`}>
                        Abrir Projeto
                        <ExternalLink className="h-3.5 w-3.5 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Relação de Licenças do Projeto */}
              <CardContent className="p-0 divide-y divide-slate-100">
                {licenses.map((lic) => {
                  const displayType =
                    lic.license_type === 'Outras' && lic.description
                      ? `Outras — ${lic.description}`
                      : lic.license_type

                  return (
                    <div
                      key={lic.id}
                      className="p-4 sm:px-6 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      {/* Tipo de Licença e Detalhes */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 text-sm">
                            {displayType}
                          </span>
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-800 border-amber-300 text-[11px] font-medium"
                          >
                            Próxima do vencimento
                          </Badge>
                          {lic.inconsistentValidity && (
                            <Badge
                              variant="outline"
                              className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]"
                            >
                              Inconsistência de Vigência
                            </Badge>
                          )}
                        </div>

                        {lic.description && lic.license_type !== 'Outras' && (
                          <p className="text-xs text-slate-500 line-clamp-1">{lic.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-0.5">
                          {lic.start_date && (
                            <span>
                              Início: <strong>{safeFormatDate(lic.start_date)}</strong>
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-slate-900 font-medium">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            Término:{' '}
                            <strong className="text-amber-900">
                              {safeFormatDate(lic.end_date)}
                            </strong>
                          </span>
                          {lic.validity_months && (
                            <span className="text-slate-500">
                              Validade informada: {lic.validity_months} meses
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Dias restantes e Ação */}
                      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-amber-900 font-semibold text-xs">
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                          <span>
                            {lic.daysRemaining === 0
                              ? 'Vence hoje'
                              : lic.daysRemaining === 1
                                ? 'Resta 1 dia'
                                : `Restam ${lic.daysRemaining} dias`}
                          </span>
                        </div>

                        <Button variant="outline" size="sm" asChild className="h-8 text-xs">
                          <Link to={`/projetos/${project.id}#licencas-ambientais`}>
                            Ver no Projeto
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
