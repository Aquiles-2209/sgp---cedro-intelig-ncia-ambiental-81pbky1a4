import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { getProjects } from '@/services/projects'
import { getTeamMembers } from '@/services/team-members'
import type { ParsedData } from './import-data'
import type { Project, TeamMember } from '@/types/models'

export interface ImportResult {
  success: boolean
  message: string
  counts: { projects: number; members: number; allocations: number; tasks: number }
  skipped: { projects: number; members: number }
  emptyTitleRows: number[]
}

const THROTTLE_MS = 200
const RETRY_DELAY_MS = 3000
const MAX_RETRIES = 2

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRateLimitError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'status' in err) {
    return (err as { status: number }).status === 429
  }
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes('429') || msg.toLowerCase().includes('too many requests')
}

function isRateLimitMessage(err: unknown): boolean {
  return err instanceof Error && err.message.includes('Limite de requisições')
}

function rateLimitMessage(sheetName: string): string {
  return `Limite de requisições atingido na aba ${sheetName}. Aguarde alguns segundos e tente novamente.`
}

async function withRetry<T>(fn: () => Promise<T>, sheetName: string): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (isRateLimitError(err) && attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS)
        continue
      }
      if (isRateLimitError(err)) {
        throw new Error(rateLimitMessage(sheetName))
      }
      throw err
    }
  }
  throw lastErr
}

async function createThrottled(
  collection: string,
  data: Record<string, unknown>,
  sheetName: string,
): Promise<{ id: string }> {
  const rec = await withRetry(() => pb.collection(collection).create(data), sheetName)
  await delay(THROTTLE_MS)
  return rec
}

