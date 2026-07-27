export interface XlsxWorkbookData {
  sheets: Map<string, string[][]>
  sheetNames: string[]
}

function colLetterToIndex(letters: string): number {
  let result = 0
  for (let i = 0; i < letters.length; i++) {
    result = result * 26 + (letters.charCodeAt(i) - 64)
  }
  return result
}

function stripNs(xml: string): string {
  return xml.replace(/xmlns="[^"]*"/g, '')
}

function parseSharedStrings(xml: string): string[] {
  const doc = new DOMParser().parseFromString(stripNs(xml), 'text/xml')
  const sis = doc.getElementsByTagName('si')
  const result: string[] = []
  for (let i = 0; i < sis.length; i++) {
    const ts = sis[i].getElementsByTagName('t')
    let text = ''
    for (let j = 0; j < ts.length; j++) text += ts[j].textContent || ''
    result.push(text)
  }
  return result
}

function parseWorkbook(xml: string): Array<{ name: string; rId: string }> {
  const doc = new DOMParser().parseFromString(stripNs(xml), 'text/xml')
  const sheets = doc.getElementsByTagName('sheet')
  const result: Array<{ name: string; rId: string }> = []
  for (let i = 0; i < sheets.length; i++) {
    result.push({
      name: sheets[i].getAttribute('name') || '',
      rId: sheets[i].getAttribute('r:id') || '',
    })
  }
  return result
}

function parseRels(xml: string): Map<string, string> {
  const doc = new DOMParser().parseFromString(stripNs(xml), 'text/xml')
  const rels = doc.getElementsByTagName('Relationship')
  const result = new Map<string, string>()
  for (let i = 0; i < rels.length; i++) {
    result.set(rels[i].getAttribute('Id') || '', rels[i].getAttribute('Target') || '')
  }
  return result
}

function parseSheet(xml: string, sharedStrings: string[]): string[][] {
  const doc = new DOMParser().parseFromString(stripNs(xml), 'text/xml')
  const rows = doc.getElementsByTagName('row')
  const rowData: string[][] = []
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].getElementsByTagName('c')
    const cellMap = new Map<number, string>()
    let maxCol = 0
    for (let j = 0; j < cells.length; j++) {
      const ref = cells[j].getAttribute('r') || ''
      const type = cells[j].getAttribute('t') || ''
      const match = ref.match(/([A-Z]+)(\d+)/)
      if (!match) continue
      const col = colLetterToIndex(match[1])
      maxCol = Math.max(maxCol, col)
      let value = ''
      if (type === 's') {
        const v = cells[j].getElementsByTagName('v')[0]
        if (v && v.textContent) value = sharedStrings[parseInt(v.textContent, 10)] || ''
      } else if (type === 'inlineStr') {
        const t = cells[j].getElementsByTagName('t')[0]
        if (t) value = t.textContent || ''
      } else {
        const v = cells[j].getElementsByTagName('v')[0]
        if (v) value = v.textContent || ''
      }
      cellMap.set(col, value)
    }
    const row: string[] = []
    for (let c = 1; c <= maxCol; c++) row.push(cellMap.get(c) || '')
    rowData.push(row)
  }
  return rowData
}

async function readZip(data: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const view = new DataView(data)
  const entries = new Map<string, Uint8Array>()
  let eocdOffset = -1
  const minOffset = Math.max(0, data.byteLength - 65557)
  for (let i = data.byteLength - 22; i >= minOffset; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i
      break
    }
  }
  if (eocdOffset === -1) throw new Error('ZIP inválido')
  const count = view.getUint16(eocdOffset + 10, true)
  const cdOffset = view.getUint32(eocdOffset + 16, true)
  let offset = cdOffset
  for (let i = 0; i < count; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) break
    const method = view.getUint16(offset + 10, true)
    const compSize = view.getUint32(offset + 20, true)
    const nameLen = view.getUint16(offset + 28, true)
    const extraLen = view.getUint16(offset + 30, true)
    const commentLen = view.getUint16(offset + 32, true)
    const localOffset = view.getUint32(offset + 42, true)
    const fileName = new TextDecoder().decode(new Uint8Array(data, offset + 46, nameLen))
    const localNameLen = view.getUint16(localOffset + 26, true)
    const localExtraLen = view.getUint16(localOffset + 28, true)
    const dataStart = localOffset + 30 + localNameLen + localExtraLen
    const compData = new Uint8Array(data, dataStart, compSize)
    if (method === 0) {
      entries.set(fileName, compData)
    } else if (method === 8) {
      const ds = new DecompressionStream('deflate-raw')
      const stream = new Blob([compData]).stream().pipeThrough(ds)
      const dec = await new Response(stream).arrayBuffer()
      entries.set(fileName, new Uint8Array(dec))
    }
    offset += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

export async function readXlsx(file: File): Promise<XlsxWorkbookData> {
  const buffer = await file.arrayBuffer()
  const entries = await readZip(buffer)
  const sharedStrings: string[] = []
  const ssEntry = entries.get('xl/sharedStrings.xml')
  if (ssEntry) sharedStrings.push(...parseSharedStrings(new TextDecoder().decode(ssEntry)))
  const wbEntry = entries.get('xl/workbook.xml')
  if (!wbEntry) throw new Error('Arquivo xlsx inválido')
  const sheetDefs = parseWorkbook(new TextDecoder().decode(wbEntry))
  const relsEntry = entries.get('xl/_rels/workbook.xml.rels')
  if (!relsEntry) throw new Error('Arquivo xlsx inválido')
  const rels = parseRels(new TextDecoder().decode(relsEntry))
  const sheets = new Map<string, string[][]>()
  const sheetNames: string[] = []
  for (const def of sheetDefs) {
    const target = rels.get(def.rId)
    if (!target) continue
    const path = target.startsWith('/') ? target.slice(1) : `xl/${target}`
    const sheetEntry = entries.get(path)
    if (!sheetEntry) continue
    sheets.set(def.name, parseSheet(new TextDecoder().decode(sheetEntry), sharedStrings))
    sheetNames.push(def.name)
  }
  return { sheets, sheetNames }
}
