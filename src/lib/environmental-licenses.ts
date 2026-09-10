import { differenceInDays } from 'date-fns'
import {
  EnvironmentalLicense,
  EnvironmentalLicenseStatus,
  EnvironmentalLicenseType,
  normalizeDate,
} from '@/types/models'

export const ENVIRONMENTAL_LICENSE_TYPES: EnvironmentalLicenseType[] = [
  'LAP - Licença Ambiental Prévia',
  'LAI - Licença Ambiental de Instalação',
  'LAO - Licença Ambiental de Operação',
  'LP - Licença Prévia',
  'LI - Licença de Instalação',
  'LO - Licença de Operação',
  'AuC - Autorização de Corte',
  'LAS - Licença Ambiental Simplificada',
  'LAC - Licença Ambiental Corretiva',
  'Licença de Ampliação ou Modificação',
  'ASV - Autorização de Supressão da Vegetação',
  'Outras',
]

export interface EnvironmentalLicenseAlertInfo {
  isAlert: boolean
  status: EnvironmentalLicenseStatus
  daysRemaining: number
  totalValidityDays: number
  alertThresholdDays: number
  inconsistentValidity: boolean
}

/**
 * Calculates license validity total days (difference between start_date and end_date).
 * If start_date is missing, defaults to 180 days (standard rule).
 */
export function calculateLicenseTotalValidityDays(
  startDateStr?: string | null,
  endDateStr?: string | null,
): number {
  const normEnd = normalizeDate(endDateStr)
  if (!normEnd) return 180
  const normStart = normalizeDate(startDateStr)
  if (!normStart) return 180

  const start = new Date(normStart + 'T00:00:00')
  const end = new Date(normEnd + 'T00:00:00')
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 180

  const diff = differenceInDays(end, start)
  return diff >= 0 ? diff : 0
}

/**
 * Checks if the user-defined validity_months matches the start_date and end_date.
 * Approximate: 1 month is ~30.4375 days (or check month difference within ±15 days tolerance).
 */
export function checkLicenseValidityInconsistency(
  startDateStr?: string | null,
  endDateStr?: string | null,
  validityMonths?: number | null,
): boolean {
  if (!validityMonths || validityMonths <= 0) return false
  const normStart = normalizeDate(startDateStr)
  const normEnd = normalizeDate(endDateStr)
  if (!normStart || !normEnd) return false

  const start = new Date(normStart + 'T00:00:00')
  const end = new Date(normEnd + 'T00:00:00')
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false

  const days = differenceInDays(end, start)
  if (days < 0) return true

  // Estimate expected days: months * 30.4375 days
  const expectedDays = validityMonths * 30.4375
  const diffDays = Math.abs(days - expectedDays)

  // Inconsistent if difference is greater than 15 days or half a month
  return diffDays > 15
}

/**
 * Calculates automatic license status and alert status according to user specification:
 * - Total validity >= 180 days -> alert up to 180 days before expiration.
 * - Total validity < 180 days -> alert up to 30 days before expiration.
 * - Status:
 *    - "Vencida" if end_date has passed (daysRemaining < 0).
 *    - "Próxima do vencimento" if within alert window (0 <= daysRemaining <= threshold).
 *    - "Vigente" otherwise.
 */
export function calculateLicenseStatus(
  license: Pick<EnvironmentalLicense, 'start_date' | 'end_date' | 'validity_months'>,
  currentDate: Date = new Date(),
): EnvironmentalLicenseAlertInfo {
  const normEnd = normalizeDate(license.end_date)
  if (!normEnd) {
    return {
      isAlert: false,
      status: 'Vigente',
      daysRemaining: 9999,
      totalValidityDays: 180,
      alertThresholdDays: 180,
      inconsistentValidity: false,
    }
  }

  const end = new Date(normEnd + 'T00:00:00')
  const today = new Date(currentDate)
  today.setHours(0, 0, 0, 0)

  const daysRemaining = differenceInDays(end, today)
  const totalValidityDays = calculateLicenseTotalValidityDays(license.start_date, license.end_date)
  const alertThresholdDays = totalValidityDays < 180 ? 30 : 180

  const inconsistentValidity = checkLicenseValidityInconsistency(
    license.start_date,
    license.end_date,
    license.validity_months,
  )

  if (daysRemaining < 0) {
    return {
      isAlert: false,
      status: 'Vencida',
      daysRemaining,
      totalValidityDays,
      alertThresholdDays,
      inconsistentValidity,
    }
  }

  if (daysRemaining <= alertThresholdDays) {
    return {
      isAlert: true,
      status: 'Próxima do vencimento',
      daysRemaining,
      totalValidityDays,
      alertThresholdDays,
      inconsistentValidity,
    }
  }

  return {
    isAlert: false,
    status: 'Vigente',
    daysRemaining,
    totalValidityDays,
    alertThresholdDays,
    inconsistentValidity,
  }
}

/**
 * Formats the alert text according to rule 8:
 * "Licença Ambiental próxima do vencimento — Projeto: [Nome do Projeto] — Licença: [Tipo] — Vencimento: [Data] — Prazo restante: [X] dias. Providenciar renovação ou atualização da licença."
 */
export function formatLicenseAlertMessage(
  projectName: string,
  license: EnvironmentalLicense,
): string {
  const displayType =
    license.license_type === 'Outras' && license.description
      ? `Outras — ${license.description}`
      : license.license_type

  const normEnd = normalizeDate(license.end_date)
  const dateFormatted = normEnd ? normEnd.split('-').reverse().join('/') : '—'
  const { daysRemaining } = calculateLicenseStatus(license)

  return `Licença Ambiental próxima do vencimento — Projeto: ${projectName} — Licença: ${displayType} — Vencimento: ${dateFormatted} — Prazo restante: ${daysRemaining} dias. Providenciar renovação ou atualização da licença.`
}
