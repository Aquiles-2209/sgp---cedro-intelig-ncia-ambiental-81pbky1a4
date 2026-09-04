/**
 * Custo Hora Unitário — cálculo puro (incremento isolado).
 *
 * Requisito:
 * O custo por hora NÃO deve ser calculado individualmente sobre as horas de cada linha.
 * Para cada usuário, o sistema soma todas as horas alocadas daquele usuário dentro
 * do período selecionado nos filtros do relatório e, somente depois, divide o
 * Valor Mensal do Usuário pelo total de horas acumuladas no período.
 *
 * Fórmula:
 * Custo Hora Unitário = Valor Mensal ÷ Σ(Total de Horas do Usuário no período selecionado)
 *
 * O resultado deve ser o MESMO Custo Hora Unitário em todas as linhas daquele usuário
 * dentro do período selecionado, independentemente da quantidade de horas de cada linha.
 */

/** Arredonda para 2 casas decimais sem erros de ponto flutuante. */
export function arredondarMoeda(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

/**
 * Normaliza o identificador/nome do membro para chave de agrupamento consistente.
 */
export function normalizarChaveMembro(nome: string | undefined | null): string {
  return (nome || '').trim().toLowerCase()
}

/**
 * Calcula a soma total de horas alocadas/trabalhadas por usuário no período selecionado.
 * O total de horas de uma linha é a soma de (allocatedHours + hoursWorked).
 */
export function calcularHorasTotaisPorUsuario<
  T extends { memberName: string; allocatedHours: number; hoursWorked: number },
>(rows: T[]): Map<string, number> {
  const horasPorUsuario = new Map<string, number>()
  for (const row of rows) {
    const chave = normalizarChaveMembro(row.memberName)
    if (!chave || chave === '—' || chave === '-') continue
    const rowHoras = (Number(row.allocatedHours) || 0) + (Number(row.hoursWorked) || 0)
    horasPorUsuario.set(chave, (horasPorUsuario.get(chave) || 0) + rowHoras)
  }
  return horasPorUsuario
}

/**
 * Retorna o mapa de Custo Hora Unitário pré-calculado por usuário no período.
 *
 * Para cada usuário:
 *   Custo Hora Unitário = Valor Mensal ÷ Σ(Total de Horas do Usuário no período selecionado)
 *
 * Caso o total de horas acumulado do usuário no período seja 0 ou não positivo,
 * ou o valor mensal não esteja definido ou não seja numérico válido, o valor retornado é 0.
 */
export function calcularCustosHoraPorUsuario<
  T extends {
    memberName: string
    allocatedHours: number
    hoursWorked: number
    monthlyValue?: number
  },
>(rows: T[]): Map<string, number> {
  const horasTotais = calcularHorasTotaisPorUsuario(rows)
  const valoresMensais = new Map<string, number>()

  for (const row of rows) {
    const chave = normalizarChaveMembro(row.memberName)
    if (!chave || chave === '—' || chave === '-') continue
    if (row.monthlyValue !== undefined && Number.isFinite(row.monthlyValue)) {
      valoresMensais.set(chave, row.monthlyValue)
    }
  }

  const custos = new Map<string, number>()
  for (const [chave, totalHoras] of horasTotais.entries()) {
    const valorMensal = valoresMensais.get(chave) ?? 0
    custos.set(chave, calcularCustoHoraUnitario(valorMensal, totalHoras))
  }

  return custos
}

/**
 * Calcula o Custo Hora Unitário direto: Valor Mensal ÷ Total de Horas Acumulado.
 * Retorna 0 quando o total de horas é 0, negativo ou não numérico.
 */
export function calcularCustoHoraUnitario(valorMensal: number, totalHoras: number): number {
  if (!Number.isFinite(valorMensal) || !Number.isFinite(totalHoras)) return 0
  if (totalHoras <= 0) return 0
  return arredondarMoeda(valorMensal / totalHoras)
}

/** Formata um valor numérico como moeda brasileira (R$ 0.000,00). */
export function formatarMoedaBRL(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(valor) ? valor : 0)
}

/**
 * Calcula o Custo Total da linha (Coluna N):
 * Custo Total = Custo Hora Unitário (M) × Total Horas (K).
 *
 * Regras:
 * - Se M ou K estiver vazio, nulo, NaN, não finito ou <= 0, retorna null (célula vazia).
 * - Exemplo: 35.29 * 60 = 2117.40
 * - Arredonda para 2 casas decimais monetárias.
 */
export function calcularCustoTotalLinha(
  custoHoraUnitario: number | null | undefined,
  totalHoras: number | null | undefined,
): number | null {
  if (
    custoHoraUnitario === null ||
    custoHoraUnitario === undefined ||
    !Number.isFinite(custoHoraUnitario) ||
    custoHoraUnitario <= 0
  ) {
    return null
  }
  if (
    totalHoras === null ||
    totalHoras === undefined ||
    !Number.isFinite(totalHoras) ||
    totalHoras <= 0
  ) {
    return null
  }
  return arredondarMoeda(custoHoraUnitario * totalHoras)
}
