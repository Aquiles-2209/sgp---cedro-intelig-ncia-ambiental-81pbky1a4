import { useState, useEffect, useCallback } from 'react'
import { ScrollText, ShieldCheck, Trash2, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getAuditLogs, resolveAuditUser, type AuditLog } from '@/services/audit-logs'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'

export default function AuditLogs() {
  const { isAuthenticated } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  const loadLogs = useCallback(async () => {
    try {
      const data = await getAuditLogs()
      setLogs(data)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) loadLogs()
  }, [isAuthenticated, loadLogs])

  useRealtime('audit_logs', () => loadLogs(), isAuthenticated)

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <ScrollText className="h-8 w-8 text-primary" /> Logs de Auditoria
        </h1>
        <p className="text-slate-500 mt-1">
          Registro de ações de criação e exclusão no sistema. Exibe o nome do usuário que realizou
          cada ação.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <ShieldCheck className="h-10 w-10 text-slate-300 mb-3" />
              <p>Nenhum registro de auditoria encontrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário(a)</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Tipo de Recurso</TableHead>
                  <TableHead>Nome do Recurso</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{resolveAuditUser(log)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          log.action === 'CREATE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }
                      >
                        {log.action === 'CREATE' ? (
                          <Plus className="h-3 w-3 mr-1" />
                        ) : (
                          <Trash2 className="h-3 w-3 mr-1" />
                        )}
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.resource_type}</TableCell>
                    <TableCell>{log.resource_name}</TableCell>
                    <TableCell className="text-slate-500">{formatDate(log.created)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
