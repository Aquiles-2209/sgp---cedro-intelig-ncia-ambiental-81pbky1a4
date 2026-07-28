export interface SheetData {
  name: string
  headers: string[]
  rows: (string | number)[][]
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw')
  const stream = new Blob([data]).stream().pipeThrough(ds)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function readZip(file: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const view = new DataView(file)
  const bytes = new Uint8Array(file)
  const entries = new Map<string, Uint8Array>()
  let eocd = -1
  for (let i = file.byteLength - 22; i >= Math.max(0, file.byteLength - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd === -1) throw new Error('Arquivo ZIP inválido')
  const count = view.getUint16(eocd + 10, true)
  let off = view.getUint32(eocd + 16, true)
  for (let i = 0; i < count; i++) {
    if (view.getUint32(off, true) !== 0x02014b50) break
    const method = view.getUint16(off + 10, true)
    const compSize = view.getUint32(off + 20, true)
    const nameLen = view.getUint16(off + 28, true)
    const extraLen = view.getUint16(off + 30, true)
    const commentLen = view.getUint16(off + 32, true)
    const localOff = view.getUint32(off + 42, true)
    const name = new TextDecoder().decode(bytes.subarray(off + 46, off + 46 + nameLen))
    const lNameLen = view.getUint16(localOff + 26, true)
    const lExtraLen = view.getUint16(localOff + 28, true)
    const dOff = localOff + 30 + lNameLen + lExtraLen
    const compData = bytes.subarray(dOff, dOff + compSize)
    entries.set(name, method === 0 ? compData : await inflate(compData))
    off += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

function colToIdx(col: string): number {
  let idx = 0
  for (let i = 0; i < col.length; i++) idx = idx * 26 + (col.charCodeAt(i) - 64)
  return idx - 1
}

function parseSharedStrings(xml: string): string[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  return Array.from(doc.getElementsByTagNameNS('*', 'si')).map((si) =>
    Array.from(si.getElementsByTagNameNS('*', 't'))
      .map((t) => t.textContent || '')
      .join(''),
  )
}

function parseWorksheet(xml: string, shared: string[]): (string | number)[][] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  return Array.from(doc.getElementsByTagNameNS('*', 'row')).map((row) => {
    const cells = Array.from(row.getElementsByTagNameNS('*', 'c'))
    const arr: (string | number)[] = []
    for (const cell of cells) {
      const ref = cell.getAttribute('r') || ''
      const colIdx = colToIdx(ref.match(/^[A-Z]+/)?.[0] || 'A')
      if (colIdx > 200) continue
      const type = cell.getAttribute('t')
      const v = cell.getElementsByTagNameNS('*', 'v')[0]
      const is = cell.getElementsByTagNameNS('*', 'is')[0]
      let val: string | number = ''
      if (type === 's' && v) val = shared[parseInt(v.textContent || '0')] || ''
      else if (type === 'inlineStr' && is)
        val = is.getElementsByTagNameNS('*', 't')[0]?.textContent || ''
      else if (v) {
        const n = parseFloat(v.textContent || '')
        val = isNaN(n) ? v.textContent || '' : n
      }
      while (arr.length < colIdx) arr.push('')
      arr[colIdx] = val
    }
    return arr
  })
}

export async function readXlsxFile(file: File): Promise<SheetData[]> {
  const zip = await readZip(await file.arrayBuffer())
  const decode = (name: string) => new TextDecoder().decode(zip.get(name) || new Uint8Array())
  const wbDoc = new DOMParser().parseFromString(decode('xl/workbook.xml'), 'text/xml')
  const sheets = Array.from(wbDoc.getElementsByTagNameNS('*', 'sheet')).map((s) => ({
    name: s.getAttribute('name') || '',
    rId: s.getAttribute('r:id') || '',
  }))
  const relsDoc = new DOMParser().parseFromString(decode('xl/_rels/workbook.xml.rels'), 'text/xml')
  const relMap = new Map<string, string>()
  Array.from(relsDoc.getElementsByTagNameNS('*', 'Relationship')).forEach((r) => {
    relMap.set(r.getAttribute('Id') || '', r.getAttribute('Target') || '')
  })
  const shared = zip.has('xl/sharedStrings.xml')
    ? parseSharedStrings(decode('xl/sharedStrings.xml'))
    : []
  return sheets.map((s) => {
    const target = relMap.get(s.rId) || ''
    const path = target.startsWith('/') ? target.slice(1) : `xl/${target}`
    const rows = parseWorksheet(decode(path), shared)
    const headers = rows[0]?.map((h) => String(h).trim()) || []
    return { name: s.name, headers, rows: rows.slice(1) }
  })
}
