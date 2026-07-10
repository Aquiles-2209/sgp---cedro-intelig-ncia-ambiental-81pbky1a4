import { useState } from 'react'
import { Plus, Users, Search, MoreHorizontal } from 'lucide-react'
import { useAppState } from '@/hooks/use-app-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export default function Teams() {
  const { teams, projects, addTeam } = useAppState()
  const [search, setSearch] = useState('')
  const [openNew, setOpenNew] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')

  // Determine availability
  const activeProjectIds = new Set(
    projects.filter((p) => p.status === 'Em Andamento').map((p) => p.id),
  )
  const activeTeamsSet = new Set(
    projects.filter((p) => activeProjectIds.has(p.id)).flatMap((p) => p.teamIds),
  )

  const filteredTeams = teams.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))

  const handleCreateTeam = () => {
    if (newTeamName.trim().length > 2) {
      addTeam({
        id: `t-${Date.now()}`,
        name: newTeamName,
        members: [], // Starts empty
      })
      setNewTeamName('')
      setOpenNew(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Equipes</h1>
          <p className="text-slate-500 mt-1">
            Gerencie os times e a capacidade produtiva da empresa.
          </p>
        </div>

        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Plus className="h-4 w-4 mr-2" /> Nova Equipe
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Nova Equipe</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Equipe</Label>
                <Input
                  id="name"
                  placeholder="Ex: Squad de Vendas"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenNew(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleCreateTeam}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md mb-6">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar equipe..."
          className="pl-9 bg-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTeams.map((team) => {
          const isOccupied = activeTeamsSet.has(team.id)

          return (
            <Card
              key={team.id}
              className="border-slate-200 shadow-sm overflow-hidden flex flex-col group"
            >
              <CardContent className="p-0 flex-1 flex flex-col">
                <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-white">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{team.name}</h3>
                    <p className="text-sm text-slate-500 mt-0.5 flex items-center">
                      <Users className="h-4 w-4 mr-1.5" /> {team.members.length} membros
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      isOccupied
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-none'
                        : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none'
                    }
                  >
                    {isOccupied ? 'Ocupada' : 'Disponível'}
                  </Badge>
                </div>

                <div className="p-5 flex-1 bg-slate-50/50">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Membros
                  </h4>
                  {team.members.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">Sem membros no momento.</p>
                  ) : (
                    <div className="space-y-3">
                      {team.members.map((member) => (
                        <div key={member.id} className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-white shadow-sm">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">
                              {member.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {member.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{member.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-white border-t border-slate-100 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-slate-500 hover:text-primary"
                  >
                    Gerenciar Membros
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {filteredTeams.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">
            Nenhuma equipe encontrada.
          </div>
        )}
      </div>
    </div>
  )
}
