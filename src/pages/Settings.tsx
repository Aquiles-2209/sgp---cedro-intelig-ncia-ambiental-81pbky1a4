import { useState, useEffect, useCallback } from 'react'
import { Settings as SettingsIcon, Users2, ShieldCheck, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth'
import { getUsers, type SimpleUser } from '@/services/users'
import { InviteUserDialog } from '@/components/invite-user-dialog'

export default function Settings() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [users, setUsers] = useState<SimpleUser[]>([])
  const [loading, setLoading] = useState(true)

  const loadUsers = useCallback(async () => {
    try {
      const data = await getUsers()
      setUsers(data)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users2 className="h-5 w-5 text-slate-500" /> Gerenciamento de Usuários
                </CardTitle>
                <CardDescription>
                  Convide novos usuários e visualize membros cadastrados.
                </CardDescription>
              </div>
              <InviteUserDialog onInvited={loadUsers} />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <Avatar className="h-9 w-9 border border-slate-200">
                      <AvatarImage src={u.avatar} alt={u.name} />
                      <AvatarFallback className="bg-primary text-white text-sm">
                        {u.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">{u.name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {u.email}
                      </p>
                    </div>
                    {u.id === user?.id && (
                      <Badge variant="secondary" className="text-xs">
                        Você
                      </Badge>
                    )}
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-6">
                    Nenhum usuário cadastrado.
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
