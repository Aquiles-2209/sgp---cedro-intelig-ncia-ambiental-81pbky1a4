import React, { createContext, useContext, useState, useEffect } from 'react'
import { Project, Team } from '@/types/models'
import { mockProjects, mockTeams } from '@/lib/mock-data'
import { useToast } from '@/hooks/use-toast'

interface User {
  name: string
  email: string
  avatar: string
}

interface AppStateContextType {
  user: User | null
  projects: Project[]
  teams: Team[]
  login: (email: string) => void
  logout: () => void
  addProject: (project: Project) => void
  updateProject: (project: Project) => void
  addTeam: (team: Team) => void
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined)

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>(mockProjects)
  const [teams, setTeams] = useState<Team[]>(mockTeams)
  const { toast } = useToast()

  useEffect(() => {
    const storedUser = localStorage.getItem('app_user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])

  const login = (email: string) => {
    const newUser = {
      name: email
        .split('@')[0]
        .replace('.', ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      email,
      avatar: `https://img.usecurling.com/ppl/thumbnail?seed=${email.length}&gender=male`,
    }
    setUser(newUser)
    localStorage.setItem('app_user', JSON.stringify(newUser))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('app_user')
    toast({ title: 'Sessão encerrada' })
  }

  const addProject = (project: Project) => {
    setProjects((prev) => [project, ...prev])
    toast({
      title: 'Projeto cadastrado com sucesso!',
      className: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    })
  }

  const updateProject = (project: Project) => {
    setProjects((prev) => prev.map((p) => (p.id === project.id ? project : p)))
    toast({
      title: 'Projeto atualizado com sucesso!',
      className: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    })
  }

  const addTeam = (team: Team) => {
    setTeams((prev) => [...prev, team])
    toast({ title: 'Equipe adicionada com sucesso!' })
  }

  return (
    <AppStateContext.Provider
      value={{ user, projects, teams, login, logout, addProject, updateProject, addTeam }}
    >
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState() {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider')
  }
  return context
}
