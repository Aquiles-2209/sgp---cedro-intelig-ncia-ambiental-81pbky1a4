import { describe, it, expect } from 'vitest'
import {
  calcularCustoHoraUnitario,
  formatarMoedaBRL,
} from './custo-hora'

describe('calcularCustoHoraUnitario', () => {
  it('retorna 0 quando total de horas é 0', () => {
    expect(calcularCustoHoraUnitario(6000, 0)).toBe(0)
  })

  it('retorna 0 quando total de horas é negativo', () => {
    expect(calcularCustoHoraUnitario(6000, -10)).toBe(0)
  })

  it('calcula custo hora corretamente', () => {
    expect(calcularCustoHoraUnitario(6000, 170)).toBeCloseTo(35.29, 2)
  })
})

describe('formatarMoedaBRL', () => {
  it('formata valor com separador de milhar e decimais', () => {
    const resultado = formatarMoedaBRL(1234.5)
    expect(resultado).toContain('1.234,50')
  })
})
