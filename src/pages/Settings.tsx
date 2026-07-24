import { useState, useEffect, useCallback } from 'react'
import {
  Settings as SettingsIcon,
  Users2,
  ShieldCheck,
  Mail,
  Loader2,
  Trash2,
  Search,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'
import { getUsers, updateUserRole, getUserLastActivity, type SimpleUser } from '@/services/users'
import { InviteUserDialog } from '@/components/invite-user-dialog'
import { UserDeleteDialog } from '@/components/user-delete-dialog'
import { useRealtime } from '@/hooks/use-realtime'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'

function formatLastActivity(dateStr: string | undefined): string {
  if (!dateStr) return 'Sem atividade'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 'Sem atividade'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Settings() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [users, setUsers] = useState<SimpleUser[]>([])
  const [lastActivity, setLastActivity] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const { toast } = useToast()

  const loadData = useCallback(async () => {
    try {
      const [userData, activityData] = await Promise.all([getUsers(), getUserLastActivity()])
      setUsers(userData)
      setLastActivity(activityData)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('users', () => loadData())
  useRealtime('time_entries', () => loadData())

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    setUpdatingRole(userId)
    try {
      await updateUserRole(userId, newRole)
      toast({ title: 'Função atualizada com sucesso!' })
      await loadData()
    } catch (err) {
      toast({
        title: 'Erro ao atualizar função',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setUpdatingRole(null)
    }
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6 animate-fade-in-up max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-primary" /> Configurações
        </h1>
        <p className="text-slate-500 mt-1">Gerencie usuários e configurações do sistema.</p>
      </div>

      {isAdmin && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users2 className="h-5 w-5 text-slate-500" /> Gerenciamento de Usuários
                </CardTitle>
                <CardDescription>
                  Convide novos usuários e visualize Usuários CEDRO cadastrados.
                </CardDescription>
              </div>
              <InviteUserDialog onInvited={loadData} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative max-w-md mb-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                className="pl-9 h-10 bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((u) => {
                  const isSelf = u.id === user?.id
                  return (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <Avatar className="h-9 w-9 border border-slate-200 shrink-0">
                        <AvatarImage src={u.avatar} alt={u.name} />
                        <AvatarFallback className="bg-primary text-white text-sm">
                          {u.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 truncate">
                          {u.name}
                          {isSelf && (
                            <Badge variant="secondary" className="text-xs ml-2">
                              Você
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {u.email}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Última atividade: {formatLastActivity(lastActivity[u.id])}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          value={u.role}
                          onValueChange={(v) => handleRoleChange(u.id, v as 'admin' | 'user')}
                          disabled={isSelf || updatingRole === u.id}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            {updatingRole === u.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <SelectValue />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="user">Usuário</SelectItem>
                          </SelectContent>
                        </Select>
                        <UserDeleteDialog
                          user={u}
                          onDeleted={loadData}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={isSelf}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  )
                })}
                {filtered.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-6">
                    Nenhum usuário encontrado.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-slate-500" /> Sua Conta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border border-slate-200">
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback className="bg-primary text-white">
                {user?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-slate-900">{user?.name}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <Badge variant="outline" className="mt-1 text-xs">
                {isAdmin ? 'Administrador' : 'Usuário'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
