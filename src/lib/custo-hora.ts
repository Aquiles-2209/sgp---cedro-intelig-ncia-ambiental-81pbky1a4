/**
 * Custo Hora Unitário — cálculo puro (incremento isolado).
 *
 * Fórmula do requisito: Custo Hora Unitário = Valor Mensal ÷ Total de Horas
 */

/** Arredonda para 2 casas decimais sem erros de ponto flutuante. */
export function arredondarMoeda(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

/**
 * Calcula o Custo Hora Unitário.
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
