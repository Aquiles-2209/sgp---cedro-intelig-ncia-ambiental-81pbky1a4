import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import { AppStateProvider } from '@/hooks/use-app-state'

import Layout from './components/Layout'
import { AuthGuard } from './components/auth-guard'
import NotFound from './pages/NotFound'
import Login from './pages/Login'
import Dashboard from './pages/Index'
import Projects from './pages/Projects'
import ProjectNew from './pages/ProjectNew'
import ProjectDetails from './pages/ProjectDetails'
import ProjectEdit from './pages/ProjectEdit'
import AllocationMap from './pages/AllocationMap'
import Members from './pages/Members'

const App = () => (
  <AuthProvider>
    <AppStateProvider>
      <BrowserRouter>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <AuthGuard>
                  <Layout />
                </AuthGuard>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/projetos" element={<Projects />} />
              <Route path="/projetos/novo" element={<ProjectNew />} />
              <Route path="/projetos/:id" element={<ProjectDetails />} />
              <Route path="/projetos/:id/editar" element={<ProjectEdit />} />
              <Route path="/allocation-map" element={<AllocationMap />} />
              <Route path="/membros" element={<Members />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </BrowserRouter>
    </AppStateProvider>
  </AuthProvider>
)

export default App
