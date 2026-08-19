import { Outlet, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { NotificationBell } from '@/components/notification-bell'
import { useAuth } from '@/hooks/use-auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { HelpDrawer } from '@/components/help-drawer'

export default function Layout() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50 text-slate-900 font-sans">
        <AppSidebar />
        <div className="flex flex-1 flex-col w-full overflow-hidden">
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md md:px-8">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-slate-500 hover:text-primary" />
              <div className="hidden md:flex relative max-w-md w-full ml-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Buscar projetos, contratos..."
                  className="w-full bg-slate-100/50 pl-9 border-none focus-visible:ring-1 focus-visible:ring-primary h-9 rounded-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <HelpDrawer />
              <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
                <div className="hidden flex-col items-end text-sm md:flex">
                  <span className="font-medium text-slate-900">{user?.name}</span>
                  <span className="text-xs text-slate-500">
                    {user?.role === 'master'
                      ? 'Master'
                      : user?.role === 'admin'
                        ? 'Administrador'
                        : 'Usuário(a) CEDRO'}
                  </span>
                </div>
                <Avatar
                  className="h-9 w-9 border border-slate-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => navigate('/perfil')}
                >
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="bg-primary text-white font-medium">
                    {user?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in-up">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
