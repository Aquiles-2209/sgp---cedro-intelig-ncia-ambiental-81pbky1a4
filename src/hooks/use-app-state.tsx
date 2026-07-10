import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Project, Allocation } from '@/types/models'
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
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'

interface AppStateContextType {
  projects: Project[]
  allocations: Allocation[]
  loading: boolean
  addProject: (data: Partial<Project>) => Promise<Project>
  editProject: (id: string, data: Partial<Project>) => Promise<void>
  addAllocation: (data: Partial<Allocation>) => Promise<void>
  editAllocation: (id: string, data: Partial<Allocation>) => Promise<void>
  removeAllocation: (id: string) => Promise<void>
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined)

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadData = useCallback(async () => {
    try {
      const [p, a] = await Promise.all([getProjects(), getAllocations()])
      setProjects(p)
      setAllocations(a)
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

  return (
    <AppStateContext.Provider
      value={{
        projects,
        allocations,
        loading,
        addProject,
        editProject,
        addAllocation,
        editAllocation,
        removeAllocation,
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
