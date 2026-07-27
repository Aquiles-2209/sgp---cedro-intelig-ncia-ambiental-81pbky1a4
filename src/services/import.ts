import { readXlsx, XlsxWorkbookData } from '@/lib/xlsx-reader'
import { getProjects, createProject } from '@/services/projects'
import { getTeamMembers, createTeamMember } from '@/services/team-members'
import { createTask } from '@/services/tasks'
import { createTaskAssignment } from '@/services/task-assignments'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Project, TeamMember } from '@/types/models'

export interface SheetImportResult {
  totalRows: number
  created: number
  skipped: Array<{ row: number; reason: string }>
  errors: Array<{ row: number; column?: string; message: string }>
  allocatedHoursImported?: number
  allocatedHoursBlank?: number
  allocatedHoursErrors?: number
}

export interface ImportResult {
  projetos: SheetImportResult
  usuarios: SheetImportResult
  tarefas: SheetImportResult
  sheetErrors: string[]
}

const PROJECT_STATUS = ['Planejado', 'Em Andamento', 'Concluído']
const PROJECT_SETOR = ['Mineração', 'Geração de Energia', 'Infraestrutura']
const MEMBER_SETOR = ['Meio-Ambiente', 'Desenvolvimento Urbano', 'Administrativo']
const MEMBER_ROLE = ['admin', 'user']
const TASK_STATUS = ['Pendente', 'Em Andamento', 'Concluído']

function matchCaseInsensitive(value: string, allowed: string[]): boolean {
  const normalized = value.trim().toLowerCase()
  return allowed.some((a) => a.toLowerCase() === normalized)
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}
const PROJECT_HEADERS = [
  'Nome do Projeto',
  'Cliente',
  'Número do Contrato',
  'Status',
  'Setor',
  'Data de Início',
  'Data de Término',
  'Descrição e Objetivos',
]
const MEMBER_HEADERS = ['Nome', 'Email', 'Função', 'Setor', 'Usuário (role)']
const TASK_HEADERS = [
  'Projeto',
  'Título',
  'Descrição',
  'Usuários CEDRO da Equipe',
  'Data de Início',
  'Data de Finalização',
  'Horas Previstas',
  'Horas Alocadas',
  'Status',
]

function parseDate(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) {
    const [d, m, y] = [parseInt(br[1]), parseInt(br[2]), parseInt(br[3])]
    const date = new Date(y, m - 1, d)
    if (date.getDate() === d && date.getMonth() === m - 1) return `${br[3]}-${br[2]}-${br[1]}`
  }
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) {
    const [y, m, d] = [parseInt(iso[1]), parseInt(iso[2]), parseInt(iso[3])]
    const date = new Date(y, m - 1, d)
    if (date.getDate() === d && date.getMonth() === m - 1) return v
  }
  const num = Number(v)
  if (!isNaN(num) && num > 0 && num < 100000) {
    const serial = num < 60 ? num : num - 1
    const date = new Date(1900, 0, serial)
    if (!isNaN(date.getTime())) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }
  }
  return null
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function validateHeaders(actual: string[], expected: string[]): string | null {
  for (let i = 0; i < expected.length; i++) {
    if (!actual[i] || actual[i].trim() !== expected[i]) {
      return `Coluna esperada "${expected[i]}" não encontrada na posição ${i + 1}.`
    }
  }
  return null
}

function isRowEmpty(row: string[]): boolean {
  return row.every((c) => !c || !c.trim())
}

function emptyResult(): SheetImportResult {
  return { totalRows: 0, created: 0, skipped: [], errors: [] }
}

export async function executeImport(file: File): Promise<ImportResult> {
  const result: ImportResult = {
    projetos: emptyResult(),
    usuarios: emptyResult(),
    tarefas: emptyResult(),
    sheetErrors: [],
  }
  let workbook: XlsxWorkbookData
  try {
    workbook = await readXlsx(file)
  } catch (e) {
    result.sheetErrors.push(
      `Erro ao ler o arquivo: ${e instanceof Error ? e.message : 'formato inválido'}`,
    )
    return result
  }
  for (const name of ['Projetos', 'Usuários CEDRO', 'Tarefas']) {
    if (!workbook.sheets.has(name)) result.sheetErrors.push(`Planilha "${name}" não encontrada.`)
  }
  if (result.sheetErrors.length > 0) return result

  const [existingProjects, existingMembers] = await Promise.all([
    getProjects().catch(() => []),
    getTeamMembers().catch(() => []),
  ])
  const projNameSet = new Set(existingProjects.map((p: Project) => normalizeName(p.name)))
  const projContractSet = new Set(
    existingProjects.map((p: Project) => normalizeName(p.contract_id || '')).filter(Boolean),
  )
  const projByName = new Map<string, string>()
  existingProjects.forEach((p: Project) => projByName.set(normalizeName(p.name), p.id))
  const memEmailSet = new Set(
    existingMembers.map((m: TeamMember) => (m.email || '').toLowerCase()).filter(Boolean),
  )
  const memByName = new Map<string, string>()
  existingMembers.forEach((m: TeamMember) => memByName.set(normalizeName(m.name), m.id))

  await importProjetos(
    workbook.sheets.get('Projetos')!,
    result.projetos,
    projNameSet,
    projContractSet,
    projByName,
  )
  await importUsuarios(
    workbook.sheets.get('Usuários CEDRO')!,
    result.usuarios,
    memEmailSet,
    memByName,
  )
  result.tarefas.allocatedHoursImported = 0
  result.tarefas.allocatedHoursBlank = 0
  result.tarefas.allocatedHoursErrors = 0
  await importTarefas(workbook.sheets.get('Tarefas')!, result.tarefas, projByName, memByName)
  return result
}

