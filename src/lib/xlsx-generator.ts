const crc32Table = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c
  }
  return table
})()

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = crc32Table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function strToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

interface ZipEntry {
  name: string
  data: Uint8Array
}

function createZip(entries: ZipEntry[]): Blob {
  const parts: Uint8Array[] = []
  const centralDir: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const nameBytes = strToBytes(entry.name)
    const crc = crc32(entry.data)
    const size = entry.data.length

    const lh = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(lh.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(8, 0, true)
    lv.setUint16(12, 0x0021, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, size, true)
    lv.setUint32(22, size, true)
    lv.setUint16(26, nameBytes.length, true)
    lh.set(nameBytes, 30)

    parts.push(lh, entry.data)
    const entryOffset = offset
    offset += lh.length + size

    const ch = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(ch.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(12, 0x0021, true)
    cv.setUint32(16, crc, true)
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
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)

  return new Blob([...parts, ...centralDir, eocd] as BlobPart[], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function colLetter(col: number): string {
  let result = ''
  let c = col
  while (c > 0) {
    const rem = (c - 1) % 26
    result = String.fromCharCode(65 + rem) + result
    c = Math.floor((c - 1) / 26)
  }
  return result
}

export type XlsxCellType = 'string' | 'number'
export type XlsxCellStyle = 'normal' | 'positive' | 'negative'

export interface XlsxCell {
  type: XlsxCellType
  value: string | number
  style?: XlsxCellStyle
}

function styleToIndex(style?: XlsxCellStyle): number {
  switch (style) {
    case 'positive':
      return 2
    case 'negative':
      return 3
    default:
      return 0
  }
}

export function generateXlsx(headers: string[], rows: XlsxCell[][]): Blob {
  const files: ZipEntry[] = [
    {
      name: '[Content_Types].xml',
      data: strToBytes(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
      ),
    },
    {
      name: '_rels/.rels',
      data: strToBytes(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      ),
    },
    {
      name: 'xl/workbook.xml',
      data: strToBytes(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Relat\u00f3rio" sheetId="1" r:id="rId1"/></sheets></workbook>',
      ),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: strToBytes(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      ),
    },
    {
      name: 'xl/styles.xml',
      data: strToBytes(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE0E7FF"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD1FAE5"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="2" borderId="0" xfId="0" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/></cellXfs></styleSheet>',
      ),
    },
  ]

  let sheetXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'

  sheetXml += `<row r="1">`
  headers.forEach((h, i) => {
    const ref = colLetter(i + 1) + '1'
    sheetXml += `<c r="${ref}" t="inlineStr" s="1"><is><t>${escapeXml(h)}</t></is></c>`
  })
  sheetXml += '</row>'

  rows.forEach((row, rowIdx) => {
    const r = rowIdx + 2
    sheetXml += `<row r="${r}">`
    row.forEach((cell, colIdx) => {
      const ref = colLetter(colIdx + 1) + r
      const sIdx = styleToIndex(cell.style)
      const sAttr = sIdx > 0 ? ` s="${sIdx}"` : ''
      if (cell.type === 'number') {
        sheetXml += `<c r="${ref}"${sAttr}><v>${cell.value}</v></c>`
      } else {
        sheetXml += `<c r="${ref}" t="inlineStr"${sAttr}><is><t>${escapeXml(String(cell.value))}</t></is></c>`
      }
    })
    sheetXml += '</row>'
  })

  sheetXml += '</sheetData></worksheet>'
  files.push({ name: 'xl/worksheets/sheet1.xml', data: strToBytes(sheetXml) })

  return createZip(files)
}
