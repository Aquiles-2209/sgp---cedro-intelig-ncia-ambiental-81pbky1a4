import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
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
  createTaskAssignment,
  updateTaskAssignment,
  deleteTaskAssignment,
} from '@/services/task-assignments'
import { useRealtime } from '@/hooks/use-realtime'
import type { Project, Allocation, Task, TimeEntry, TaskAssignment } from '@/types/models'

interface AppStateContextType {
  projects: Project[]
  allocations: Allocation[]
  tasks: Task[]
  timeEntries: TimeEntry[]
  loading: boolean
  addProject: (data: Partial<Project>) => Promise<void>
  editProject: (id: string, data: Partial<Project>) => Promise<void>
  removeProject: (id: string) => Promise<void>
  addAllocation: (data: Partial<Allocation>) => Promise<void>
  editAllocation: (id: string, data: Partial<Allocation>) => Promise<void>
  removeAllocation: (id: string) => Promise<void>
  addTask: (data: Partial<Task>) => Promise<void>
  editTask: (id: string, data: Partial<Task>) => Promise<void>
  removeTask: (id: string) => Promise<void>
  addTimeEntry: (data: Partial<TimeEntry>) => Promise<void>
  editTimeEntry: (id: string, data: Partial<TimeEntry>) => Promise<void>
  removeTimeEntry: (id: string) => Promise<void>
  addTaskAssignment: (data: Partial<TaskAssignment>) => Promise<void>
  editTaskAssignment: (id: string, data: Partial<TaskAssignment>) => Promise<void>
  removeTaskAssignment: (id: string) => Promise<void>
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined)

export const useAppState = () => {
  const context = useContext(AppStateContext)
  if (!context) throw new Error('useAppState must be used within AppStateProvider')
  return context
}

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const results = await Promise.allSettled([
      getProjects(),
      getAllocations(),
      getTasks(),
      getTimeEntries(),
    ])
    if (results[0].status === 'fulfilled') setProjects(results[0].value)
    if (results[1].status === 'fulfilled') setAllocations(results[1].value)
    if (results[2].status === 'fulfilled') setTasks(results[2].value)
    if (results[3].status === 'fulfilled') setTimeEntries(results[3].value)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('projects', () => loadData())
  useRealtime('allocations', () => loadData())
  useRealtime('tasks', () => loadData())
  useRealtime('time_entries', () => loadData())

  const addProject = async (data: Partial<Project>) => {
    const created = await createProject(data)
    setProjects((prev) => [created, ...prev])
  }
  const editProject = async (id: string, data: Partial<Project>) => {
    const updated = await updateProject(id, data)
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)))
  }
  const removeProject = async (id: string) => {
    await deleteProject(id)
    setProjects((prev) => prev.filter((p) => p.id !== id))
    setAllocations((prev) => prev.filter((a) => a.project !== id))
    setTasks((prev) => prev.filter((t) => t.project !== id))
  }
  const addAllocation = async (data: Partial<Allocation>) => {
    const created = await createAllocation(data)
    setAllocations((prev) => [created, ...prev])
  }
  const editAllocation = async (id: string, data: Partial<Allocation>) => {
    const updated = await updateAllocation(id, data)
    setAllocations((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)))
  }
  const removeAllocation = async (id: string) => {
    await deleteAllocation(id)
    setAllocations((prev) => prev.filter((a) => a.id !== id))
  }
  const addTask = async (data: Partial<Task>) => {
    const created = await createTask(data)
    setTasks((prev) => [created, ...prev])
  }
  const editTask = async (id: string, data: Partial<Task>) => {
    const updated = await updateTask(id, data)
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)))
  }
  const removeTask = async (id: string) => {
    await deleteTask(id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
    setTimeEntries((prev) => prev.filter((te) => te.task !== id))
  }
  const addTimeEntry = async (data: Partial<TimeEntry>) => {
    const created = await createTimeEntry(data)
    setTimeEntries((prev) => [created, ...prev])
  }
  const editTimeEntry = async (id: string, data: Partial<TimeEntry>) => {
    const updated = await updateTimeEntry(id, data)
    setTimeEntries((prev) => prev.map((te) => (te.id === id ? { ...te, ...updated } : te)))
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
