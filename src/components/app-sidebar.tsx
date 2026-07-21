import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Briefcase,
  CalendarRange,
  Settings,
  LogOut,
  Users2,
  FileBarChart,
  ScrollText,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/use-auth'

const adminNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Projetos', href: '/projetos', icon: Briefcase },
  { name: 'Membros', href: '/membros', icon: Users2 },
  { name: 'Mapa de Alocação', href: '/allocation-map', icon: CalendarRange },
  { name: 'Relatórios', href: '/relatorios', icon: FileBarChart },
  { name: 'Logs', href: '/logs', icon: ScrollText },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
]

const userNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Meus Projetos', href: '/projetos', icon: Briefcase },
  { name: 'Mapa de Alocação', href: '/allocation-map', icon: CalendarRange },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
]

export function AppSidebar() {
  const location = useLocation()
  const { signOut, user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const navigation = isAdmin ? adminNavigation : userNavigation

  return (
    <Sidebar className="border-r border-slate-200 bg-white">
      <SidebarHeader className="p-4 pt-6">
        <div className="flex items-center gap-2 px-2 text-primary">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <Briefcase className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">GestãoPro</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-2">
              {navigation.map((item) => {
                const isActive =
                  location.pathname === item.href ||
                  (item.href !== '/' && location.pathname.startsWith(item.href))
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.name}
                      className={`transition-colors hover:bg-slate-100 ${isActive ? 'bg-slate-100 font-medium text-primary' : 'text-slate-600'}`}
                    >
                      <Link to={item.href} className="flex items-center gap-3 px-3 py-2">
                        <item.icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              className="text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Sair da conta</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
