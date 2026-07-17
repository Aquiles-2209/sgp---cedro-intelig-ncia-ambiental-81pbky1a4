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
import type { Project } from '@/types/models'

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Cliente</TableHead>
                  <TableHead>Nome do Projeto</TableHead>
                  <TableHead>Setor do membro</TableHead>
                  <TableHead>Nome do membro da equipe</TableHead>
                  <TableHead>Data de Lançamento da Atividade</TableHead>
                  <TableHead className="text-right">Total de horas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.client}</TableCell>
                    <TableCell>{row.projectName}</TableCell>
                    <TableCell>{row.memberSector}</TableCell>
                    <TableCell>{row.memberName}</TableCell>
                    <TableCell>{row.activityLaunchDate}</TableCell>
                    <TableCell className="text-right">{row.hoursWorked.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
