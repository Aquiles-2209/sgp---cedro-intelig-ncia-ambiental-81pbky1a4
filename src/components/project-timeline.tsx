import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ProjectTeam } from '@/types/models'
import { Card, CardContent } from '@/components/ui/card'

interface ProjectTimelineProps {
  teams: ProjectTeam[]
  projectStart: string
  projectEnd: string
}

export function ProjectTimeline({ teams, projectStart, projectEnd }: ProjectTimelineProps) {
  const start = new Date(projectStart + 'T00:00:00')
  const end = new Date(projectEnd + 'T00:00:00')
  const totalDays = differenceInDays(end, start) || 1

  const allMembers = teams.flatMap((team) =>
    team.members.map((m) => ({ ...m, teamName: team.name })),
  )

  if (allMembers.length === 0) return null

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-6">
        <h3 className="font-semibold text-lg text-slate-800 mb-4">Cronograma de Atividades</h3>
        <div className="space-y-3">
          {allMembers.map((member) => {
            const mStart = new Date(member.startDate + 'T00:00:00')
            const mEnd = new Date(member.endDate + 'T00:00:00')
            const leftOffset = Math.max(
              0,
              Math.min(100, (differenceInDays(mStart, start) / totalDays) * 100),
            )
            const width = Math.max(
              3,
              Math.min(100 - leftOffset, (differenceInDays(mEnd, mStart) / totalDays) * 100),
            )

            return (
              <div key={member.id} className="flex items-center gap-3">
                <div className="w-40 shrink-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {member.name || 'Sem nome'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{member.role || '—'}</p>
                </div>
                <div className="flex-1 relative h-8 bg-slate-100 rounded">
                  <div
                    className="absolute h-8 rounded bg-primary/80 flex items-center px-2 overflow-hidden"
                    style={{ left: `${leftOffset}%`, width: `${width}%` }}
                  >
                    <span className="text-[10px] text-white font-medium truncate whitespace-nowrap">
                      {format(mStart, 'dd/MM', { locale: ptBR })} —{' '}
                      {format(mEnd, 'dd/MM', { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
