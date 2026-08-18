import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { getProjects, createProject, updateProject, deleteProject } from '@/services/projects'
import {
  getAllocations,
  createAllocation,
  updateAllocation,
  deleteAllocation,
} from '@/services/allocations'
import { getTasks, createTask, updateTask, deleteTask } from '@/services/tasks'
import {
  getTimeEntries,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
} from '@/services/time-entries'
import {
  getTaskAssignments,
  createTaskAssignment,
  updateTaskAssignment,
  deleteTaskAssignment,
} from '@/services/task-assignments'
import type { Project, Allocation, Task, TimeEntry, TaskAssignment } from '@/types/models'

interface AppStateType {
  projects: Project[]
  allocations: Allocation[]
  tasks: Task[]
  timeEntries: TimeEntry[]
  taskAssignments: TaskAssignment[]
  loading: boolean
  addProject: (data: Partial<Project>) => Promise<Project>
  editProject: (id: string, data: Partial<Project>) => Promise<Project>
  removeProject: (id: string) => Promise<void>
  addAllocation: (data: Partial<Allocation>) => Promise<void>
  editAllocation: (id: string, data: Partial<Allocation>) => Promise<void>
  removeAllocation: (id: string) => Promise<void>
  addTask: (data: Partial<Task>) => Promise<Task>
  editTask: (id: string, data: Partial<Task>) => Promise<Task>
  removeTask: (id: string) => Promise<void>
  addTimeEntry: (data: Partial<TimeEntry>) => Promise<void>
  editTimeEntry: (id: string, data: Partial<TimeEntry>) => Promise<void>
  removeTimeEntry: (id: string) => Promise<void>
  addTaskAssignment: (data: Partial<TaskAssignment>) => Promise<void>
  editTaskAssignment: (id: string, data: Partial<TaskAssignment>) => Promise<void>
  removeTaskAssignment: (id: string) => Promise<void>
}

const AppStateContext = createContext<AppStateType | undefined>(undefined)

export const useAppState = () => {
  const context = useContext(AppStateContext)
  if (!context) throw new Error('useAppState must be used within AppStateProvider')
  return context
}

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignment[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [p, a, t, te, ta] = await Promise.all([
        getProjects(),
        getAllocations(),
        getTasks(),
        getTimeEntries(),
        getTaskAssignments().catch(() => []),
      ])
      setProjects(p)
      setAllocations(a)
      setTasks(t)
      setTimeEntries(te)
      setTaskAssignments(ta)
    } catch (err) {
      console.error('Failed to load app state:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    loadData()
  }, [user, loadData])

  useRealtime('projects', () => loadData())
  useRealtime('allocations', () => loadData())
  useRealtime('tasks', () => loadData())
  useRealtime('time_entries', () => loadData())
  useRealtime('task_assignments', () => loadData())

  const addProject = async (data: Partial<Project>): Promise<Project> => {
    const created = await createProject(data)
    setProjects((prev) => [created, ...prev])
    return created
  }
  const editProject = async (id: string, data: Partial<Project>): Promise<Project> => {
    const updated = await updateProject(id, data)
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)))
    return updated
  }
  const removeProject = async (id: string) => {
    await deleteProject(id)
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }
  const addAllocation = async (data: Partial<Allocation>) => {
    const created = await createAllocation(data)
    setAllocations((prev) => [...prev, created])
  }
  const editAllocation = async (id: string, data: Partial<Allocation>) => {
    const updated = await updateAllocation(id, data)
    setAllocations((prev) => prev.map((a) => (a.id === id ? updated : a)))
  }
  const removeAllocation = async (id: string) => {
    await deleteAllocation(id)
    setAllocations((prev) => prev.filter((a) => a.id !== id))
  }
  const addTask = async (data: Partial<Task>): Promise<Task> => {
    const created = await createTask(data)
    setTasks((prev) => [created, ...prev])
    return created
  }
  const editTask = async (id: string, data: Partial<Task>): Promise<Task> => {
    const updated = await updateTask(id, data)
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
    return updated
  }
  const removeTask = async (id: string) => {
    await deleteTask(id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }
  const addTimeEntry = async (data: Partial<TimeEntry>) => {
    const created = await createTimeEntry(data)
    setTimeEntries((prev) => [...prev, created])
  }
  const editTimeEntry = async (id: string, data: Partial<TimeEntry>) => {
    const updated = await updateTimeEntry(id, data)
    setTimeEntries((prev) => prev.map((te) => (te.id === id ? updated : te)))
  }
  const removeTimeEntry = async (id: string) => {
    await deleteTimeEntry(id)
    setTimeEntries((prev) => prev.filter((te) => te.id !== id))
  }
  const addTaskAssignment = async (data: Partial<TaskAssignment>) => {
    await createTaskAssignment(data)
  }
  const editTaskAssignment = async (id: string, data: Partial<TaskAssignment>) => {
    await updateTaskAssignment(id, data)
  }
  const removeTaskAssignment = async (id: string) => {
    await deleteTaskAssignment(id)
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
        removeProject,
        addAllocation,
        editAllocation,
        removeAllocation,
        addTask,
        editTask,
        removeTask,
        addTimeEntry,
        editTimeEntry,
        removeTimeEntry,
        addTaskAssignment,
        editTaskAssignment,
        removeTaskAssignment,
      }}
    >
      {children}
    </AppStateContext.Provider>
  )
}
