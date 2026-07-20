import type { ReportRow } from '@/services/reports'
import { normalizeDate } from '@/types/models'
import { generateXlsx } from '@/lib/xlsx-generator'

function formatDateBR(dateStr: string): string {
  const normalized = normalizeDate(dateStr)
  if (!normalized) return ''
  const [year, month, day] = normalized.split('-')
  return `${day}/${month}/${year}`
}

export function exportExcelReport(rows: ReportRow[]): void {
  const headers = [
    'Cliente',
    'Projeto',
    'Setor',
    'Nome Equipe',
    'Tarefa',
    'Data',
    'Horas Previstas',
    'Horas Trabalhadas',
    'Saldo Horas',
  ]

  const xlsxRows = rows.map((row) => {
    const balance = Number((row.plannedHours - row.hoursWorked).toFixed(2))
    return [
      { type: 'string' as const, value: row.client },
      { type: 'string' as const, value: row.projectName },
      { type: 'string' as const, value: row.memberSector },
      { type: 'string' as const, value: row.memberName },
      { type: 'string' as const, value: row.activityTitle },
      { type: 'string' as const, value: formatDateBR(row.activityLaunchDate) },
      { type: 'number' as const, value: Number(row.plannedHours.toFixed(2)) },
      { type: 'number' as const, value: Number(row.hoursWorked.toFixed(2)) },
      {
        type: 'number' as const,
        value: balance,
        style: balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'normal',
      },
    ]
  })

  const blob = generateXlsx(headers, xlsxRows)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const timestamp = new Date().toISOString().split('T')[0]
  link.setAttribute('href', url)
  link.setAttribute('download', `relatorio_produtividade_${timestamp}.xlsx`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
