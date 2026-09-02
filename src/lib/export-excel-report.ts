import type { ReportRow } from '@/services/reports'
import { normalizeDate } from '@/types/models'
import { generateXlsx } from '@/lib/xlsx-generator'
import { formatarMoedaBRL, calcularCustoHoraUnitario } from '@/lib/custo-hora'

function formatDateBR(dateStr: string): string {
  const normalized = normalizeDate(dateStr)
  if (!normalized) return ''
  const [year, month, day] = normalized.split('-')
  return `${day}/${month}/${year}`
}

function formatDateTimeBR(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Exporta o relatório de produtividade em Excel (Colunas A–L).
 *
 * `incluirCustoHora`: quando FALSE (padrão), a exportação contém SOMENTE
 * as colunas até a L — nenhum dado financeiro (Valor Mensal / Custo Hora
 * Unitário) é incluído, mesmo que os dados estejam presentes na memória.
 * Apenas o usuário autorizado pelo backend recebe `true` — para qualquer
 * outro usuário o arquivo nunca contém a Coluna M.
 */
export function exportExcelReport(rows: ReportRow[], incluirCustoHora = false): void {
  const headers = [
    'Cliente',
    'Projeto',
    'Setor',
    'Nome Equipe',
    'Tarefa',
    'Data',
    'Data de Lançamento',
    'Horas Previstas',
    'Horas Importadas',
    'Horas Trabalhadas (Timer)',
    'Total Horas',
    'Saldo Horas',
  ]

  if (incluirCustoHora) {
    headers.push('Custo Hora Unitário')
  }

  const sortedRows = [...rows].sort((a, b) => {
    const dateA = a.launchDate || a.activityLaunchDate || ''
    const dateB = b.launchDate || b.activityLaunchDate || ''
    return dateA.localeCompare(dateB)
  })

  const xlsxRows = sortedRows.map((row, idx) => {
    const totalHours = Number((row.allocatedHours + row.hoursWorked).toFixed(2))
    const balance = Number((row.plannedHours - totalHours).toFixed(2))
    const showTask = idx === 0 || sortedRows[idx - 1].activityTitle !== row.activityTitle
    const cells = [
      { type: 'string' as const, value: row.client },
      { type: 'string' as const, value: row.projectName },
      { type: 'string' as const, value: row.memberSector },
      { type: 'string' as const, value: row.memberName },
      { type: 'string' as const, value: showTask ? row.activityTitle : '' },
      { type: 'string' as const, value: formatDateBR(row.activityLaunchDate) },
      { type: 'string' as const, value: formatDateTimeBR(row.launchDate) },
      { type: 'number' as const, value: Number(row.plannedHours.toFixed(2)) },
      { type: 'number' as const, value: Number(row.allocatedHours.toFixed(2)) },
      { type: 'number' as const, value: Number(row.hoursWorked.toFixed(2)) },
      { type: 'number' as const, value: totalHours },
      {
        type: 'number' as const,
        value: balance,
        style:
          balance > 0
            ? ('positive' as const)
            : balance < 0
              ? ('negative' as const)
              : ('normal' as const),
      },
    ]

    if (incluirCustoHora) {
      // Sem divisão por zero: Total de Horas = 0 ou vazio → "N/A".
      cells.push({
        type: 'string' as const,
        value:
          totalHours > 0
            ? formatarMoedaBRL(calcularCustoHoraUnitario(row.monthlyValue ?? 0, totalHours))
            : 'N/A',
      })
    }

    return cells
  })

  const totalPlanned = rows.reduce((sum, r) => sum + r.plannedHours, 0)
  const totalAllocated = rows.reduce((sum, r) => sum + r.allocatedHours, 0)
  const totalWorked = rows.reduce((sum, r) => sum + r.hoursWorked, 0)
  const totalTotal = Number((totalAllocated + totalWorked).toFixed(2))
  const totalBalance = Number((totalPlanned - totalTotal).toFixed(2))

  const totalRow: (typeof xlsxRows)[number] = [
    { type: 'string' as const, value: '' },
    { type: 'string' as const, value: '' },
    { type: 'string' as const, value: '' },
    { type: 'string' as const, value: '' },
    { type: 'string' as const, value: 'TOTAL GERAL' },
    { type: 'string' as const, value: '' },
    { type: 'string' as const, value: '' },
    { type: 'number' as const, value: Number(totalPlanned.toFixed(2)) },
    { type: 'number' as const, value: Number(totalAllocated.toFixed(2)) },
    { type: 'number' as const, value: Number(totalWorked.toFixed(2)) },
    { type: 'number' as const, value: totalTotal },
    {
      type: 'number' as const,
      value: totalBalance,
      style:
        totalBalance > 0
          ? ('positive' as const)
          : totalBalance < 0
            ? ('negative' as const)
            : ('normal' as const),
    },
  ]

  if (incluirCustoHora) {
    totalRow.push({ type: 'string' as const, value: '' })
  }

  xlsxRows.push(totalRow)

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
