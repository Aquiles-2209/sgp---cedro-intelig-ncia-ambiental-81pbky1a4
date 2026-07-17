import type { ReportRow } from '@/services/reports'

function escapeXml(value: string): string {
  if (!value) return ''
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
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

  const xmlParts: string[] = []

  xmlParts.push(
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:o="urn:schemas-microsoft-com:office:office"',
    ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    '<Styles>',
    '<Style ss:ID="Header">',
    ' <Font ss:Bold="1" ss:Size="11"/>',
    ' <Interior ss:Color="#E0E7FF" ss:Pattern="Solid"/>',
    ' <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>',
    '</Style>',
    '<Style ss:ID="Number">',
    ' <NumberFormat ss:Format="0.00"/>',
    '</Style>',
    '</Styles>',
    '<Worksheet ss:Name="Relatório">',
    '<Table>',
  )

  xmlParts.push('<Row>')
  for (const header of headers) {
    xmlParts.push(
      `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`,
    )
  }
  xmlParts.push('</Row>')

  for (const row of rows) {
    xmlParts.push('<Row>')
    xmlParts.push(`<Cell><Data ss:Type="String">${escapeXml(row.client)}</Data></Cell>`)
    xmlParts.push(`<Cell><Data ss:Type="String">${escapeXml(row.projectName)}</Data></Cell>`)
    xmlParts.push(`<Cell><Data ss:Type="String">${escapeXml(row.memberSector)}</Data></Cell>`)
    xmlParts.push(`<Cell><Data ss:Type="String">${escapeXml(row.memberName)}</Data></Cell>`)
    xmlParts.push(`<Cell><Data ss:Type="String">${escapeXml(row.completionDate)}</Data></Cell>`)
    xmlParts.push(
      `<Cell ss:StyleID="Number"><Data ss:Type="Number">${row.hoursWorked.toFixed(2)}</Data></Cell>`,
    )
    xmlParts.push('</Row>')
  }

  xmlParts.push('</Table>', '</Worksheet>', '</Workbook>')

  const xmlContent = xmlParts.join('\n')
  const blob = new Blob([xmlContent], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const timestamp = new Date().toISOString().split('T')[0]
  link.setAttribute('href', url)
  link.setAttribute('download', `relatorio_produtividade_${timestamp}.xls`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
