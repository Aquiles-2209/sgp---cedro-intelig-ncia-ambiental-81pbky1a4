import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Project, Allocation, Task } from '@/types/models'
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
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'

interface AppStateContextType {
  projects: Project[]
  allocations: Allocation[]
  tasks: Task[]
  loading: boolean
  addProject: (data: Partial<Project>) => Promise<Project>
  editProject: (id: string, data: Partial<Project>) => Promise<void>
  addAllocation: (data: Partial<Allocation>) => Promise<void>
  editAllocation: (id: string, data: Partial<Allocation>) => Promise<void>
  removeAllocation: (id: string) => Promise<void>
  addTask: (data: Partial<Task>) => Promise<void>
  editTask: (id: string, data: Partial<Task>) => Promise<void>
  removeTask: (id: string) => Promise<void>
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined)

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadData = useCallback(async () => {
    try {
      const [p, a, t] = await Promise.all([getProjects(), getAllocations(), getTasks()])
      setProjects(p)
      setAllocations(a)
      setTasks(t)
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
      setLoading(false)
    }
  }, [isAuthenticated, loadData])

  useRealtime(
    'projects',
    () => {
      loadData()
    },
    isAuthenticated,
  )
  useRealtime(
    'allocations',
    () => {
      loadData()
    },
    isAuthenticated,
  )
  useRealtime(
    'tasks',
    () => {
      loadData()
    },
    isAuthenticated,
  )

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
    toast({ title: 'Membro alocado com sucesso!' })
  }
  const editAllocation = async (id: string, data: Partial<Allocation>) => {
    await svcUpdateAlloc(id, data)
  }
  const removeAllocation = async (id: string) => {
    await svcDeleteAlloc(id)
    toast({ title: 'Alocação removida.' })
  }
  const addTask = async (data: Partial<Task>) => {
    await svcCreateTask(data)
    toast({ title: 'Tarefa criada com sucesso!' })
  }
  const editTask = async (id: string, data: Partial<Task>) => {
    await svcUpdateTask(id, data)
  }
  const removeTask = async (id: string) => {
    await svcDeleteTask(id)
    toast({ title: 'Tarefa removida.' })
  }

  return (
    <AppStateContext.Provider
      value={{
        projects,
        allocations,
        tasks,
        loading,
        addProject,
        editProject,
        addAllocation,
        editAllocation,
        removeAllocation,
        addTask,
        editTask,
        removeTask,
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
