import { Outlet } from 'react-router-dom'
import { Search, Bell } from 'lucide-react'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { useAppState } from '@/hooks/use-app-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'

export default function Layout() {
  const { user } = useAppState()

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
              <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border border-white"></span>
              </button>
              <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
                <div className="hidden flex-col items-end text-sm md:flex">
                  <span className="font-medium text-slate-900">{user?.name}</span>
                  <span className="text-xs text-slate-500">Administrador</span>
                </div>
                <Avatar className="h-9 w-9 border border-slate-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity">
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