async function importProjetos(
  rows: string[][],
  res: SheetImportResult,
  nameSet: Set<string>,
  contractSet: Set<string>,
  byName: Map<string, string>,
) {
  if (!rows.length) return
  const he = validateHeaders(rows[0], PROJECT_HEADERS)
  if (he) {
    res.errors.push({ row: 1, message: he })
    return
  }
  for (let i = 1; i < rows.length; i++) {
    if (isRowEmpty(rows[i])) continue
    res.totalRows++
    const r = rows[i]
    const name = (r[0] || '').trim(),
      contractId = (r[2] || '').trim(),
      status = (r[3] || '').trim(),
      setor = (r[4] || '').trim()
    if (!name) {
      res.errors.push({ row: i + 1, column: 'Nome do Projeto', message: 'Nome é obrigatório.' })
      continue
    }
    if (!matchCaseInsensitive(status, PROJECT_STATUS)) {
      res.errors.push({
        row: i + 1,
        column: 'Status',
        message: `Status inválido: ${PROJECT_STATUS.join(', ')}`,
      })
      continue
    }
    if (!matchCaseInsensitive(setor, PROJECT_SETOR)) {
      res.errors.push({
        row: i + 1,
        column: 'Setor',
        message: `Setor inválido: ${PROJECT_SETOR.join(', ')}`,
      })
      continue
    }
    const sd = (r[5] || '').trim() ? parseDate(r[5]) : null
    const ed = (r[6] || '').trim() ? parseDate(r[6]) : null
    if (r[5]?.trim() && !sd) {
      res.errors.push({
        row: i + 1,
        column: 'Data de Início',
        message: 'Data inválida. Use DD/MM/AAAA ou AAAA-MM-DD.',
      })
      continue
    }
    if (r[6]?.trim() && !ed) {
      res.errors.push({
        row: i + 1,
        column: 'Data de Término',
        message: 'Data inválida. Use DD/MM/AAAA ou AAAA-MM-DD.',
      })
      continue
    }
    if (nameSet.has(normalizeName(name))) {
      res.skipped.push({ row: i + 1, reason: `Projeto "${name}" já existe.` })
      continue
    }
    if (contractId && contractSet.has(normalizeName(contractId))) {
      res.skipped.push({ row: i + 1, reason: `Contrato "${contractId}" já existe.` })
      continue
    }
    try {
      const data: Partial<Project> = {
        name,
        client: (r[1] || '').trim(),
        contract_id: contractId,
        status,
        setor,
      }
      if (sd) data.start_date = sd
      if (ed) data.end_date = ed
      const desc = (r[7] || '').trim()
      if (desc) data.description = desc
      const p = await createProject(data)
      nameSet.add(normalizeName(name))
      if (contractId) contractSet.add(normalizeName(contractId))
      byName.set(normalizeName(name), p.id)
      res.created++
    } catch (e) {
      res.errors.push({ row: i + 1, message: `Erro ao criar: ${getErrorMessage(e)}` })
    }
  }
}

async function importUsuarios(
  rows: string[][],
  res: SheetImportResult,
  emailSet: Set<string>,
  byName: Map<string, string>,
) {
  if (!rows.length) return
  const he = validateHeaders(rows[0], MEMBER_HEADERS)
  if (he) {
    res.errors.push({ row: 1, message: he })
    return
  }
  for (let i = 1; i < rows.length; i++) {
    if (isRowEmpty(rows[i])) continue
    res.totalRows++
    const r = rows[i]
    const name = (r[0] || '').trim(),
      email = (r[1] || '').trim(),
      funcao = (r[2] || '').trim(),
      setor = (r[3] || '').trim(),
      role = (r[4] || '').trim()
    if (!name) {
      res.errors.push({ row: i + 1, column: 'Nome', message: 'Nome é obrigatório.' })
      continue
    }
    if (!funcao) {
      res.errors.push({ row: i + 1, column: 'Função', message: 'Função é obrigatória.' })
      continue
    }
    if (!matchCaseInsensitive(setor, MEMBER_SETOR)) {
      res.errors.push({
        row: i + 1,
        column: 'Setor',
        message: `Setor inválido: ${MEMBER_SETOR.join(', ')}`,
      })
      continue
    }
    if (email && !isValidEmail(email)) {
      res.errors.push({ row: i + 1, column: 'Email', message: 'Email inválido.' })
      continue
    }
    if (role && !matchCaseInsensitive(role, MEMBER_ROLE)) {
      res.errors.push({
        row: i + 1,
        column: 'Usuário (role)',
        message: `Role inválido: ${MEMBER_ROLE.join(', ')}`,
      })
      continue
    }
    if (email && emailSet.has(email.trim().toLowerCase())) {
      res.skipped.push({ row: i + 1, reason: `Email "${email}" já existe.` })
      continue
    }
    try {
      const m = await createTeamMember({
        name,
        email,
        function: funcao,
        setor,
        role: role || 'user',
      })
      if (email) emailSet.add(email.trim().toLowerCase())
      byName.set(normalizeName(name), m.id)
      res.created++
    } catch (e) {
      res.errors.push({ row: i + 1, message: `Erro ao criar: ${getErrorMessage(e)}` })
    }
  }
}

