import { describe, it, expect, vi } from 'vitest'
import {
  calcularCustoHoraUnitario,
  calcularCustoTotalLinha,
  formatarMoedaBRL,
  arredondarMoeda,
  normalizarChaveMembro,
  calcularHorasTotaisPorUsuario,
  calcularCustosHoraPorUsuario,
} from '../custo-hora'
import { exportExcelReport } from '../export-excel-report'
import * as xlsxGen from '../xlsx-generator'
import type { ReportRow } from '@/services/reports'

describe('calcularCustoHoraUnitario', () => {
  it('retorna 0 quando total de horas é 0', () => {
    expect(calcularCustoHoraUnitario(6000, 0)).toBe(0)
  })

  it('retorna 0 quando total de horas é negativo', () => {
    expect(calcularCustoHoraUnitario(6000, -10)).toBe(0)
  })

  it('calcula custo hora corretamente (exemplo do requisito: R$ 6.000,00 ÷ 170h)', () => {
    expect(calcularCustoHoraUnitario(6000, 170)).toBeCloseTo(35.29, 2)
    expect(calcularCustoHoraUnitario(6000, 170)).toBe(35.29)
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

describe('Cálculo agrupado por usuário no período (Coluna M)', () => {
  it('normaliza o nome do membro de forma consistente', () => {
    expect(normalizarChaveMembro(' João Silva ')).toBe('joão silva')
    expect(normalizarChaveMembro('JOÃO SILVA')).toBe('joão silva')
    expect(normalizarChaveMembro('')).toBe('')
    expect(normalizarChaveMembro(null)).toBe('')
  })

  it('soma corretamente as horas alocadas e trabalhadas por usuário', () => {
    const rows = [
      { memberName: 'Maria Silva', allocatedHours: 60, hoursWorked: 0 },
      { memberName: 'Maria Silva', allocatedHours: 0, hoursWorked: 10 },
      { memberName: 'Maria Silva', allocatedHours: 50, hoursWorked: 50 }, // total 100
      { memberName: 'Carlos Souza', allocatedHours: 40, hoursWorked: 10 },
    ]

    const horas = calcularHorasTotaisPorUsuario(rows)
    expect(horas.get('maria silva')).toBe(170)
    expect(horas.get('carlos souza')).toBe(50)
  })

  it('aplica exatamente o exemplo do requisito do usuário: R$ 6.000,00 ÷ (60 + 10 + 100)h = R$ 35,29/h em todas as linhas', () => {
    const rows = [
      { memberName: 'Aquiles Souza', allocatedHours: 60, hoursWorked: 0, monthlyValue: 6000 },
      { memberName: 'Aquiles Souza', allocatedHours: 10, hoursWorked: 0, monthlyValue: 6000 },
      { memberName: 'Aquiles Souza', allocatedHours: 100, hoursWorked: 0, monthlyValue: 6000 },
    ]

    const totalHorasMap = calcularHorasTotaisPorUsuario(rows)
    const userTotalHoras = totalHorasMap.get('aquiles souza')!
    expect(userTotalHoras).toBe(170)

    const custoHoraMap = calcularCustosHoraPorUsuario(rows)
    const custoHora = custoHoraMap.get('aquiles souza')!
    expect(custoHora).toBe(35.29)

    // O Custo Hora Unitário deve ser o MESMO para todas as 3 linhas
    const custosLinhas = rows.map((r) => {
      const userKey = normalizarChaveMembro(r.memberName)
      const userHoras = totalHorasMap.get(userKey) || 0
      return calcularCustoHoraUnitario(r.monthlyValue ?? 0, userHoras)
    })

    expect(custosLinhas).toEqual([35.29, 35.29, 35.29])

    // Verifica que formatado em BRL é R$ 35,29 nas 3 linhas
    const formatados = custosLinhas.map(formatarMoedaBRL)
    expect(formatados[0]).toContain('35,29')
    expect(formatados[1]).toContain('35,29')
    expect(formatados[2]).toContain('35,29')
  })

  it('retorna 0 para usuários com 0 horas totais no período', () => {
    const rows = [
      { memberName: 'Sem Horas', allocatedHours: 0, hoursWorked: 0, monthlyValue: 5000 },
    ]
    const custos = calcularCustosHoraPorUsuario(rows)
    expect(custos.get('sem horas')).toBe(0)
  })

  it('lida com múltiplos usuários isoladamente no mesmo relatório', () => {
    const rows = [
      { memberName: 'Membro A', allocatedHours: 80, hoursWorked: 20, monthlyValue: 5000 }, // 100h => 50.00
      { memberName: 'Membro A', allocatedHours: 50, hoursWorked: 50, monthlyValue: 5000 }, // 100h => total A: 200h => 25.00
      { memberName: 'Membro B', allocatedHours: 50, hoursWorked: 0, monthlyValue: 3000 }, // total B: 50h => 60.00
    ]

    const custos = calcularCustosHoraPorUsuario(rows)
    expect(custos.get('membro a')).toBe(25) // 5000 / 200 = 25.00
    expect(custos.get('membro b')).toBe(60) // 3000 / 50 = 60.00
  })
})

describe('calcularCustoTotalLinha (Coluna N)', () => {
  it('calcula o exemplo exato do requisito: R$ 35,29 × 60h = R$ 2.117,40', () => {
    const custoTotal = calcularCustoTotalLinha(35.29, 60)
    expect(custoTotal).toBe(2117.4)
    expect(formatarMoedaBRL(custoTotal!)).toContain('2.117,40')
  })

  it('retorna null (célula vazia) quando M é inválido, zero, nulo ou indefinido', () => {
    expect(calcularCustoTotalLinha(0, 60)).toBeNull()
    expect(calcularCustoTotalLinha(-10, 60)).toBeNull()
    expect(calcularCustoTotalLinha(null, 60)).toBeNull()
    expect(calcularCustoTotalLinha(undefined, 60)).toBeNull()
    expect(calcularCustoTotalLinha(NaN, 60)).toBeNull()
    expect(calcularCustoTotalLinha(Infinity, 60)).toBeNull()
  })

  it('retorna null (célula vazia) quando K é inválido, zero, nulo ou indefinido', () => {
    expect(calcularCustoTotalLinha(35.29, 0)).toBeNull()
    expect(calcularCustoTotalLinha(35.29, -5)).toBeNull()
    expect(calcularCustoTotalLinha(35.29, null)).toBeNull()
    expect(calcularCustoTotalLinha(35.29, undefined)).toBeNull()
    expect(calcularCustoTotalLinha(35.29, NaN)).toBeNull()
    expect(calcularCustoTotalLinha(35.29, Infinity)).toBeNull()
  })

  it('garante que a soma do Custo Total de todas as linhas do usuário converge para o Valor Mensal', () => {
    // Exemplo: Usuário com salário R$ 6.000,00 e 3 linhas com 60h, 10h e 100h (Total 170h)
    // Custo Hora Unitário M = R$ 35,29
    // Linha 1: 35,29 * 60 = 2.117,40
    // Linha 2: 35,29 * 10 = 352,90
    // Linha 3: 35,29 * 100 = 3.529,00
    // Soma = 2.117,40 + 352,90 + 3.529,00 = 5.999,30 (diferença de centavos decorrente do arredondamento do unitário)
    const custoHora = 35.29
    const linha1 = calcularCustoTotalLinha(custoHora, 60)!
    const linha2 = calcularCustoTotalLinha(custoHora, 10)!
    const linha3 = calcularCustoTotalLinha(custoHora, 100)!

    expect(linha1).toBe(2117.4)
    expect(linha2).toBe(352.9)
    expect(linha3).toBe(3529)

    const soma = linha1 + linha2 + linha3
    expect(soma).toBeCloseTo(6000, -1) // ≈ R$ 6.000,00
  })

  it('calcula a soma de Custo Total da Coluna N para a linha TOTAL GERAL e formata em R$ 0,00', () => {
    // Simula linhas filtradas de um projeto específico, ex: [0785] Consultoria Usinas Elera
    const rows = [
      { custoTotal: 2117.4 },
      { custoTotal: 352.9 },
      { custoTotal: null }, // linha sem valor de custo total
      { custoTotal: 1500.0 },
    ]

    const soma = rows.reduce((acc, r) => acc + (r.custoTotal ?? 0), 0)
    expect(soma).toBe(3970.3)
    const formatado = formatarMoedaBRL(soma)
    expect(formatado).toContain('R$')
    expect(formatado).toContain('3.970,30')
  })
})

describe('exportExcelReport — gravação numérica das Colunas M e N e fórmula na linha TOTAL', () => {
  it('grava Coluna N como number com style currency e linha TOTAL com fórmula SUM e number', () => {
    const mockGenerateXlsx = vi.spyOn(xlsxGen, 'generateXlsx').mockReturnValue(new Blob())
    // Mock createObjectURL/revokeObjectURL
    const origCreateObjectURL = globalThis.URL.createObjectURL
    const origRevokeObjectURL = globalThis.URL.revokeObjectURL
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock')
    globalThis.URL.revokeObjectURL = vi.fn()

    const rows: ReportRow[] = [
      {
        client: 'Cliente A',
        projectName: 'Projeto A',
        memberSector: 'Engenharia',
        memberName: 'Aquiles Souza',
        activityTitle: 'Atividade 1',
        activityLaunchDate: '2025-01-10',
        launchDate: '2025-01-10T10:00:00Z',
        plannedHours: 60,
        allocatedHours: 60,
        hoursWorked: 0,
        monthlyValue: 6000,
      },
      {
        client: 'Cliente A',
        projectName: 'Projeto A',
        memberSector: 'Engenharia',
        memberName: 'Aquiles Souza',
        activityTitle: 'Atividade 2',
        activityLaunchDate: '2025-01-11',
        launchDate: '2025-01-11T10:00:00Z',
        plannedHours: 110,
        allocatedHours: 110,
        hoursWorked: 0,
        monthlyValue: 6000,
      },
    ]

    exportExcelReport(rows, true)

    expect(mockGenerateXlsx).toHaveBeenCalledTimes(1)
    const [headers, xlsxRows] = mockGenerateXlsx.mock.calls[0]

    expect(headers).toContain('Custo Hora Unitário')
    expect(headers).toContain('Custo Total')

    // Linha 1 de dados (Aquiles Souza: 170h total, custo hora = 6000/170 = 35.29)
    // Linha 1: 60h => custo total = 35.29 * 60 = 2117.4
    const row1 = xlsxRows[0]
    const colM_row1 = row1[12]
    const colN_row1 = row1[13]

    expect(colM_row1).toEqual({
      type: 'number',
      value: 35.29,
      style: 'currency',
    })
    expect(colN_row1).toEqual({
      type: 'number',
      value: 2117.4,
      style: 'currency',
    })

    // Linha 2: 110h => custo total = 35.29 * 110 = 3881.9
    const row2 = xlsxRows[1]
    const colN_row2 = row2[13]
    expect(colN_row2).toEqual({
      type: 'number',
      value: 3881.9,
      style: 'currency',
    })

    // Linha TOTAL GERAL (índice 2)
    const totalRow = xlsxRows[2]
    expect(totalRow[4].value).toBe('TOTAL GERAL')

    // Coluna M na linha TOTAL GERAL deve ser string vazia
    expect(totalRow[12]).toEqual({
      type: 'string',
      value: '',
    })

    // Coluna N na linha TOTAL GERAL deve ser número com fórmula de soma
    const colN_total = totalRow[13]
    expect(colN_total.type).toBe('number')
    expect(colN_total.value).toBe(5999.3)
    expect(colN_total.formula).toBe('SUM(N2:N3)')
    expect(colN_total.style).toBe('currency')

    globalThis.URL.createObjectURL = origCreateObjectURL
    globalThis.URL.revokeObjectURL = origRevokeObjectURL
    mockGenerateXlsx.mockRestore()
  })

  it('quando incluirCustoHora é false, não inclui Colunas M e N e termina na Coluna L', () => {
    const mockGenerateXlsx = vi.spyOn(xlsxGen, 'generateXlsx').mockReturnValue(new Blob())
    const origCreateObjectURL = globalThis.URL.createObjectURL
    const origRevokeObjectURL = globalThis.URL.revokeObjectURL
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock')
    globalThis.URL.revokeObjectURL = vi.fn()

    const rows: ReportRow[] = [
      {
        client: 'Cliente A',
        projectName: 'Projeto A',
        memberSector: 'Engenharia',
        memberName: 'Outro Membro',
        activityTitle: 'Atividade 1',
        activityLaunchDate: '2025-01-10',
        launchDate: '2025-01-10T10:00:00Z',
        plannedHours: 10,
        allocatedHours: 10,
        hoursWorked: 0,
      },
    ]

    exportExcelReport(rows, false)

    const [headers, xlsxRows] = mockGenerateXlsx.mock.calls[0]
    expect(headers.length).toBe(12)
    expect(headers).not.toContain('Custo Hora Unitário')
    expect(headers).not.toContain('Custo Total')
    expect(xlsxRows[0].length).toBe(12)
    expect(xlsxRows[1].length).toBe(12) // linha TOTAL

    globalThis.URL.createObjectURL = origCreateObjectURL
    globalThis.URL.revokeObjectURL = origRevokeObjectURL
    mockGenerateXlsx.mockRestore()
  })

  it('gera célula vazia na Coluna N quando horas ou taxa forem inválidas/nulas', () => {
    const mockGenerateXlsx = vi.spyOn(xlsxGen, 'generateXlsx').mockReturnValue(new Blob())
    const origCreateObjectURL = globalThis.URL.createObjectURL
    const origRevokeObjectURL = globalThis.URL.revokeObjectURL
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock')
    globalThis.URL.revokeObjectURL = vi.fn()

    const rows: ReportRow[] = [
      {
        client: 'Cliente A',
        projectName: 'Projeto A',
        memberSector: 'Engenharia',
        memberName: 'Sem Horas',
        activityTitle: 'Atividade 1',
        activityLaunchDate: '2025-01-10',
        launchDate: '2025-01-10T10:00:00Z',
        plannedHours: 0,
        allocatedHours: 0,
        hoursWorked: 0,
        monthlyValue: 5000,
      },
    ]

    exportExcelReport(rows, true)

    const [, xlsxRows] = mockGenerateXlsx.mock.calls[0]
    const row1 = xlsxRows[0]
    expect(row1[12]).toEqual({ type: 'string', value: 'N/A' })
    expect(row1[13]).toEqual({ type: 'string', value: '' })

    globalThis.URL.createObjectURL = origCreateObjectURL
    globalThis.URL.revokeObjectURL = origRevokeObjectURL
    mockGenerateXlsx.mockRestore()
  })
})
