import { useState } from 'react'
import { FileBarChart, Loader2, Download, FileSpreadsheet, CheckCircle2 } from 'lucide-react'
import { useAppState } from '@/hooks/use-app-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DatePicker } from '@/components/date-picker'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { fetchReportData, type ReportRow } from '@/services/reports'
import { exportExcelReport } from '@/lib/export-excel-report'

export default function ReportPage() {
  const { projects } = useAppState()
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<ReportRow[] | null>(null)
  const [exporting, setExporting] = useState(false)

  const toggleProject = (id: string) => {
    setSelectedProjects((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
  }

  const selectAll = () => setSelectedProjects(projects.map((p) => p.id))
  const clearAll = () => setSelectedProjects([])

  const handleGenerate = async () => {
    if (selectedProjects.length === 0) {
      toast.error('Selecione ao menos um projeto.')
      return
    }
    if (!startDate || !endDate) {
      toast.error('Selecione o período (data de início e fim).')
      return
    }
    if (startDate > endDate) {
      toast.error('A data de início deve ser anterior à data de fim.')
      return
    }

    setLoading(true)
    setReportData(null)
    try {
      const rows = await fetchReportData(selectedProjects, startDate, endDate)
      setReportData(rows)
      if (rows.length === 0) {
        toast.warning('Nenhum registro encontrado para os filtros selecionados.')
      } else {
        toast.success(`${rows.length} registro(s) encontrado(s).`)
      }
    } catch {
      toast.error('Erro ao gerar o relatório. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!reportData || reportData.length === 0) return
    setExporting(true)
    try {
      exportExcelReport(reportData)
      toast.success('Relatório exportado com sucesso!')
    } catch {
      toast.error('Erro ao exportar o relatório.')
    } finally {
      setExporting(false)
    }
  }

  const totalHours = reportData?.reduce((sum, r) => sum + r.hoursWorked, 0) ?? 0

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Relatórios</h1>
        <p className="text-slate-500 mt-1">
          Gere relatórios de produtividade por projeto e período.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileBarChart className="h-5 w-5 text-primary" />
            Configuração do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Projetos</label>
              <div className="flex gap-2 text-xs">
                <button onClick={selectAll} className="text-primary hover:underline">
                  Selecionar todos
                </button>
                <span className="text-slate-300">|</span>
                <button onClick={clearAll} className="text-slate-500 hover:underline">
                  Limpar
                </button>
              </div>
            </div>
            <ScrollArea className="h-40 rounded-md border border-slate-200 p-2 bg-white">
              <div className="space-y-1">
                {projects.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 px-2 py-1.5 rounded transition-colors"
                  >
                    <Checkbox
                      checked={selectedProjects.includes(p.id)}
                      onCheckedChange={() => toggleProject(p.id)}
                    />
                    <span className="text-sm text-slate-700">{p.name}</span>
                    <span className="text-xs text-slate-400 ml-auto">{p.client}</span>
                  </label>
                ))}
                {projects.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">
                    Nenhum projeto disponível.
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Data de Início</label>
              <DatePicker value={startDate} onChange={setStartDate} placeholder="DD/MM/AAAA" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Data de Fim</label>
              <DatePicker value={endDate} onChange={setEndDate} placeholder="DD/MM/AAAA" />
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileBarChart className="h-4 w-4 mr-2" />
                Gerar Relatório
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {reportData && reportData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Resultado ({reportData.length} registro(s))
              </CardTitle>
              <Button onClick={handleExport} disabled={exporting} size="sm">
                {exporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Exportar CSV
              </Button>
            </div>
            <p className="text-sm text-slate-500">
              Total de horas trabalhadas:{' '}
              <span className="font-semibold text-slate-700">{totalHours.toFixed(2)}h</span>
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">Nome do Cliente</TableHead>
                    <TableHead className="font-semibold">Nome do Projeto</TableHead>
                    <TableHead className="font-semibold">Setor do membro</TableHead>
                    <TableHead className="font-semibold">Nome do membro da equipe</TableHead>
                    <TableHead className="font-semibold">Data de finalização</TableHead>
                    <TableHead className="font-semibold text-right">Total de horas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((row, i) => (
                    <TableRow key={i} className="hover:bg-slate-50">
                      <TableCell className="text-sm">{row.client}</TableCell>
                      <TableCell className="text-sm font-medium">{row.projectName}</TableCell>
                      <TableCell className="text-sm text-slate-500">{row.memberSector}</TableCell>
                      <TableCell className="text-sm">{row.memberName}</TableCell>
                      <TableCell className="text-sm text-slate-500">{row.completionDate}</TableCell>
                      <TableCell className="text-sm text-right font-mono">
                        {row.hoursWorked.toFixed(2)}h
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {reportData && reportData.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
          <FileSpreadsheet className="h-10 w-10 text-slate-300 mb-3" />
          <p>Nenhum registro encontrado para os filtros selecionados.</p>
        </div>
      )}
    </div>
  )
}
