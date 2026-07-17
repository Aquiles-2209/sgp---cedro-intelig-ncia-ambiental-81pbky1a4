import type { ReportRow } from '@/services/reports'

function escapeCsv(value: string): string {
  if (!value) return ''
  const needsQuotes = value.includes(',') || value.includes('"') || value.includes('\n')
  const escaped = value.replace(/"/g, '""')
  return needsQuotes ? `"${escaped}"` : escaped
}

export function exportExcelReport(rows: ReportRow[]): void {
  const headers = [
    'Nome do Cliente',
    'Nome do Projeto',
    'Setor do membro',
    'Nome do membro da equipe',
    'Data de finalização da atividade',
    'Total de horas trabalhadas no período selecionado',
  ]

  const lines: string[] = [headers.map(escapeCsv).join(',')]

  for (const row of rows) {
    lines.push(
      [
        escapeCsv(row.client),
        escapeCsv(row.projectName),
        escapeCsv(row.memberSector),
        escapeCsv(row.memberName),
        escapeCsv(row.completionDate),
        row.hoursWorked.toFixed(2),
      ].join(','),
    )
  }

  const csvContent = '\uFEFF' + lines.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const timestamp = new Date().toISOString().split('T')[0]
  link.setAttribute('href', url)
  link.setAttribute('download', `relatorio_produtividade_${timestamp}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
