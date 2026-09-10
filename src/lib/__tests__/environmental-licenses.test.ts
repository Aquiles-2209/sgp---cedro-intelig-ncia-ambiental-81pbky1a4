import { describe, it, expect } from 'vitest'
import {
  calculateLicenseTotalValidityDays,
  checkLicenseValidityInconsistency,
  calculateLicenseStatus,
  formatLicenseAlertMessage,
} from '../environmental-licenses'
import { EnvironmentalLicense } from '@/types/models'

describe('Environmental Licenses Rules & Status Calculation', () => {
  it('calculates total validity days between start_date and end_date', () => {
    // 2026-01-01 to 2026-07-01 is 181 days
    const totalDays = calculateLicenseTotalValidityDays('2026-01-01', '2026-07-01')
    expect(totalDays).toBe(181)

    // Short validity: 2026-01-01 to 2026-03-31 is 89 days
    const shortDays = calculateLicenseTotalValidityDays('2026-01-01', '2026-03-31')
    expect(shortDays).toBe(89)
  })

  it('defaults to 180 days if start_date is not provided', () => {
    const totalDays = calculateLicenseTotalValidityDays(undefined, '2026-12-31')
    expect(totalDays).toBe(180)
  })

  it('detects inconsistency when months and dates differ substantially', () => {
    // 12 months (~365 days) but dates are only 30 days apart
    const inconsistent = checkLicenseValidityInconsistency('2026-01-01', '2026-01-31', 12)
    expect(inconsistent).toBe(true)

    // 12 months and dates are 365 days apart
    const consistent = checkLicenseValidityInconsistency('2026-01-01', '2027-01-01', 12)
    expect(consistent).toBe(false)
  })

  describe('Rule: Total validity >= 180 days (standard rule: 180 days notice)', () => {
    const license: Pick<EnvironmentalLicense, 'start_date' | 'end_date' | 'validity_months'> = {
      start_date: '2025-01-01',
      end_date: '2026-01-01', // Total validity = 365 days (>= 180 days)
    }

    it('returns "Vigente" when remaining days > 180', () => {
      // 200 days before expiration (e.g., 2025-06-15)
      const mockToday = new Date('2025-06-15T00:00:00')
      const result = calculateLicenseStatus(license, mockToday)
      expect(result.status).toBe('Vigente')
      expect(result.isAlert).toBe(false)
      expect(result.alertThresholdDays).toBe(180)
    })

    it('returns "Próxima do vencimento" when remaining days <= 180 and >= 0', () => {
      // Exactly 180 days before expiration (around 2025-07-05)
      const mockToday = new Date('2025-07-15T00:00:00')
      const result = calculateLicenseStatus(license, mockToday)
      expect(result.status).toBe('Próxima do vencimento')
      expect(result.isAlert).toBe(true)
      expect(result.daysRemaining).toBeLessThanOrEqual(180)
      expect(result.daysRemaining).toBeGreaterThanOrEqual(0)
    })

    it('returns "Vencida" when remaining days < 0', () => {
      // 1 day after expiration: 2026-01-02
      const mockToday = new Date('2026-01-02T00:00:00')
      const result = calculateLicenseStatus(license, mockToday)
      expect(result.status).toBe('Vencida')
      expect(result.isAlert).toBe(false)
      expect(result.daysRemaining).toBeLessThan(0)
    })
  })

  describe('Rule: Total validity < 180 days (special rule: 30 days notice)', () => {
    const shortLicense: Pick<EnvironmentalLicense, 'start_date' | 'end_date' | 'validity_months'> =
      {
        start_date: '2026-01-01',
        end_date: '2026-03-31', // Total validity = 89 days (< 180 days)
      }

    it('sets alertThresholdDays to 30', () => {
      const mockToday = new Date('2026-01-15T00:00:00')
      const result = calculateLicenseStatus(shortLicense, mockToday)
      expect(result.totalValidityDays).toBe(89)
      expect(result.alertThresholdDays).toBe(30)
      expect(result.status).toBe('Vigente')
      expect(result.isAlert).toBe(false)
    })

    it('returns "Próxima do vencimento" only within 30 days of expiration', () => {
      // 2026-03-05 is 26 days before 2026-03-31
      const mockToday = new Date('2026-03-05T00:00:00')
      const result = calculateLicenseStatus(shortLicense, mockToday)
      expect(result.status).toBe('Próxima do vencimento')
      expect(result.isAlert).toBe(true)
      expect(result.daysRemaining).toBe(26)
    })

    it('does not alert at 45 days before expiration for short licenses', () => {
      // 2026-02-14 is 45 days before 2026-03-31
      const mockToday = new Date('2026-02-14T00:00:00')
      const result = calculateLicenseStatus(shortLicense, mockToday)
      expect(result.status).toBe('Vigente')
      expect(result.isAlert).toBe(false)
    })

    it('returns "Vencida" after end_date', () => {
      const mockToday = new Date('2026-04-01T00:00:00')
      const result = calculateLicenseStatus(shortLicense, mockToday)
      expect(result.status).toBe('Vencida')
      expect(result.isAlert).toBe(false)
    })
  })

  it('formats license alert message accurately according to spec', () => {
    const lic: EnvironmentalLicense = {
      id: 'lic-1',
      project: 'proj-1',
      license_type: 'LAI - Licença Ambiental de Instalação',
      end_date: '2027-03-15',
    }
    const message = formatLicenseAlertMessage('Complexo Solar Sertão', lic)
    expect(message).toContain('Complexo Solar Sertão')
    expect(message).toContain('LAI - Licença Ambiental de Instalação')
    expect(message).toContain('15/03/2027')
    expect(message).toContain('Providenciar renovação ou atualização da licença.')
  })

  it('formats license alert message with "Outras" description', () => {
    const lic: EnvironmentalLicense = {
      id: 'lic-2',
      project: 'proj-1',
      license_type: 'Outras',
      description: 'Autorização Ambiental Municipal',
      end_date: '2028-10-20',
    }
    const message = formatLicenseAlertMessage('Mina do Sossego', lic)
    expect(message).toContain('Mina do Sossego')
    expect(message).toContain('Outras — Autorização Ambiental Municipal')
    expect(message).toContain('20/10/2028')
  })
})
