import { useState, useEffect, useCallback } from 'react'
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
} from 'lucide-react'
import { useAppState } from '@/hooks/use-app-state'
import { useRealtime } from '@/hooks/use-realtime'
import { getTeamMembers, type TeamMember } from '@/services/team-members'
import { getTaskAssignments } from '@/services/task-assignments'
import type { TaskAssignment } from '@/types/models'
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
import { ExportDialog } from '@/components/export-dialog'
import { TaskDialog } from '@/components/task-dialog'
import { TaskList } from '@/components/task-list'
import { ProjectDeleteDialog } from '@/components/project-delete-dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { getTodaysTimeEntriesByTeamMember } from '@/services/time-entries'

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
    loading,
    addTask,
    editTask,
    removeTask,
    addTimeEntry,
    editTimeEntry,
    addTaskAssignment,
    editTaskAssignment,
    removeTaskAssignment,
  } = useAppState()
  const { toast } = useToast()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [localTaskAssignments, setLocalTaskAssignments] = useState<TaskAssignment[]>([])
  const [savingAssignmentKey, setSavingAssignmentKey] = useState<string>('')
  const project = projects.find((p) => p.id === id)
  const userAllocated = allocations.some((a) => a.project === id && a.user === user?.id)

  const loadTeamMembers = useCallback(async () => {
    try {
      const data = await getTeamMembers()
      setTeamMembers(data)
    } catch {
      /* silent */
    }
  }, [])

  const loadTaskAssignments = useCallback(async () => {
    try {
      const data = await getTaskAssignments()
      setLocalTaskAssignments(data)
    } catch {
      /* silent */
    }
  }, [])

  useEffect(() => {
    loadTeamMembers()
    loadTaskAssignments()
  }, [loadTeamMembers, loadTaskAssignments])

  useRealtime('team_members', () => loadTeamMembers())
  useRealtime('task_assignments', () => loadTaskAssignments())

  useEffect(() => {
    if (!loading && projects.length > 0 && project && !isAdmin && !userAllocated) {
      toast({
        title: 'Você não tem permissão para acessar este projeto.',
        variant: 'destructive',
      })
      navigate('/projetos', { replace: true })
    }
  }, [loading, projects.length, project, isAdmin, userAllocated, toast, navigate])

  if (!project) {
    if (loading) return <div className="p-8 text-center text-slate-500">Carregando projeto...</div>
    return <div className="p-8 text-center text-slate-500">Projeto não encontrado.</div>
  }

  if (!isAdmin && !userAllocated) {
    if (loading) return <div className="p-8 text-center text-slate-500">Carregando...</div>
    return <div className="p-8 text-center text-slate-500">Redirecionando...</div>
  }

  const projAllocs = allocations.filter((a) => a.project === id)
  const projTasks = tasks.filter((t) => t.project === id)

  const handleTaskStatusChange = async (taskId: string, status: TaskStatus) => {
    await editTask(taskId, { status })
  }

  const handleTaskDelete = async (taskId: string) => {
    await removeTask(taskId)
  }

  const handleStartTimer = async (taskId: string, memberId: string) => {
    const active = timeEntries.find(
      (te) => te.task === taskId && te.team_member === memberId && !te.end_time,
    )
    if (active) {
      toast({ title: 'Já existe um timer ativo para este membro.', variant: 'destructive' })
      return
    }
    try {
      const todaysEntries = await getTodaysTimeEntriesByTeamMember(memberId)
      const totalSeconds = todaysEntries.reduce((sum, te) => sum + (te.duration || 0), 0)
      const totalHours = totalSeconds / 3600
      if (totalHours >= 24) {
        toast({
          title:
            'Limite máximo de 24 horas diárias atingido. Não é possível iniciar nova contagem.',
          variant: 'destructive',
        })
        return
      }
    } catch {
      /* If the check fails, proceed with starting the timer */
    }
    const userAlloc = projAllocs.find((a) => a.user === user?.id)
    await addTimeEntry({
      task: taskId,
      team_member: memberId,
      allocation: userAlloc?.id ?? '',
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

  const handleRemoveMember = async (taskId: string, memberId: string) => {
    const assignment = localTaskAssignments.find(
      (ta) => ta.task === taskId && ta.team_member === memberId,
    )
    if (assignment) {
      await removeTaskAssignment(assignment.id)
      await loadTaskAssignments()
      toast({ title: 'Membro removido da tarefa.' })
    }
  }

  const handleSetAssignmentDate = async (
    taskId: string,
    memberId: string,
    field: 'start_date' | 'end_date',
    value: string,
  ) => {
    const assignment = localTaskAssignments.find(
      (ta) => ta.task === taskId && ta.team_member === memberId,
    )
    const currentStart = normalizeDate(assignment?.start_date)
    const currentEnd = normalizeDate(assignment?.end_date)
    if (field === 'start_date' && currentEnd && value > currentEnd) {
      toast({
        title: 'A data de início não pode ser posterior à data de término.',
        variant: 'destructive',
      })
      return
    }
    if (field === 'end_date' && currentStart && value < currentStart) {
      toast({
        title: 'A data de término não pode ser anterior à data de início.',
        variant: 'destructive',
      })
      return
    }
    const saveKey = `${taskId}-${memberId}-${field}`
    setSavingAssignmentKey(saveKey)
    try {
      if (assignment) {
        await editTaskAssignment(assignment.id, { [field]: value })
      } else {
        await addTaskAssignment({ task: taskId, team_member: memberId, [field]: value })
      }
      await loadTaskAssignments()
      toast({ title: 'Data atualizada com sucesso!' })
    } catch {
      toast({ title: 'Erro ao salvar a data.', variant: 'destructive' })
    } finally {
      setSavingAssignmentKey('')
    }
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
          {isAdmin && <ExportDialog projectId={id!} projectName={project.name} />}
          {isAdmin && (
            <Button
              variant="outline"
              className="bg-white"
              onClick={() => navigate(`/projetos/${id}/editar`)}
            >
              <Edit className="h-4 w-4 mr-2" /> Editar Projeto
            </Button>
          )}
          {isAdmin && (
            <ProjectDeleteDialog
              projectId={id!}
              projectName={project.name}
              projectStatus={project.status}
              onDeleted={() => navigate('/projetos')}
            />
          )}
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
                  <span className="text-slate-500">Total de Usuários CEDRO</span>
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
              <Clock className="h-5 w-5 text-slate-400" /> Alocação de Usuários CEDRO e Períodos
            </h3>{' '}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário CEDRO</TableHead>
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
            {isAdmin && <TaskDialog projectId={id!} teamMembers={teamMembers} onAdd={addTask} />}
          </div>
          <TaskList
            tasks={projTasks}
            timeEntries={timeEntries}
            taskAssignments={localTaskAssignments.filter((ta) =>
              projTasks.some((t) => t.id === ta.task),
            )}
            projectId={id!}
            teamMembers={teamMembers}
            isAdmin={isAdmin}
            onEdit={editTask}
            onEditStatus={handleTaskStatusChange}
            onDelete={handleTaskDelete}
            onStartTimer={handleStartTimer}
            onStopTimer={handleStopTimer}
            onRemoveMember={handleRemoveMember}
            onSetAssignmentDate={handleSetAssignmentDate}
            savingAssignmentKey={savingAssignmentKey}
          />
        </CardContent>
      </Card>
    </div>
  )
}
