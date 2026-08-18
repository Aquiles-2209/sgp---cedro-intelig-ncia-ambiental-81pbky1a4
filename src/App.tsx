import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import { AppStateProvider } from '@/hooks/use-app-state'

import Layout from './components/Layout'
import { AuthGuard } from './components/auth-guard'
import { AdminRoute } from './components/admin-route'
import NotFound from './pages/NotFound'
import Login from './pages/Login'
import Home from './pages/Home'
import Projects from './pages/Projects'
import ProjectNew from './pages/ProjectNew'
import ProjectDetails from './pages/ProjectDetails'
import ProjectEdit from './pages/ProjectEdit'
import AllocationMap from './pages/AllocationMap'
import UsuariosCedro from './pages/UsuariosCedro'
import ReportPage from './pages/ReportPage'
import AuditLogs from './pages/AuditLogs'
import TotalHours from './pages/TotalHours'
import Settings from './pages/Settings'
import Importar from './pages/Importar'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Profile from './pages/Profile'

const App = () => (
  <AuthProvider>
    <AppStateProvider>
      <BrowserRouter>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/esqueci-senha" element={<ForgotPassword />} />
            <Route path="/resetar-senha" element={<ResetPassword />} />
            <Route
              element={
                <AuthGuard>
                  <Layout />
                </AuthGuard>
              }
            >
              <Route path="/" element={<Home />} />
              <Route path="/projetos" element={<Projects />} />
              <Route
                path="/projetos/novo"
                element={
                  <AdminRoute>
                    <ProjectNew />
                  </AdminRoute>
                }
              />
              <Route path="/projetos/:id" element={<ProjectDetails />} />
              <Route
                path="/projetos/:id/editar"
                element={
                  <AdminRoute>
                    <ProjectEdit />
                  </AdminRoute>
                }
              />
              <Route path="/allocation-map" element={<AllocationMap />} />
              <Route path="/usuarios-cedro" element={<UsuariosCedro />} />
              <Route
                path="/relatorios"
                element={
                  <AdminRoute>
                    <ReportPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/logs"
                element={
                  <AdminRoute>
                    <AuditLogs />
                  </AdminRoute>
                }
              />
              <Route
                path="/total-horas"
                element={
                  <AdminRoute>
                    <TotalHours />
                  </AdminRoute>
                }
              />
              <Route path="/configuracoes" element={<Settings />} />
              <Route path="/perfil" element={<Profile />} />
              <Route
                path="/importar"
                element={
                  <AdminRoute>
                    <Importar />
                  </AdminRoute>
                }
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </BrowserRouter>
    </AppStateProvider>
  </AuthProvider>
)

export default App
