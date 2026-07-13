import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Edit,
  Calendar,
  FileText,
  Briefcase,
  AlertTriangle,
  Clock,
  CheckSquare,
  Download,
} from 'lucide-react'
import { useAppState } from '@/hooks/use-app-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  isDeadlineSoon,
  normalizeDate,
  safeFormatDate,
  TaskStatus,
  formatDuration,
} from '@/types/models'
import { exportProjectReport } from '@/lib/export-report'
import { TaskDialog } from '@/components/task-dialog'
import { TaskList } from '@/components/task-list'
import { useToast } from '@/hooks/use-toast'

const statusColors: Record<string, string> = {
  'Em Andamento': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Concluído: 'bg-slate-100 text-slate-700 border-slate-200',
  Planejado: 'bg-blue-50 text-blue-700 border-blue-200',
}

export default function ProjectDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    projects,
    allocations,
    tasks,
    timeEntries,
    addTask,
    editTask,
    removeTask,
    addTimeEntry,
    editTimeEntry,
  } = useAppState()
  const { toast } = useToast()
  const project = projects.find((p) => p.id === id)

  if (!project) return <div className="p-8 text-center">Projeto não encontrado.</div>

  const projAllocs = allocations.filter((a) => a.project === id)
  const projTasks = tasks.filter((t) => t.project === id)

  const handleExport = () => {
    const projTimeEntries = timeEntries.filter((te) => projTasks.some((t) => t.id === te.task))
    exportProjectReport(project, projAllocs, projTasks, projTimeEntries)
  }

  const handleTaskStatusChange = async (taskId: string, status: TaskStatus) => {
    await editTask(taskId, { status })
  }

  const handleTaskDelete = async (taskId: string) => {
    await removeTask(taskId)
  }

  const handleStartTimer = async (taskId: string, allocationId: string) => {
    const active = timeEntries.find((te) => te.allocation === allocationId && !te.end_time)
    if (active) {
      toast({ title: 'Já existe um timer ativo para este membro.', variant: 'destructive' })
      return
    }
    await addTimeEntry({
      task: taskId,
      allocation: allocationId,
      start_time: new Date().toISOString(),
      duration: 0,
    })
    toast({ title: 'Timer iniciado!' })
  }

  const handleStopTimer = async (entryId: string) => {
    const entry = timeEntries.find((te) => te.id === entryId)
    if (!entry) return
    const now = new Date()
    const startTime = new Date(entry.start_time)
    const duration = Math.floor((now.getTime() - startTime.getTime()) / 1000)
    await editTimeEntry(entryId, {
      end_time: now.toISOString(),
      duration,
    })
    toast({ title: 'Timer pausado.' })
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in-up">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/projetos')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{project.name}</h1>
              <Badge variant="outline" className={statusColors[project.status]}>
                {project.status}
              </Badge>
            </div>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> {project.client} • {project.contract_id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="bg-white" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Exportar Relatório
          </Button>
          <Button
            variant="outline"
            className="bg-white"
            onClick={() => navigate(`/projetos/${id}/editar`)}
          >
            <Edit className="h-4 w-4 mr-2" /> Editar Projeto
          </Button>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-slate-800">
                <FileText className="h-5 w-5 text-slate-400" /> Detalhes e Escopo
              </h3>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {project.description || 'Nenhuma descrição fornecida.'}
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Início
                  </p>
                  <p className="font-medium text-slate-900 mt-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {safeFormatDate(project.start_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Término
                  </p>
                  <p className="font-medium text-slate-900 mt-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {safeFormatDate(project.end_date)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-slate-800">Resumo de Alocação</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total de membros</span>
                  <span className="font-medium">{projAllocs.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Prazos próximos</span>
                  <span
                    className={`font-medium ${projAllocs.filter((a) => isDeadlineSoon(a.end_date)).length > 0 ? 'text-red-600' : ''}`}
                  >
                    {projAllocs.filter((a) => isDeadlineSoon(a.end_date)).length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total de tarefas</span>
                  <span className="font-medium">{projTasks.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tempo total trabalhado</span>
                  <span className="font-medium">
                    {formatDuration(
                      timeEntries
                        .filter((te) => projTasks.some((t) => t.id === te.task))
                        .reduce((sum, te) => sum + (te.duration || 0), 0),
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {projAllocs.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-slate-800">
              <Clock className="h-5 w-5 text-slate-400" /> Alocação de Membros e Períodos
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Término</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projAllocs.map((a) => {
                  const soon = isDeadlineSoon(a.end_date)
                  return (
                    <TableRow key={a.id} className={soon ? 'bg-red-50' : ''}>
                      <TableCell className="font-medium text-slate-900">{a.member_name}</TableCell>
                      <TableCell className="text-slate-600">{a.function}</TableCell>
                      <TableCell className="text-slate-600">
                        {safeFormatDate(a.start_date)}
                      </TableCell>
                      <TableCell className={soon ? 'text-red-600 font-medium' : 'text-slate-600'}>
                        {safeFormatDate(a.end_date)}
                      </TableCell>
                      <TableCell>
                        {soon ? (
                          <span className="flex items-center gap-1 text-red-600 text-xs font-medium">
                            <AlertTriangle className="h-3 w-3" />
                            Prazo próximo
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Em dia</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
              <CheckSquare className="h-5 w-5 text-slate-400" /> Tarefas do Projeto
            </h3>
            <TaskDialog projectId={id!} allocations={projAllocs} onAdd={addTask} />
          </div>
          <TaskList
            tasks={projTasks}
            allocations={projAllocs}
            timeEntries={timeEntries}
            projectId={id!}
            onEdit={editTask}
            onEditStatus={handleTaskStatusChange}
            onDelete={handleTaskDelete}
            onStartTimer={handleStartTimer}
            onStopTimer={handleStopTimer}
          />
        </CardContent>
      </Card>
    </div>
  )
}
