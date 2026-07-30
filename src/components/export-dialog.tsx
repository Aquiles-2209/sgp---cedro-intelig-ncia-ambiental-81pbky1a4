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

const BATCH_SIZE = 15

interface ExportDialogProps {
  projectId: string
  projectName: string
}

async function fetchTimeEntriesBatched(
  taskIds: string[],
  startDate: string,
  endDate: string,
): Promise<TimeEntry[]> {
  const allEntries: TimeEntry[] = []
  const seenIds = new Set<string>()
  for (let i = 0; i < taskIds.length; i += BATCH_SIZE) {
    const batch = taskIds.slice(i, i + BATCH_SIZE)
    const taskFilter = batch.map((id) => `task = "${id}"`).join(' || ')
    const filter = `(${taskFilter}) && start_time >= "${startDate}" && start_time <= "${endDate}"`
    try {
      const batchEntries = await pb
        .collection('time_entries')
        .getFullList<TimeEntry>({ filter, expand: 'team_member,task,allocation' })
      for (const entry of batchEntries) {
        if (!seenIds.has(entry.id)) {
          seenIds.add(entry.id)
          allEntries.push(entry)
        }
      }
    } catch (err) {
      console.error('[ExportDialog] Error fetching time_entries batch:', err)
    }
  }
  return allEntries
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
    } catch (err) {
      console.error('[ExportDialog] Error exporting Excel:', err)
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

      const allocationList = await pb.collection('allocations').getFullList<Allocation>({
        filter: `project = "${projectId}"`,
        sort: 'start_date',
      })

      const taskList = await pb.collection('tasks').getFullList<Task>({
        filter: `project = "${projectId}"`,
      })

      let timeEntryList: TimeEntry[] = []
      if (taskList.length > 0) {
        const taskIds = taskList.map((t) => t.id)
        timeEntryList = await fetchTimeEntriesBatched(taskIds, startDate, endDate)
      }

      exportProjectReport(projectData, allocationList, taskList, timeEntryList, startDate, endDate)
      toast({ title: 'Relatório CSV exportado com sucesso!' })
      setOpen(false)
    } catch (err) {
      console.error('[ExportDialog] Error exporting CSV:', err)
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