async function importTarefas(
  rows: string[][],
  res: SheetImportResult,
  projByName: Map<string, string>,
  memByName: Map<string, string>,
) {
  if (!rows.length) return
  const he = validateHeaders(rows[0], TASK_HEADERS)
  if (he) {
    res.errors.push({ row: 1, message: he })
    return
  }
  for (let i = 1; i < rows.length; i++) {
    if (isRowEmpty(rows[i])) continue
    res.totalRows++
    const r = rows[i]
    const projName = (r[0] || '').trim(),
      title = (r[1] || '').trim(),
      memberStr = (r[3] || '').trim(),
      startVal = (r[4] || '').trim(),
      dueVal = (r[5] || '').trim(),
      hoursStr = (r[6] || '').trim(),
      status = (r[8] || '').trim()
    if (!projName) {
      res.errors.push({ row: i + 1, column: 'Projeto', message: 'Projeto é obrigatório.' })
      continue
    }
    if (!title) {
      res.errors.push({ row: i + 1, column: 'Título', message: 'Título é obrigatório.' })
      continue
    }
    if (!matchCaseInsensitive(status, TASK_STATUS)) {
      res.errors.push({
        row: i + 1,
        column: 'Status',
        message: `Status inválido: ${TASK_STATUS.join(', ')}`,
      })
      continue
    }
    const projId = projByName.get(normalizeName(projName))
    if (!projId) {
      res.errors.push({
        row: i + 1,
        column: 'Projeto',
        message: `Projeto "${projName}" não encontrado.`,
      })
      continue
    }
    const sd = startVal ? parseDate(startVal) : null
    const dd = dueVal ? parseDate(dueVal) : null
    if (startVal && !sd) {
      res.errors.push({ row: i + 1, column: 'Data de Início', message: 'Data inválida.' })
      continue
    }
    if (dueVal && !dd) {
      res.errors.push({ row: i + 1, column: 'Data de Finalização', message: 'Data inválida.' })
      continue
    }
    let hours: number | undefined
    if (hoursStr) {
      hours = Number(hoursStr.replace(',', '.'))
      if (isNaN(hours)) {
        res.errors.push({
          row: i + 1,
          column: 'Horas Previstas',
          message: 'Deve ser um número decimal.',
        })
        continue
      }
    }
    const allocatedStr = (r[7] || '').trim()
    let allocatedHours: number | null = null
    if (allocatedStr) {
      const parsed = Number(allocatedStr.replace(',', '.'))
      if (isNaN(parsed) || parsed < 0) {
        res.errors.push({
          row: i + 1,
          column: 'Horas Alocadas',
          message: `Valor inválido "${allocatedStr}": deve ser um número decimal maior ou igual a zero.`,
        })
        res.allocatedHoursErrors = (res.allocatedHoursErrors || 0) + 1
        continue
      }
      allocatedHours = parsed
      res.allocatedHoursImported = (res.allocatedHoursImported || 0) + 1
    } else {
      res.allocatedHoursBlank = (res.allocatedHoursBlank || 0) + 1
    }
    let memberIds: string[] = []
    if (memberStr) {
      memberIds = memberStr
        .split(';')
        .map((n) => n.trim())
        .filter(Boolean)
        .map((n) => memByName.get(normalizeName(n)))
        .filter(Boolean) as string[]
    }
    try {
      const data: Record<string, unknown> = {
        project: projId,
        title,
        description: (r[2] || '').trim(),
        status,
      }
      if (sd) data.start_date = sd
      if (dd) data.due_date = dd
      if (hours !== undefined) data.planned_hours = hours
      if (allocatedHours !== null) data.allocated_hours = allocatedHours
      if (memberIds.length > 0) data.members = memberIds
      const task = await createTask(data as any)
      for (const mid of memberIds) {
        try {
          await createTaskAssignment({ task: task.id, team_member: mid })
        } catch {
          /* intentionally ignored */
        }
      }
      res.created++
    } catch (e) {
      res.errors.push({ row: i + 1, message: `Erro ao criar: ${getErrorMessage(e)}` })
    }
  }
}
