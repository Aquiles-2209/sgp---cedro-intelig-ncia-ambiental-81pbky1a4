const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
})()

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (const b of data) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function str(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function colLetter(col: number): string {
  let r = ''
  let c = col
  while (c > 0) {
    r = String.fromCharCode(65 + ((c - 1) % 26)) + r
    c = Math.floor((c - 1) / 26)
  }
  return r
}

interface SheetSpec {
  name: string
  headers: string[]
  example: string[]
}

function buildSheetXml(headers: string[], example?: string[]): string {
  let xml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
  xml += `<row r="1">`
  headers.forEach((h, i) => {
    xml += `<c r="${colLetter(i + 1)}1" t="inlineStr" s="1"><is><t>${esc(h)}</t></is></c>`
  })
  xml += '</row>'
  if (example) {
    xml += `<row r="2">`
    example.forEach((v, i) => {
      xml += `<c r="${colLetter(i + 1)}2" t="inlineStr"><is><t>${esc(v)}</t></is></c>`
    })
    xml += '</row>'
  }
  return xml + '</sheetData></worksheet>'
}

function createZip(files: { name: string; data: Uint8Array }[]): Blob {
  const parts: Uint8Array[] = []
  const centralDir: Uint8Array[] = []
  let offset = 0
  for (const f of files) {
    const nameBytes = str(f.name)
    const c = crc32(f.data)
    const size = f.data.length
    const lh = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(lh.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(8, 0, true)
    lv.setUint16(12, 0x0021, true)
    lv.setUint32(14, c, true)
    lv.setUint32(18, size, true)
    lv.setUint32(22, size, true)
    lv.setUint16(26, nameBytes.length, true)
    lh.set(nameBytes, 30)
    parts.push(lh, f.data)
    const entryOffset = offset
    offset += lh.length + size
    const ch = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(ch.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(12, 0x0021, true)
    cv.setUint32(16, c, true)
    cv.setUint32(20, size, true)
    cv.setUint32(24, size, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint32(42, entryOffset, true)
    ch.set(nameBytes, 46)
    centralDir.push(ch)
  }
  let centralSize = 0
  for (const c of centralDir) centralSize += c.length
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  return new Blob([...parts, ...centralDir, eocd], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function downloadImportTemplate(): void {
  const sheets: SheetSpec[] = [
    {
      name: 'Projetos',
      headers: [
        'Nome do Projeto',
        'Cliente',
        'Número do Contrato',
        'Status',
        'Setor',
        'Data de Início',
        'Data de Término',
        'Descrição e Objetivos',
      ],
      example: [
        'Projeto Exemplo',
        'Cliente Exemplo',
        'CTR-001',
        'Planejado',
        'Infraestrutura',
        '01/01/2024',
        '31/12/2024',
        'Descrição do projeto',
      ],
    },
    {
      name: 'Usuários CEDRO',
      headers: ['Nome', 'Email', 'Função', 'Setor', 'Usuário (role)'],
      example: ['João Silva', 'joao@exemplo.com', 'Engenheiro', 'Administrativo', 'user'],
    },
    {
      name: 'Tarefas',
      headers: [
        'Projeto',
        'Título',
        'Descrição',
        'Usuários CEDRO da Equipe',
        'Data de Início',
        'Data de Finalização',
        'Horas Previstas',
        'Horas Alocadas',
        'Status',
      ],
      example: [
        'Projeto Exemplo',
        'Tarefa Exemplo',
        'Descrição da tarefa',
        'João Silva; Maria Santos',
        '01/01/2024',
        '15/01/2024',
        '8.5',
        '6.0',
        'Pendente',
      ],
    },
  ]
  const files: { name: string; data: Uint8Array }[] = []
  let ct =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
  let wbSheets = ''
  let wbRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  const stylesXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE0E7FF"/></fill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf></cellXfs></styleSheet>'
  sheets.forEach((s, idx) => {
    const n = idx + 1
    ct += `<Override PartName="/xl/worksheets/sheet${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    wbSheets += `<sheet name="${esc(s.name)}" sheetId="${n}" r:id="rId${n}"/>`
    wbRels += `<Relationship Id="rId${n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${n}.xml"/>`
    files.push({
      name: `xl/worksheets/sheet${n}.xml`,
      data: str(buildSheetXml(s.headers, s.example)),
    })
  })
  ct += `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`
  wbRels += `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
  const wbXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${wbSheets}</sheets></workbook>`
  files.unshift(
    { name: '[Content_Types].xml', data: str(ct) },
    {
      name: '_rels/.rels',
      data: str(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      ),
    },
    { name: 'xl/workbook.xml', data: str(wbXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: str(wbRels) },
    { name: 'xl/styles.xml', data: str(stylesXml) },
  )
  const blob = createZip(files)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', 'template_importacao.xlsx')
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
