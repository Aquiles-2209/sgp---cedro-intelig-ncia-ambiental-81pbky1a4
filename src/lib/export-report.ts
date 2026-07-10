import { Project, Allocation, Task, normalizeDate } from '@/types/models'

function escapeCsv(value: string): string {
  if (!value) return ''
  const needsQuotes = value.includes(',') || value.includes('"') || value.includes('\n')
  const escaped = value.replace(/"/g, '""')
  return needsQuotes ? `"${escaped}"` : escaped
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(normalizeDate(dateStr) + 'T00:00:00').toLocaleDateString('pt-BR')
}

export function exportProjectReport(
  project: Project,
  allocations: Allocation[],
  tasks: Task[],
): void {
  const lines: string[] = []

  lines.push('RELATORIO DE PROJETO')
  lines.push('')
  lines.push('Dados do Projeto')
  lines.push('Nome,Cliente,Contrato,Status,Data de Inicio,Data de Termino')
  lines.push(
    [
      escapeCsv(project.name),
      escapeCsv(project.client),
      escapeCsv(project.contract_id),
      escapeCsv(project.status),
      formatDate(project.start_date),
      formatDate(project.end_date),
    ].join(','),
  )
  lines.push('')

  lines.push('Membros Alocados')
  lines.push('Nome,Funcao,Data de Inicio,Data de Termino')
  for (const a of allocations) {
    lines.push(
      [
        escapeCsv(a.member_name),
        escapeCsv(a.function),
        formatDate(a.start_date),
        formatDate(a.end_date),
      ].join(','),
    )
  }
  lines.push('')

  lines.push('Tarefas do Projeto')
  lines.push('Titulo,Descricao,Membro,Status,Prazo')
  for (const t of tasks) {
    const memberName = t.expand?.allocation?.member_name || ''
    lines.push(
      [
        escapeCsv(t.title),
        escapeCsv(t.description),
        escapeCsv(memberName),
        escapeCsv(t.status),
        formatDate(t.due_date),
      ].join(','),
    )
  }

  const csvContent = '\uFEFF' + lines.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const safeName = project.name.replace(/[^a-zA-Z0-9]/g, '_')
  link.setAttribute('href', url)
  link.setAttribute('download', `relatorio_${safeName}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