export async function executeImport(data: ParsedData): Promise<ImportResult> {
  const created = {
    projects: [] as string[],
    members: [] as string[],
    allocations: [] as string[],
    tasks: [] as string[],
    assignments: [] as string[],
  }
  const emptyTitleRows: number[] = []
  try {
    const existingProjects = await getProjects()
    const existingMembers = await getTeamMembers()
    const projByName = new Map<string, string>(existingProjects.map((p: Project) => [p.name, p.id]))
    const memberByEmail = new Map<string, string>(
      existingMembers.filter((m: TeamMember) => m.email).map((m: TeamMember) => [m.email, m.id]),
    )
    const memberByName = new Map<string, string>(
      existingMembers.map((m: TeamMember) => [m.name, m.id]),
    )

    const userCache = new Map<string, string>()
    const allUsers = await withRetry(() => pb.collection('users').getFullList(), 'Alocações')
    for (const u of allUsers as any[]) {
      if (u.email) userCache.set(u.email, u.id)
    }

    let skipP = 0,
      skipM = 0,
      cntP = 0,
      cntM = 0,
      cntA = 0,
      cntT = 0

    for (const p of data.projects) {
      if (projByName.has(p.name)) {
        skipP++
        continue
      }
      try {
        const rec = await createThrottled(
          'projects',
          {
            name: p.name,
            description: p.description,
            contract_id: p.contract_id,
            client: p.client,
            start_date: p.start_date,
            end_date: p.end_date,
            status: p.status,
            setor: p.setor,
          },
          'Projetos',
        )
        created.projects.push(rec.id)
        projByName.set(p.name, rec.id)
        cntP++
      } catch (err) {
        if (isRateLimitMessage(err)) throw err
        throw new Error(`Linha ${p._row} da aba Projetos: ${getErrorMessage(err)}`)
      }
    }

    for (const m of data.members) {
      if (m.email && memberByEmail.has(m.email)) {
        skipM++
        continue
      }
      try {
        const rec = await createThrottled(
          'team_members',
          {
            name: m.name,
            function: m.function,
            setor: m.setor,
            email: m.email,
            role: m.role,
          },
          'Usuários (Equipe)',
        )
        created.members.push(rec.id)
        memberByEmail.set(m.email, rec.id)
        memberByName.set(m.name, rec.id)
        cntM++
      } catch (err) {
        if (isRateLimitMessage(err)) throw err
        throw new Error(`Linha ${m._row} da aba Usuários (Equipe): ${getErrorMessage(err)}`)
      }
    }

    const allocKey = new Map<string, string>()
    for (const a of data.allocations) {
      const projectId = projByName.get(a.projectName)
      if (!projectId)
        throw new Error(`Linha ${a._row} de Alocações: Projeto '${a.projectName}' não encontrado.`)
      const userId = a.userEmail ? userCache.get(a.userEmail) : undefined
      try {
        const rec = await createThrottled(
          'allocations',
          {
            project: projectId,
            member_name: a.memberName,
            function: a.function,
            start_date: a.start_date,
            end_date: a.end_date,
            ...(userId ? { user: userId } : {}),
          },
          'Alocações',
        )
        created.allocations.push(rec.id)
        allocKey.set(`${projectId}:${a.memberName}`, rec.id)
        cntA++
      } catch (err) {
        if (isRateLimitMessage(err)) throw err
        throw new Error(`Linha ${a._row} da aba Alocações: ${getErrorMessage(err)}`)
      }
    }

    for (const t of data.tasks) {
      if (t.hadEmptyTitle) emptyTitleRows.push(t._row)
      const projectId = projByName.get(t.projectName)
      if (!projectId)
        throw new Error(`Linha ${t._row} de Tarefas: Projeto '${t.projectName}' não encontrado.`)
      const memberId = t.memberName ? memberByName.get(t.memberName) : undefined
      const allocationId = memberId ? allocKey.get(`${projectId}:${t.memberName}`) : undefined
      const taskData: Record<string, unknown> = {
        project: projectId,
        title: t.title,
        description: t.description,
        status: t.status,
        start_date: t.start_date,
        due_date: t.due_date,
        planned_hours: t.planned_hours,
      }
      if (t.allocated_hours !== null) taskData.allocated_hours = t.allocated_hours
      if (allocationId) taskData.allocation = allocationId
      if (memberId) taskData.members = [memberId]
      try {
        const rec = await createThrottled('tasks', taskData, 'Tarefas')
        created.tasks.push(rec.id)
        if (memberId) {
          const ta = await createThrottled(
            'task_assignments',
            { task: rec.id, team_member: memberId },
            'Tarefas',
          )
          created.assignments.push(ta.id)
        }
        cntT++
      } catch (err) {
        if (isRateLimitMessage(err)) throw err
        throw new Error(`Linha ${t._row} da aba Tarefas: ${getErrorMessage(err)}`)
      }
    }

    const parts: string[] = []
    if (cntP) parts.push(`${cntP} projeto${cntP > 1 ? 's' : ''}`)
    if (cntM) parts.push(`${cntM} usuário${cntM > 1 ? 's' : ''}`)
    if (cntA) parts.push(`${cntA} alocação${cntA > 1 ? 'ões' : ''}`)
    if (cntT) parts.push(`${cntT} tarefa${cntT > 1 ? 's' : ''}`)
    const total = cntP + cntM + cntA + cntT
    let msg = parts.length
      ? parts.join(', ') + ' importado' + (total > 1 ? 's' : '') + ' com sucesso!'
      : 'Nenhum registro novo para importar.'
    const skipTotal = skipP + skipM
    if (skipTotal > 0)
      msg += ` (${skipP} projeto${skipP > 1 ? 's' : ''} e ${skipM} usuário${skipM > 1 ? 's' : ''} duplicado${skipTotal > 1 ? 's' : ''} ignorado${skipTotal > 1 ? 's' : ''}.)`

    return {
      success: true,
      message: msg,
      counts: { projects: cntP, members: cntM, allocations: cntA, tasks: cntT },
      skipped: { projects: skipP, members: skipM },
      emptyTitleRows,
    }
  } catch (err) {
    for (const id of created.assignments)
      await pb
        .collection('task_assignments')
        .delete(id)
        .catch(() => {})
    for (const id of created.tasks)
      await pb
        .collection('tasks')
        .delete(id)
        .catch(() => {})
    for (const id of created.allocations)
      await pb
        .collection('allocations')
        .delete(id)
        .catch(() => {})
    for (const id of created.members)
      await pb
        .collection('team_members')
        .delete(id)
        .catch(() => {})
    for (const id of created.projects)
      await pb
        .collection('projects')
        .delete(id)
        .catch(() => {})
    throw err
  }
}
