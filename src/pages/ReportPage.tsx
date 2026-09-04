import { useState, useEffect, useCallback } from 'react'
import { FileSpreadsheet, Loader2, Users, FolderKanban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { fetchReportData, type ReportRow } from '@/services/reports'
import { exportExcelReport } from '@/lib/export-excel-report'
import { getProjects } from '@/services/projects'
import { getTeamMembers } from '@/services/team-members'
import { fetchValoresMensais, temPermissaoCusto } from '@/services/custo-hora'
import {
  formatarMoedaBRL,
  calcularCustoHoraUnitario,
  calcularCustoTotalLinha,
  calcularHorasTotaisPorUsuario,
  normalizarChaveMembro,
} from '@/lib/custo-hora'
import { normalizeDate } from '@/types/models'
import type { Project, TeamMember } from '@/types/models'
import { cn } from '@/lib/utils'

function formatDateBR(dateStr: string): string {
  const normalized = normalizeDate(dateStr)
  if (!normalized) return '—'
  const [year, month, day] = normalized.split('-')
  return `${day}/${month}/${year}`
}

function formatLaunchDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ReportPage() {
  const { toast } = useToast()
  const { user } = useAuth()

  // Coluna M (Custo Hora Unitário): confidencial. A permissão é declarada
  // aqui apenas para esconder a UI — os DADOS só chegam se o backend
  // autorizar (ver src/services/custo-hora.ts e hook valores_mensais.js).
  // Sem permissão, a coluna NEM EXISTE na tabela nem na exportação.
  const podeVerCustoHora = temPermissaoCusto(user)

  // Projects state
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [projectStartDate, setProjectStartDate] = useState('')
  const [projectEndDate, setProjectEndDate] = useState('')

  // Team members state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [memberStartDate, setMemberStartDate] = useState('')
  const [memberEndDate, setMemberEndDate] = useState('')

  // Active filter context and results
  const [activeFilterType, setActiveFilterType] = useState<'project' | 'member' | null>(null)
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(false)
  // Valores Mensais (confidenciais): vazios para qualquer usuário não
  // autorizado — fetchValoresMensais() devolve {} sem nem chamar a API.
  const [valoresMensais, setValoresMensais] = useState<Record<string, number>>({})
  const loadInitialData = useCallback(async () => {
    try {
      const [projectsData, membersData] = await Promise.all([getProjects(), getTeamMembers()])
      setProjects(projectsData)
      setTeamMembers(membersData)
    } catch {
      /* silent */
    }
  }, [])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // Recarrega os Valores Mensais sempre que o usuário autorizado entra na
  // página: garante recálculo automático quando o Valor Mensal muda no
  // cadastro de usuários CEDRO.
  useEffect(() => {
    let ativo = true
    fetchValoresMensais().then((rates) => {
      if (ativo) setValoresMensais(rates)
    })
    return () => {
      ativo = false
    }
  }, [podeVerCustoHora, user?.id])
  // Handle Project Report Fetch
  const handleFetchProjectReport = async () => {
    if (!projectStartDate || !projectEndDate) {
      toast({ title: 'Selecione o período inicial e final.', variant: 'destructive' })
      return
    }
    setLoading(true)
    setActiveFilterType('project')
    try {
      const projectIds = selectedProject === 'all' ? projects.map((p) => p.id) : [selectedProject]
      const data = await fetchReportData(
        projectIds,
        projectStartDate,
        projectEndDate,
        undefined,
        valoresMensais,
      )
      setRows(data)
      if (data.length === 0) {
        toast({ title: 'Nenhum dado encontrado para o período selecionado.' })
      }
    } catch {
      toast({ title: 'Erro ao buscar dados do relatório.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // Handle Member Report Fetch
  const handleFetchMemberReport = async () => {
    if (!selectedMember) {
      toast({ title: 'Selecione um(a) Usuário(a) CEDRO.', variant: 'destructive' })
      return
    }
    if (!memberStartDate || !memberEndDate) {
      toast({ title: 'Selecione o período inicial e final.', variant: 'destructive' })
      return
    }
    setLoading(true)
    setActiveFilterType('member')
    try {
      const allProjectIds = projects.map((p) => p.id)
      const data = await fetchReportData(
        allProjectIds,
        memberStartDate,
        memberEndDate,
        selectedMember,
        valoresMensais,
      )
      setRows(data)
      if (data.length === 0) {
        toast({ title: 'Nenhum dado encontrado para o usuário no período selecionado.' })
      }
    } catch {
      toast({ title: 'Erro ao buscar dados do relatório.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (rows.length === 0) {
      toast({ title: 'Nenhum dado para exportar.', variant: 'destructive' })
      return
    }
    // A exportação segue a MESMA regra de permissão da tela: apenas o
    // usuário autorizado recebe a Coluna M; os demais recebem o arquivo
    // somente até a Coluna L (a função ignora qualquer dado financeiro
    // que não possa ser exibido).
    exportExcelReport(rows, podeVerCustoHora)
    toast({ title: 'Relatório exportado com sucesso!' })
  }

  const totals = rows.reduce(
    (acc, r) => ({
      planned: acc.planned + r.plannedHours,
      imported: acc.imported + r.allocatedHours,
      worked: acc.worked + r.hoursWorked,
    }),
    { planned: 0, imported: 0, worked: 0 },
  )
  const totalAll = totals.imported + totals.worked
  const totalBalance = totals.planned - totalAll

  // Requisito Coluna M:
  // Custo Hora Unitário = Valor Mensal ÷ Σ(Total de Horas do Usuário no período selecionado)
  // Agrupa as horas de todas as linhas de cada usuário no período selecionado para
  // servir como denominador único para todas as linhas daquele usuário.
  const horasTotaisPorUsuario = calcularHorasTotaisPorUsuario(rows)

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Relatórios</h1>
        <p className="text-slate-500 mt-1">
          Gere relatórios de produtividade por projeto ou por usuário e período.
        </p>
      </div>

      {/* 1. Project Productivity Filter Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" />
            Produtividade por Projeto
          </CardTitle>
          <CardDescription>Gere relatórios de produtividade por projeto e período.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os projetos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os projetos</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-start">Data Inicial</Label>
              <Input
                id="report-start"
                type="date"
                value={projectStartDate}
                onChange={(e) => setProjectStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-end">Data Final</Label>
              <Input
                id="report-end"
                type="date"
                value={projectEndDate}
                onChange={(e) => setProjectEndDate(e.target.value)}
              />
            </div>
            <Button onClick={handleFetchProjectReport} disabled={loading}>
              {loading && activeFilterType === 'project' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Gerar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Team Member Productivity Filter Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Produtividade por Usuário(a)
          </CardTitle>
          <CardDescription>Gere relatórios de produtividade por usuário e período.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>Usuário(a) CEDRO</Label>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um(a) usuário(a)" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} {m.function ? `(${m.function})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-report-start">Data Inicial</Label>
              <Input
                id="member-report-start"
                type="date"
                value={memberStartDate}
                onChange={(e) => setMemberStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-report-end">Data Final</Label>
              <Input
                id="member-report-end"
                type="date"
                value={memberEndDate}
                onChange={(e) => setMemberEndDate(e.target.value)}
              />
            </div>
            <Button onClick={handleFetchMemberReport} disabled={loading}>
              {loading && activeFilterType === 'member' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Gerar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      {rows.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  Resultados ({rows.length} {rows.length === 1 ? 'registro' : 'registros'})
                </h3>
                <p className="text-xs text-slate-500">
                  {activeFilterType === 'member'
                    ? `Filtrado por usuário: ${teamMembers.find((m) => m.id === selectedMember)?.name || 'Usuário'}`
                    : selectedProject === 'all'
                      ? 'Filtrado por: Todos os projetos'
                      : `Filtrado por projeto: ${projects.find((p) => p.id === selectedProject)?.name || 'Projeto'}`}
                </p>
              </div>
              <Button onClick={handleExport} variant="outline" className="bg-white">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Membro</TableHead>
                    <TableHead>Atividade</TableHead>
                    <TableHead>Data Atividade</TableHead>
                    <TableHead>Data Lançamento</TableHead>
                    <TableHead className="text-right">Horas Previstas</TableHead>
                    <TableHead className="text-right">Horas Importadas</TableHead>
                    <TableHead className="text-right">Horas Trabalhadas (Timer)</TableHead>
                    <TableHead className="text-right">Total Horas</TableHead>
                    <TableHead className="text-right">Saldo Horas</TableHead>
                    {podeVerCustoHora && (
                      <>
                        <TableHead className="text-right">Custo Hora Unitário</TableHead>
                        <TableHead className="text-right">Custo Total</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => {
                    const totalHours = row.allocatedHours + row.hoursWorked
                    const balance = row.plannedHours - totalHours
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.client}</TableCell>
                        <TableCell>{row.projectName}</TableCell>
                        <TableCell>{row.memberSector}</TableCell>
                        <TableCell>{row.memberName}</TableCell>
                        <TableCell>{row.activityTitle}</TableCell>
                        <TableCell>{formatDateBR(row.activityLaunchDate)}</TableCell>
                        <TableCell>{formatLaunchDate(row.launchDate)}</TableCell>
                        <TableCell className="text-right">{row.plannedHours.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {row.allocatedHours.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">{row.hoursWorked.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{totalHours.toFixed(2)}</TableCell>
                        <TableCell
                          className={cn(
                            'text-right font-medium',
                            balance < 0 ? 'text-red-600' : balance > 0 ? 'text-green-600' : '',
                          )}
                        >
                          {balance.toFixed(2)}
                        </TableCell>
                        {podeVerCustoHora &&
                          (() => {
                            const userKey = normalizarChaveMembro(row.memberName)
                            const userTotalPeriodHours = horasTotaisPorUsuario.get(userKey) || 0
                            const hasValidRate =
                              row.monthlyValue !== undefined && Number.isFinite(row.monthlyValue)

                            if (!hasValidRate || userTotalPeriodHours <= 0) {
                              return (
                                <>
                                  <TableCell className="text-right font-medium">N/A</TableCell>
                                  <TableCell className="text-right font-medium"></TableCell>
                                </>
                              )
                            }

                            const custoHora = calcularCustoHoraUnitario(
                              row.monthlyValue ?? 0,
                              userTotalPeriodHours,
                            )
                            const custoTotal = calcularCustoTotalLinha(custoHora, totalHours)

                            return (
                              <>
                                <TableCell className="text-right font-medium">
                                  {formatarMoedaBRL(custoHora)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {custoTotal !== null ? formatarMoedaBRL(custoTotal) : ''}
                                </TableCell>
                              </>
                            )
                          })()}
                      </TableRow>
                    )
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={7} className="font-bold">
                      TOTAL GERAL
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {totals.planned.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {totals.imported.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {totals.worked.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-bold">{totalAll.toFixed(2)}</TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-bold',
                        totalBalance < 0
                          ? 'text-red-600'
                          : totalBalance > 0
                            ? 'text-green-600'
                            : '',
                      )}
                    >
                      {totalBalance.toFixed(2)}
                    </TableCell>
                    {podeVerCustoHora && (
                      <>
                        <TableCell className="text-right font-bold">—</TableCell>
                        <TableCell className="text-right font-bold">—</TableCell>
                      </>
                    )}
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
