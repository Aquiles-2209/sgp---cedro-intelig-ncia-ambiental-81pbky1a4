import { useState } from 'react'
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { fetchReportData, type ReportRow } from '@/services/reports'
import { exportExcelReport } from '@/lib/export-excel-report'
import pb from '@/lib/pocketbase/client'
import type { Project, TimeEntry, Task, Allocation } from '@/types/models'
import { exportProjectReport } from '@/lib/export-report'

interface ExportDialogProps {
  projectId: string
  projectName: string
}

export function ExportDialog({ projectId, projectName }: ExportDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState<'excel' | 'csv' | null>(null)

  const handleExportExcel = async () => {
    if (!startDate || !endDate) {
      toast({ title: 'Selecione o período inicial e final.', variant: 'destructive' })
      return
    }
    setLoading('excel')
    try {
      const rows: ReportRow[] = await fetchReportData([projectId], startDate, endDate)
      if (rows.length === 0) {
        toast({ title: 'Nenhum dado encontrado para o período selecionado.' })
        return
      }
      exportExcelReport(rows)
      toast({ title: 'Relatório Excel exportado com sucesso!' })
      setOpen(false)
    } catch {
      toast({ title: 'Erro ao exportar relatório.', variant: 'destructive' })
    } finally {
      setLoading(null)
    }
  }

  const handleExportCsv = async () => {
    if (!startDate || !endDate) {
      toast({ title: 'Selecione o período inicial e final.', variant: 'destructive' })
      return
    }
    setLoading('csv')
    try {
      const projectData = await pb.collection('projects').getOne<Project>(projectId)

      const taskList = await pb.collection('tasks').getFullList<Task>({
        filter: `project = "${projectId}"`,
      })

      const taskIds = taskList.map((t) => t.id)
      if (taskIds.length === 0) {
        toast({ title: 'Nenhuma tarefa encontrada para este projeto.' })
        return
      }

      const filterParts = taskIds.map((id) => `task = "${id}"`)
      const timeEntryList = await pb.collection('time_entries').getFullList<TimeEntry>({
        filter: `(${filterParts.join(' || ')}) && start_time >= "${startDate}" && start_time <= "${endDate}"`,
        expand: 'team_member,task',
      })

      exportProjectReport(projectData, [] as Allocation[], taskList, timeEntryList)
      toast({ title: 'Relatório CSV exportado com sucesso!' })
      setOpen(false)
    } catch {
      toast({ title: 'Erro ao exportar relatório.', variant: 'destructive' })
    } finally {
      setLoading(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-white">
          <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar Relatório — {projectName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Data Inicial</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Data Final</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleExportExcel} disabled={loading !== null} className="flex-1">
              {loading === 'excel' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              Exportar Excel
            </Button>
            <Button
              onClick={handleExportCsv}
              disabled={loading !== null}
              variant="outline"
              className="flex-1"
            >
              {loading === 'csv' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Exportar CSV
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
