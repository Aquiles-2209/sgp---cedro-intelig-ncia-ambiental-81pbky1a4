import { useState, useEffect, useCallback } from 'react'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { fetchReportData, type ReportRow } from '@/services/reports'
import { exportExcelReport } from '@/lib/export-excel-report'
import { getProjects } from '@/services/projects'
import { normalizeDate } from '@/types/models'
import type { Project } from '@/types/models'
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
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(false)

  const loadProjects = useCallback(async () => {
    try {
      const data = await getProjects()
      setProjects(data)
    } catch {
      /* silent */
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const handleFetch = async () => {
    if (!startDate || !endDate) {
      toast({ title: 'Selecione o período inicial e final.', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const projectIds = selectedProject === 'all' ? projects.map((p) => p.id) : [selectedProject]
      const data = await fetchReportData(projectIds, startDate, endDate)
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

  const handleExport = () => {
    if (rows.length === 0) {
      toast({ title: 'Nenhum dado para exportar.', variant: 'destructive' })
      return
    }
    exportExcelReport(rows)
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Relatórios</h1>
        <p className="text-slate-500 mt-1">
          Gere relatórios de produtividade por projeto e período.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6">
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
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-end">Data Final</Label>
              <Input
                id="report-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={handleFetch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Gerar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800">
                Resultados ({rows.length} registros)
              </h3>
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
