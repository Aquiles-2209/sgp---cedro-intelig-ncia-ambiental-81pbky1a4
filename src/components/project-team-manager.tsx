import { ProjectTeam, ProjectMember } from '@/types/models'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/date-picker'
import { Plus, Trash2, Users } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ProjectTeamManagerProps {
  teams: ProjectTeam[]
  onAddTeam: () => void
  onUpdateTeamName: (teamId: string, name: string) => void
  onRemoveTeam: (teamId: string) => void
  onAddMember: (teamId: string) => void
  onUpdateMember: (
    teamId: string,
    memberId: string,
    field: keyof ProjectMember,
    value: string,
  ) => void
  onRemoveMember: (teamId: string, memberId: string) => void
}

export function ProjectTeamManager({
  teams,
  onAddTeam,
  onUpdateTeamName,
  onRemoveTeam,
  onAddMember,
  onUpdateMember,
  onRemoveMember,
}: ProjectTeamManagerProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
        <h3 className="font-semibold text-lg text-slate-800">Equipes e Alocações</h3>
        <Button type="button" variant="outline" size="sm" onClick={onAddTeam}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar Equipe
        </Button>
      </div>

      {teams.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">
          Nenhuma equipe adicionada. Clique em "Adicionar Equipe" para começar.
        </p>
      )}

      {teams.map((team) => (
        <div key={team.id} className="border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Users className="h-4 w-4 text-slate-400 shrink-0" />
            <Input
              placeholder="Nome da Equipe (ex: Meio Ambiente)"
              value={team.name}
              onChange={(e) => onUpdateTeamName(team.id, e.target.value)}
              className="flex-1"
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveTeam(team.id)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>

          {team.members.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead className="w-36">Início</TableHead>
                  <TableHead className="w-36">Término</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Input
                        value={member.name}
                        onChange={(e) => onUpdateMember(team.id, member.id, 'name', e.target.value)}
                        className="h-9"
                        placeholder="Nome completo"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={member.role}
                        onChange={(e) => onUpdateMember(team.id, member.id, 'role', e.target.value)}
                        className="h-9"
                        placeholder="Ex: Engenheiro"
                      />
                    </TableCell>
                    <TableCell>
                      <DatePicker
                        value={member.startDate}
                        onChange={(v) => onUpdateMember(team.id, member.id, 'startDate', v)}
                        compact
                      />
                    </TableCell>
                    <TableCell>
                      <DatePicker
                        value={member.endDate}
                        onChange={(v) => onUpdateMember(team.id, member.id, 'endDate', v)}
                        compact
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveMember(team.id, member.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Button type="button" variant="outline" size="sm" onClick={() => onAddMember(team.id)}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar Membro
          </Button>
        </div>
      ))}
    </div>
  )
}
