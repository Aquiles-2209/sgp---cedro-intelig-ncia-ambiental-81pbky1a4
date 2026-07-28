import type { SheetData } from './xlsx-reader'

export interface ValidationError {
  sheet: string
  row: number
  column: string
  message: string
}

export interface ParsedProject {
  name: string
  description: string
  contract_id: string
  client: string
  start_date: string
  end_date: string
  status: string
  setor: string
  _row: number
}
export interface ParsedMember {
  name: string
  function: string
  setor: string
  email: string
  role: string
  _row: number
}
export interface ParsedAllocation {
  projectName: string
  memberName: string
  function: string
  start_date: string
  end_date: string
  userEmail: string
  _row: number
}
export interface ParsedTask {
  projectName: string
  title: string
  description: string
  status: string
  start_date: string
  due_date: string
  memberName: string
  planned_hours: number
  allocated_hours: number | null
  _row: number
}
export interface ParsedData {
  projects: ParsedProject[]
  members: ParsedMember[]
  allocations: ParsedAllocation[]
  tasks: ParsedTask[]
}

const PROJECT_STATUS = ['Planejado', 'Em Andamento', 'Concluído']
const PROJECT_SECTOR = ['Mineração', 'Geração de Energia', 'Infraestrutura']
const MEMBER_SETOR = ['Meio-Ambiente', 'Desenvolvimento Urbano', 'Administrativo']
const MEMBER_ROLE = ['admin', 'user']
const TASK_STATUS = ['Pendente', 'Em Andamento', 'Concluído']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function excelSerialToDate(serial: number): string {
  const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000)
  return date.toISOString().split('T')[0]
}

function normDate(val: string | number | undefined): string {
  if (typeof val === 'number' && val > 30000) return excelSerialToDate(val)
  return String(val ?? '').trim()
}

function checkCols(
  headers: string[],
  expected: string[],
  sheet: string,
  errors: ValidationError[],
) {
  for (const c of expected) {
    if (!headers.includes(c))
      errors.push({
        sheet,
        row: 0,
        column: c,
        message: `Coluna obrigatória '${c}' não encontrada na aba ${sheet}.`,
      })
  }
}

function valEnum(
  val: string,
  allowed: string[],
  row: number,
  col: string,
  sheet: string,
  errors: ValidationError[],
) {
  if (val && !allowed.includes(val))
    errors.push({
      sheet,
      row,
      column: col,
      message: `Valor inválido '${val}'. Valores aceitos: ${allowed.join(', ')}.`,
    })
}

function valDate(val: string, row: number, col: string, sheet: string, errors: ValidationError[]) {
  if (val && !DATE_RE.test(val))
    errors.push({
      sheet,
      row,
      column: col,
      message: `Data inválida '${val}'. Use o formato YYYY-MM-DD.`,
    })
}

function valRequired(
  val: string,
  fieldName: string,
  row: number,
  col: string,
  sheet: string,
  errors: ValidationError[],
) {
  if (!val)
    errors.push({
      sheet,
      row,
      column: col,
      message: `campo '${fieldName}' está vazio.`,
    })
}

function valEmail(val: string, row: number, col: string, sheet: string, errors: ValidationError[]) {
  if (val && !EMAIL_RE.test(val))
    errors.push({
      sheet,
      row,
      column: col,
      message: `email '${val}' não é válido.`,
    })
}

