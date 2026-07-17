import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { DatePicker } from '@/components/date-picker'
import { fetchReportData } from '@/services/reports'
import { exportExcelReport } from '@/lib/export-excel-report'
import { toast } from 'sonner'

interface ExportDialogProps {
  projectId: string
  projectName: string
}

export function ExportDialog({ projectId, projectName }: ExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast.error('Selecione o período (data de início e fim).')
      return
    }
    if (startDate > endDate) {
      toast.error('A data de início deve ser anterior à data de fim.')
      return
    }

    setExporting(true)
    try {
      const rows = await fetchReportData([projectId], startDate, endDate)
      if (rows.length === 0) {
        toast.warning('Nenhum registro encontrado para o período selecionado.')
        return
      }
      exportExcelReport(rows)
      toast.success('Relatório exportado com sucesso!')
      setOpen(false)
    } catch {
      toast.error('Erro ao exportar o relatório.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-white">
          <Download className="h-4 w-4 mr-2" /> Exportar Relatório
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Relatório Excel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-500">
            Selecione o período para o relatório do projeto{' '}
            <strong className="text-slate-700">{projectName}</strong>.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Data de Início</label>
              <DatePicker value={startDate} onChange={setStartDate} placeholder="DD/MM/AAAA" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Data de Fim</label>
              <DatePicker value={endDate} onChange={setEndDate} placeholder="DD/MM/AAAA" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
