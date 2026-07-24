import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Project, Allocation, Task, TimeEntry, TaskAssignment } from '@/types/models'
import {
  getProjects,
  createProject as svcCreate,
  updateProject as svcUpdate,
} from '@/services/projects'
import {
  getAllocations,
  createAllocation as svcCreateAlloc,
  updateAllocation as svcUpdateAlloc,
  deleteAllocation as svcDeleteAlloc,
} from '@/services/allocations'
import {
  getTasks,
  createTask as svcCreateTask,
  updateTask as svcUpdateTask,
  deleteTask as svcDeleteTask,
} from '@/services/tasks'
import {
  getTimeEntries,
  createTimeEntry as svcCreateTimeEntry,
  updateTimeEntry as svcUpdateTimeEntry,
  deleteTimeEntry as svcDeleteTimeEntry,
} from '@/services/time-entries'
import {
  getTaskAssignments,
  getTaskAssignmentsByTask,
  createTaskAssignment as svcCreateTaskAssignment,
  updateTaskAssignment as svcUpdateTaskAssignment,
  deleteTaskAssignment as svcDeleteTaskAssignment,
} from '@/services/task-assignments'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'

interface AppStateContextType {
  projects: Project[]
  allocations: Allocation[]
  tasks: Task[]
  timeEntries: TimeEntry[]
  taskAssignments: TaskAssignment[]
  loading: boolean
  addProject: (data: Partial<Project>) => Promise<Project>
  editProject: (id: string, data: Partial<Project>) => Promise<void>
  addAllocation: (data: Partial<Allocation>) => Promise<void>
  editAllocation: (id: string, data: Partial<Allocation>) => Promise<void>
  removeAllocation: (id: string) => Promise<void>
  addTask: (data: Partial<Task>) => Promise<void>
  editTask: (id: string, data: Partial<Task>) => Promise<void>
  removeTask: (id: string) => Promise<void>
  addTaskAssignment: (data: Partial<TaskAssignment>) => Promise<void>
  editTaskAssignment: (id: string, data: Partial<TaskAssignment>) => Promise<void>
  removeTaskAssignment: (id: string) => Promise<void>
  addTimeEntry: (data: Partial<TimeEntry>) => Promise<void>
  editTimeEntry: (id: string, data: Partial<TimeEntry>) => Promise<void>
  removeTimeEntry: (id: string) => Promise<void>
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined)

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadData = useCallback(async () => {
    try {
      const [p, a, t, te, ta] = await Promise.all([
        getProjects(),
        getAllocations(),
        getTasks(),
        getTimeEntries(),
        getTaskAssignments(),
      ])
      setProjects(p)
      setAllocations(a)
      setTasks(t)
      setTimeEntries(te)
      setTaskAssignments(ta)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    } else {
      setProjects([])
      setAllocations([])
      setTasks([])
      setTimeEntries([])
      setTaskAssignments([])
      setLoading(false)
    }
  }, [isAuthenticated, loadData])

  useRealtime('projects', () => loadData(), isAuthenticated)
  useRealtime('allocations', () => loadData(), isAuthenticated)
  useRealtime('tasks', () => loadData(), isAuthenticated)
  useRealtime('time_entries', () => loadData(), isAuthenticated)
  useRealtime('task_assignments', () => loadData(), isAuthenticated)

  const addProject = async (data: Partial<Project>) => {
    const project = await svcCreate(data)
    toast({ title: 'Projeto cadastrado com sucesso!' })
    return project
  }
  const editProject = async (id: string, data: Partial<Project>) => {
    await svcUpdate(id, data)
    toast({ title: 'Projeto atualizado com sucesso!' })
  }
  const addAllocation = async (data: Partial<Allocation>) => {
    await svcCreateAlloc(data)
    toast({ title: 'Usuário CEDRO alocado com sucesso!' })
  }
  const editAllocation = async (id: string, data: Partial<Allocation>) => {
    await svcUpdateAlloc(id, data)
  }
  const removeAllocation = async (id: string) => {
    await svcDeleteAlloc(id)
    toast({ title: 'Alocação removida.' })
  }
  const addTask = async (data: Partial<Task>) => {
    const task = await svcCreateTask(data)
    if (Array.isArray(data.members)) {
      for (const memberId of data.members) {
        await svcCreateTaskAssignment({ task: task.id, team_member: memberId })
      }
    }
    toast({ title: 'Tarefa criada com sucesso!' })
  }
  const editTask = async (id: string, data: Partial<Task>) => {
    await svcUpdateTask(id, data)
    if (Array.isArray(data.members)) {
      const existing = await getTaskAssignmentsByTask(id)
      const existingIds = existing.map((ta) => ta.team_member)
      for (const memberId of data.members) {
        if (!existingIds.includes(memberId)) {
          await svcCreateTaskAssignment({ task: id, team_member: memberId })
        }
      }
      for (const ta of existing) {
        if (!data.members.includes(ta.team_member)) {
          await svcDeleteTaskAssignment(ta.id)
        }
      }
    }
  }
  const removeTask = async (id: string) => {
    await svcDeleteTask(id)
    toast({ title: 'Tarefa removida.' })
  }
  const addTaskAssignment = async (data: Partial<TaskAssignment>) => {
    await svcCreateTaskAssignment(data)
  }
  const editTaskAssignment = async (id: string, data: Partial<TaskAssignment>) => {
    await svcUpdateTaskAssignment(id, data)
  }
  const removeTaskAssignment = async (id: string) => {
    await svcDeleteTaskAssignment(id)
  }
  const addTimeEntry = async (data: Partial<TimeEntry>) => {
    await svcCreateTimeEntry(data)
  }
  const editTimeEntry = async (id: string, data: Partial<TimeEntry>) => {
    await svcUpdateTimeEntry(id, data)
  }
  const removeTimeEntry = async (id: string) => {
    await svcDeleteTimeEntry(id)
  }

  return (
    <AppStateContext.Provider
      value={{
        projects,
        allocations,
        tasks,
        timeEntries,
        taskAssignments,
        loading,
        addProject,
        editProject,
        addAllocation,
        editAllocation,
        removeAllocation,
        addTask,
        editTask,
        removeTask,
        addTaskAssignment,
        editTaskAssignment,
        removeTaskAssignment,
        addTimeEntry,
        editTimeEntry,
        removeTimeEntry,
      }}
    >
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState() {
  const context = useContext(AppStateContext)
  if (!context) throw new Error('useAppState must be used within an AppStateProvider')
  return context
}
