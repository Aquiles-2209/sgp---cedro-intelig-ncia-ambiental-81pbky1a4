import { useState, useEffect, useCallback } from 'react'
import { Users2, Mail, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getUsers, type SimpleUser } from '@/services/users'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { MemberDialog } from '@/components/member-dialog'

export default function Members() {
  const { isAuthenticated } = useAuth()
  const [members, setMembers] = useState<SimpleUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadMembers = useCallback(async () => {
    try {
      const data = await getUsers()
      setMembers(data)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadMembers()
    }
  }, [isAuthenticated, loadMembers])

  useRealtime(
    'users',
    () => {
      loadMembers()
    },
    isAuthenticated,
  )

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Membros</h1>
          <p className="text-slate-500 mt-1">Gerencie os membros da equipe.</p>
        </div>
        <MemberDialog onCreated={loadMembers} />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar por nome ou email..."
          className="pl-9 h-10 bg-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((member) => (
          <Card
            key={member.id}
            className="hover:shadow-md transition-all duration-300 hover:-translate-y-1"
          >
            <CardContent className="p-6 flex items-center gap-4">
              <Avatar className="h-12 w-12 border border-slate-200 shadow-sm">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback className="bg-primary text-white font-medium">
                  {member.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">{member.name}</h3>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 truncate">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {member.email}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && !loading && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
            <Users2 className="h-10 w-10 text-slate-300 mb-3" />
            <p>Nenhum membro encontrado.</p>
          </div>
        )}
      </div>
    </div>
  )
}
