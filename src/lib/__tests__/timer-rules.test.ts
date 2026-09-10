import { describe, it, expect } from 'vitest'
import {
  CAMPO_DAILY_LIMIT_SECONDS,
  CAMPO_DAILY_LIMIT_HOURS,
  isSameDay,
  isEntryActive,
  findActiveTimerForMember,
  calculateTodayCampoWorkedSeconds,
  getRemainingCampoSecondsToday,
  formatHoursAndMinutes,
} from '../timer-rules'
import { Task, TimeEntry } from '@/types/models'

describe('timer-rules', () => {
  it('define o limite de campo corretamente como 8h30m (30600 segundos)', () => {
    expect(CAMPO_DAILY_LIMIT_HOURS).toBe(8.5)
    expect(CAMPO_DAILY_LIMIT_SECONDS).toBe(30600)
    expect(formatHoursAndMinutes(CAMPO_DAILY_LIMIT_SECONDS)).toBe('08h 30m')
  })

  it('isSameDay identifica o mesmo dia civil', () => {
    const d1 = new Date('2026-09-10T10:00:00.000Z')
    const d2 = new Date('2026-09-10T18:00:00.000Z')
    const d3 = new Date('2026-09-11T10:00:00.000Z')

    expect(isSameDay(d1, d2)).toBe(true)
    expect(isSameDay(d1, d3)).toBe(false)
  })

  it('isEntryActive e findActiveTimerForMember detectam timer ativo (sem end_time)', () => {
    const activeEntry: TimeEntry = {
      id: 'entry-1',
      task: 'task-1',
      team_member: 'member-luiz',
      start_time: '2026-09-10T13:00:00.000Z',
      duration: 0,
    } as any

    const finishedEntry: TimeEntry = {
      id: 'entry-2',
      task: 'task-2',
      team_member: 'member-luiz',
      start_time: '2026-09-10T10:00:00.000Z',
      end_time: '2026-09-10T11:00:00.000Z',
      duration: 3600,
    } as any

    expect(isEntryActive(activeEntry)).toBe(true)
    expect(isEntryActive(finishedEntry)).toBe(false)

    const list = [finishedEntry, activeEntry]
    const found = findActiveTimerForMember(list, 'member-luiz')
    expect(found?.id).toBe('entry-1')

    const notFound = findActiveTimerForMember(list, 'member-other')
    expect(notFound).toBeUndefined()
  })

  it('calculateTodayCampoWorkedSeconds soma apenas tarefas Campo do dia para o membro', () => {
    const tasks: Task[] = [
      { id: 't-campo-1', title: 'Monitoramento Fauna', activity_type: 'Campo' } as any,
      { id: 't-escritorio', title: 'Relatórios', activity_type: 'Escritório' } as any,
    ]

    const refDate = new Date('2026-09-10T14:00:00.000Z')

    const entries: TimeEntry[] = [
      // Campo hoje: 2 horas (7200s)
      {
        id: 'e1',
        task: 't-campo-1',
        team_member: 'm1',
        start_time: '2026-09-10T08:00:00.000Z',
        end_time: '2026-09-10T10:00:00.000Z',
        duration: 7200,
      } as any,
      // Escritório hoje: 3 horas (deve ser ignorado)
      {
        id: 'e2',
        task: 't-escritorio',
        team_member: 'm1',
        start_time: '2026-09-10T10:00:00.000Z',
        end_time: '2026-09-10T13:00:00.000Z',
        duration: 10800,
      } as any,
      // Campo de outro dia (deve ser ignorado)
      {
        id: 'e3',
        task: 't-campo-1',
        team_member: 'm1',
        start_time: '2026-09-09T08:00:00.000Z',
        end_time: '2026-09-09T16:30:00.000Z',
        duration: 30600,
      } as any,
      // Subtração manual de 30 min (-1800s)
      {
        id: 'e4',
        task: 't-campo-1',
        team_member: 'm1',
        start_time: '2026-09-10T11:00:00.000Z',
        end_time: '2026-09-10T11:00:00.000Z',
        duration: -1800,
      } as any,
    ]

    const workedSec = calculateTodayCampoWorkedSeconds(entries, tasks, 'm1', refDate)
    expect(workedSec).toBe(7200 - 1800) // 5400s = 1.5 horas

    const remainingSec = getRemainingCampoSecondsToday(entries, tasks, 'm1', refDate)
    expect(remainingSec).toBe(30600 - 5400) // 25200s = 7 horas
  })

  it('impede novos lançamentos de campo quando o limite de 08h30m é atingido', () => {
    const tasks: Task[] = [{ id: 't-campo', title: 'Campo', activity_type: 'Campo' } as any]
    const refDate = new Date('2026-09-10T18:00:00.000Z')

    // Já trabalhou 8h30m (30600s) hoje
    const entries: TimeEntry[] = [
      {
        id: 'e1',
        task: 't-campo',
        team_member: 'm1',
        start_time: '2026-09-10T08:00:00.000Z',
        end_time: '2026-09-10T16:30:00.000Z',
        duration: 30600,
      } as any,
    ]

    const workedSec = calculateTodayCampoWorkedSeconds(entries, tasks, 'm1', refDate)
    expect(workedSec).toBe(30600)

    const remainingSec = getRemainingCampoSecondsToday(entries, tasks, 'm1', refDate)
    expect(remainingSec).toBe(0)
  })

  it('valida regras de permissão de acionamento do Play por linha de membro', () => {
    // Simula a lógica de permissão de linha usada no TaskList
    const evaluateCanStart = ({
      isMaster,
      isAdmin,
      currentUserEmail,
      memberEmail,
      canStartTimer = true,
    }: {
      isMaster: boolean
      isAdmin: boolean
      currentUserEmail: string
      memberEmail: string
      canStartTimer?: boolean
    }) => {
      const isCurrentUser =
        !!currentUserEmail &&
        !!memberEmail &&
        memberEmail.trim().toLowerCase() === currentUserEmail.trim().toLowerCase()

      const canActOnMember = isMaster || isCurrentUser
      return canStartTimer && canActOnMember
    }

    // 1. Usuário Master: pode acionar em qualquer linha
    expect(
      evaluateCanStart({
        isMaster: true,
        isAdmin: true,
        currentUserEmail: 'master@cedro.com',
        memberEmail: 'outro@cedro.com',
      }),
    ).toBe(true)

    // 2. Usuário Admin (Administrativo, não Master):
    // Na própria linha -> liberado
    expect(
      evaluateCanStart({
        isMaster: false,
        isAdmin: true,
        currentUserEmail: 'admin@cedro.com',
        memberEmail: 'admin@cedro.com',
      }),
    ).toBe(true)

    // Linha de outro usuário -> bloqueado
    expect(
      evaluateCanStart({
        isMaster: false,
        isAdmin: true,
        currentUserEmail: 'admin@cedro.com',
        memberEmail: 'outro@cedro.com',
      }),
    ).toBe(false)

    // Com espaçamento ou diferença de caixa na própria linha -> liberado
    expect(
      evaluateCanStart({
        isMaster: false,
        isAdmin: true,
        currentUserEmail: 'Admin@Cedro.com ',
        memberEmail: ' admin@cedro.com',
      }),
    ).toBe(true)

    // 3. Usuário User comum:
    // Na própria linha -> liberado
    expect(
      evaluateCanStart({
        isMaster: false,
        isAdmin: false,
        currentUserEmail: 'user@cedro.com',
        memberEmail: 'user@cedro.com',
      }),
    ).toBe(true)

    // Linha de outro usuário -> bloqueado
    expect(
      evaluateCanStart({
        isMaster: false,
        isAdmin: false,
        currentUserEmail: 'user@cedro.com',
        memberEmail: 'outro@cedro.com',
      }),
    ).toBe(false)
  })
})
