import { describe, it, expect } from 'vitest'
import { calcularCustoHoraUnitario, formatarMoedaBRL, arredondarMoeda } from '../custo-hora'

describe('calcularCustoHoraUnitario', () => {
  it('retorna 0 quando total de horas é 0', () => {
    expect(calcularCustoHoraUnitario(6000, 0)).toBe(0)
  })

  it('retorna 0 quando total de horas é negativo', () => {
    expect(calcularCustoHoraUnitario(6000, -10)).toBe(0)
  })

  it('calcula custo hora corretamente (exemplo do requisito: R$ 6.000,00 ÷ 170h)', () => {
    expect(calcularCustoHoraUnitario(6000, 170)).toBeCloseTo(35.29, 2)
  })

  it('retorna 0 quando valor mensal não é finito', () => {
    expect(calcularCustoHoraUnitario(NaN, 170)).toBe(0)
    expect(calcularCustoHoraUnitario(Infinity, 170)).toBe(0)
  })

  it('arredonda para 2 casas decimais', () => {
    expect(arredondarMoeda(10.005)).toBe(10.01)
    expect(arredondarMoeda(35.294117647058826)).toBeCloseTo(35.29, 2)
  })
})

describe('formatarMoedaBRL', () => {
  it('formata valor com separador de milhar e decimais', () => {
    const resultado = formatarMoedaBRL(1234.5)
    expect(resultado).toContain('1.234,50')
  })

  it('formata com prefixo de moeda R$', () => {
    expect(formatarMoedaBRL(35.29)).toContain('R$')
    expect(formatarMoedaBRL(35.29)).toContain('35,29')
  })
})