export function validateImport(sheets: SheetData[]): {
  data: ParsedData | null
  errors: ValidationError[]
} {
  const errors: ValidationError[] = []
  const map = new Map(sheets.map((s) => [s.name, s]))
  const required = ['Projetos', 'Usuários (Equipe)', 'Alocações', 'Tarefas']
  for (const n of required) {
    if (!map.has(n))
      errors.push({
        sheet: n,
        row: 0,
        column: '',
        message: `Aba '${n}' não encontrada no arquivo.`,
      })
  }
  if (errors.length) return { data: null, errors }

  const gv = (sheet: SheetData, row: (string | number)[], col: string) => {
    const idx = sheet.headers.indexOf(col)
    return idx >= 0 ? row[idx] : ''
  }

  const pSheet = map.get('Projetos')!
  checkCols(
    pSheet.headers,
    [
      'Nome do Projeto',
      'Descrição',
      'Contrato',
      'Cliente',
      'Data Início',
      'Data Fim',
      'Status',
      'Setor',
    ],
    'Projetos',
    errors,
  )
  const projects: ParsedProject[] = pSheet.rows.map((row, i) => {
    const rn = i + 2
    const name = String(gv(pSheet, row, 'Nome do Projeto')).trim()
    const status = String(gv(pSheet, row, 'Status')).trim()
    const setor = String(gv(pSheet, row, 'Setor')).trim()
    const start = normDate(gv(pSheet, row, 'Data Início'))
    const end = normDate(gv(pSheet, row, 'Data Fim'))
    valRequired(name, 'Nome do Projeto', rn, 'Nome do Projeto', 'Projetos', errors)
    valEnum(status, PROJECT_STATUS, rn, 'Status', 'Projetos', errors)
    valEnum(setor, PROJECT_SECTOR, rn, 'Setor', 'Projetos', errors)
    valDate(start, rn, 'Data Início', 'Projetos', errors)
    valDate(end, rn, 'Data Fim', 'Projetos', errors)
    return {
      name,
      description: String(gv(pSheet, row, 'Descrição')).trim(),
      contract_id: String(gv(pSheet, row, 'Contrato')).trim(),
      client: String(gv(pSheet, row, 'Cliente')).trim(),
      start_date: start,
      end_date: end,
      status,
      setor,
      _row: rn,
    }
  })

  const mSheet = map.get('Usuários (Equipe)')!
  checkCols(
    mSheet.headers,
    ['Nome', 'Função', 'Setor', 'Email', 'Role'],
    'Usuários (Equipe)',
    errors,
  )
  const members: ParsedMember[] = mSheet.rows.map((row, i) => {
    const rn = i + 2
    const name = String(gv(mSheet, row, 'Nome')).trim()
    const func = String(gv(mSheet, row, 'Função')).trim()
    const setor = String(gv(mSheet, row, 'Setor')).trim()
    const email = String(gv(mSheet, row, 'Email')).trim()
    const role = String(gv(mSheet, row, 'Role')).trim()
    valRequired(name, 'Nome', rn, 'Nome', 'Usuários (Equipe)', errors)
    valRequired(func, 'função', rn, 'Função', 'Usuários (Equipe)', errors)
    valRequired(setor, 'setor', rn, 'Setor', 'Usuários (Equipe)', errors)
    valEmail(email, rn, 'Email', 'Usuários (Equipe)', errors)
    valEnum(setor, MEMBER_SETOR, rn, 'Setor', 'Usuários (Equipe)', errors)
    valEnum(role, MEMBER_ROLE, rn, 'Role', 'Usuários (Equipe)', errors)
    return {
      name,
      function: func,
      setor,
      email,
      role,
      _row: rn,
    }
  })

  const projNames = new Set(projects.map((p) => p.name))
  const memberNames = new Set(members.map((m) => m.name))
  const memberEmails = new Set(members.map((m) => m.email))

  const aSheet = map.get('Alocações')!
  checkCols(
    aSheet.headers,
    ['Projeto (Nome)', 'Membro (Nome)', 'Função', 'Data Início', 'Data Fim', 'Usuário (Email)'],
    'Alocações',
    errors,
  )
  const allocations: ParsedAllocation[] = aSheet.rows.map((row, i) => {
    const rn = i + 2
    const pn = String(gv(aSheet, row, 'Projeto (Nome)')).trim()
    const mn = String(gv(aSheet, row, 'Membro (Nome)')).trim()
    const func = String(gv(aSheet, row, 'Função')).trim()
    const ue = String(gv(aSheet, row, 'Usuário (Email)')).trim()
    const start = normDate(gv(aSheet, row, 'Data Início'))
    const end = normDate(gv(aSheet, row, 'Data Fim'))
    valRequired(pn, 'Projeto (Nome)', rn, 'Projeto (Nome)', 'Alocações', errors)
    valRequired(mn, 'Membro (Nome)', rn, 'Membro (Nome)', 'Alocações', errors)
    valRequired(func, 'Função', rn, 'Função', 'Alocações', errors)
    valRequired(start, 'Data Início', rn, 'Data Início', 'Alocações', errors)
    valRequired(end, 'Data Fim', rn, 'Data Fim', 'Alocações', errors)
    if (pn && !projNames.has(pn))
      errors.push({
        sheet: 'Alocações',
        row: rn,
        column: 'Projeto (Nome)',
        message: `Projeto '${pn}' não encontrado.`,
      })
    if (mn && !memberNames.has(mn))
      errors.push({
        sheet: 'Alocações',
        row: rn,
        column: 'Membro (Nome)',
        message: `Membro '${mn}' não encontrado.`,
      })
    if (ue && !memberEmails.has(ue))
      errors.push({
        sheet: 'Alocações',
        row: rn,
        column: 'Usuário (Email)',
        message: `Email '${ue}' não encontrado.`,
      })
    valDate(start, rn, 'Data Início', 'Alocações', errors)
    valDate(end, rn, 'Data Fim', 'Alocações', errors)
    return {
      projectName: pn,
      memberName: mn,
      function: func,
      start_date: start,
      end_date: end,
      userEmail: ue,
      _row: rn,
    }
  })

  const tSheet = map.get('Tarefas')!
  checkCols(
    tSheet.headers,
    [
      'Projeto (Nome)',
      'Título',
      'Descrição',
      'Status',
      'Data Início',
      'Data Fim (Prazo)',
      'Alocação (Nome do Membro)',
      'Horas Previstas',
      'Horas Alocadas',
    ],
    'Tarefas',
    errors,
  )
  const tasks: ParsedTask[] = tSheet.rows.map((row, i) => {
    const rn = i + 2
    const pn = String(gv(tSheet, row, 'Projeto (Nome)')).trim()
    const title = String(gv(tSheet, row, 'Título')).trim()
    const status = String(gv(tSheet, row, 'Status')).trim()
    const mn = String(gv(tSheet, row, 'Alocação (Nome do Membro)')).trim()
    const start = normDate(gv(tSheet, row, 'Data Início'))
    const due = normDate(gv(tSheet, row, 'Data Fim (Prazo)'))
    const phRaw = gv(tSheet, row, 'Horas Previstas')
    const ahRaw = gv(tSheet, row, 'Horas Alocadas')
    const ph = phRaw === '' ? 0 : Number(phRaw) || 0
    const ah = ahRaw === '' || ahRaw === undefined ? null : Number(ahRaw) || 0
    valRequired(title, 'Título', rn, 'Título', 'Tarefas', errors)
    if (pn && !projNames.has(pn))
      errors.push({
        sheet: 'Tarefas',
        row: rn,
        column: 'Projeto (Nome)',
        message: `Projeto '${pn}' não encontrado.`,
      })
    if (mn && !memberNames.has(mn))
      errors.push({
        sheet: 'Tarefas',
        row: rn,
        column: 'Alocação (Nome do Membro)',
        message: `Membro '${mn}' não encontrado.`,
      })
    valEnum(status, TASK_STATUS, rn, 'Status', 'Tarefas', errors)
    valDate(start, rn, 'Data Início', 'Tarefas', errors)
    valDate(due, rn, 'Data Fim (Prazo)', 'Tarefas', errors)
    return {
      projectName: pn,
      title,
      description: String(gv(tSheet, row, 'Descrição')).trim(),
      status,
      start_date: start,
      due_date: due,
      memberName: mn,
      planned_hours: ph,
      allocated_hours: ah,
      _row: rn,
    }
  })

  return { data: errors.length ? null : { projects, members, allocations, tasks }, errors }
}
