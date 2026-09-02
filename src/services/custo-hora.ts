/**
 * Serviço de Valor Mensal (custo) — acesso RESTRICTO aos dados financeiros.
 *
 * O `hourly_rate` dos Usuários(as) CEDRO é confidencial. A API comum
 * (/api/collections/team_members) NÃO expõe esse campo para ninguém —
 * nem para outros Masters (ver hook `on_team_member_enrich_hide_hourly_rate`
 * e migração 0050). A única via de acesso é esta função, que consulta um
 * endpoint de backend que revalida, NO SERVIDOR, a regra de autorização:
 *
 *   usuário logado = aquilessouza1@hotmail.com  E  role = master
 *
 * Qualquer outra pessoa (inclusive outros Masters) recebe 403 e nunca
 * obtém o Valor Mensal nem o Custo Hora Unitário por API, URL ou DevTools.
 */
import pb from '@/lib/pocketbase/client'

export const USUARIO_AUTORIZADO_CUSTO = 'aquilessouza1@hotmail.com'

/** Regra declarativa (mesma do backend) — uso apenas para esconder a UI. */
export function temPermissaoCusto(
  user: { email?: string; role?: string } | null | undefined,
): boolean {
  return (
    !!user &&
    (user.email || '').trim().toLowerCase() === USUARIO_AUTORIZADO_CUSTO &&
    user.role === 'master'
  )
}

/**
 * Busca o Valor Mensal de TODOS os membros, apenas se o usuário logado
 * for o autorizado. Retorna {} para qualquer outro usuário (o servidor
 * negaria de qualquer forma — esta validação evita até a chamada).
 */
export async function fetchValoresMensais(): Promise<Record<string, number>> {
  if (!temPermissaoCusto(pb.authStore.record as any)) {
    return {}
  }
  try {
    const res = await pb.send<{ rates: Record<string, number> }>(
      '/backend/v1/relatorios/valores-mensais',
      { method: 'GET' },
    )
    return res?.rates || {}
  } catch {
    // Sem permissão ou erro: nenhum dado financeiro é exposto.
    return {}
  }
}
