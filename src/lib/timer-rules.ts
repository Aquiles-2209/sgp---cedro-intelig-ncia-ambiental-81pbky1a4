import { TimeEntry, Task } from '@/types/models'

export const CAMPO_DAILY_LIMIT_SECONDS = 8.5 * 3600 // 8h30m = 30600 segundos
export const CAMPO_DAILY_LIMIT_HOURS = 8.5

/**
 * Verifica se duas datas correspondem ao mesmo dia civil no horário local ou UTC.
 */
export function isSameDay(d1: Date, d2: Date): boolean {
  const localSame =
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()

  const utcSame =
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()

  return localSame || utcSame
}

/**
 * Retorna se um time_entry está ativo (Play em andamento, sem end_time).
 */
export function isEntryActive(entry: TimeEntry): boolean {
  return !entry.end_time
}

/**
 * Encontra a entrada com timer ativo de um determinado membro (se houver).
 */
export function findActiveTimerForMember(
  timeEntries: TimeEntry[],
  memberId: string,
): TimeEntry | undefined {
  return timeEntries.find((te) => te.team_member === memberId && isEntryActive(te))
}

/**
 * Calcula o total de segundos trabalhados hoje pelo membro em atividades do tipo "Campo".
 * Inclui os registros de time_entries (botão Play) e ajustes manuais (+/-), além do tempo
 * transcorrido se houver algum timer ativo de Campo no momento.
 */
export function calculateTodayCampoWorkedSeconds(
  timeEntries: TimeEntry[],
  tasks: Task[],
  memberId: string,
  now: Date = new Date(),
): number {
  const taskMap = new Map<string, Task>()
  for (const t of tasks) {
    taskMap.set(t.id, t)
  }

  let totalSeconds = 0

  for (const te of timeEntries) {
    if (te.team_member !== memberId) continue
    if (!te.start_time) continue

    const teDate = new Date(te.start_time)
    if (isNaN(teDate.getTime())) continue

    if (!isSameDay(teDate, now)) continue

    const task = taskMap.get(te.task)
    if (task?.activity_type !== 'Campo') continue

    if (isEntryActive(te)) {
      const elapsed = Math.max(0, Math.floor((now.getTime() - teDate.getTime()) / 1000))
      totalSeconds += elapsed
    } else {
      totalSeconds += te.duration || 0
    }
  }

  return totalSeconds
}

/**
 * Retorna os segundos restantes disponíveis para atividades de Campo no dia para um membro.
 */
export function getRemainingCampoSecondsToday(
  timeEntries: TimeEntry[],
  tasks: Task[],
  memberId: string,
  now: Date = new Date(),
): number {
  const worked = calculateTodayCampoWorkedSeconds(timeEntries, tasks, memberId, now)
  return Math.max(0, CAMPO_DAILY_LIMIT_SECONDS - worked)
}

/**
 * Formata segundos no formato legível de horas e minutos (ex: "08h 30m" ou "03h 15m").
 */
export function formatHoursAndMinutes(seconds: number): string {
  const totalMinutes = Math.floor(Math.max(0, seconds) / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  const hh = String(hours).padStart(2, '0')
  const mm = String(minutes).padStart(2, '0')
  return `${hh}h ${mm}m`
}
