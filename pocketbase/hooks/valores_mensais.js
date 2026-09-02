/**
 * GET /backend/v1/relatorios/valores-mensais
 *
 * Fonte AUTORIZADA do Valor Mensal (hourly_rate) para o relatório de
 * produtividade (Coluna M — Custo Hora Unitário).
 *
 * A autorização é revalidada NO SERVIDOR em cada chamada:
 *   usuário logado = aquilessouza1@hotmail.com  E  role = master
 * Qualquer outro usuário — inclusive outros Masters — recebe 403 e
 * NUNCA obtém o Valor Mensal por API, URL, DevTools ou exportação.
 */
routerAdd(
  'GET',
  '/backend/v1/relatorios/valores-mensais',
  (e) => {
    var auth = e.auth
    if (!auth) {
      return e.unauthorizedError('Autenticação necessária')
    }

    var email = (auth.getString('email') || '').toLowerCase()
    var role = auth.getString('role')

    if (email !== 'aquilessouza1@hotmail.com' || role !== 'master') {
      return e.forbiddenError('Acesso não autorizado aos dados financeiros')
    }

    var members = []
    try {
      members = $app.findRecordsByFilter('team_members', 'id != ""', 'name', 0, 0)
    } catch (_) {
      members = []
    }

    var rates = {}
    for (var i = 0; i < members.length; i++) {
      var m = members[i]
      var rate = m.get('hourly_rate')
      if (rate === undefined || rate === null || rate === '') {
        rate = 0
      }
      rates[m.id] = Number(rate) || 0
    }

    return e.json(200, { rates: rates })
  },
  $apis.requireAuth(),
)
