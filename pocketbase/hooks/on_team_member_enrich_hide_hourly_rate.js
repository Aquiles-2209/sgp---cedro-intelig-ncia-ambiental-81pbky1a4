/**
 * Confidencialidade do Valor Mensal (hourly_rate) — camada de API.
 *
 * Sempre que um registro de team_members é serializado para uma resposta
 * (listagem, visualização, expansão/expand, realtime), o campo
 * hourly_rate é escondido PARA TODOS os usuários comuns — inclusive
 * outros Masters e Admins. Apenas o usuário autorizado
 * (aquilessouza1@hotmail.com, role master) recebe o campo.
 *
 * Superusuários (dashboard administrativo) não são afetados.
 *
 * Isso garante que o Valor Mensal não pode ser obtido por API, URL,
 * DevTools, filtros ou expands por quem não é autorizado — a restrição
 * é no nível dos dados, não apenas visual.
 */
onRecordEnrich((e) => {
  // Superuser (dashboard do PocketBase) sempre vê tudo.
  if (e.requestInfo && e.requestInfo.hasSuperuserAuth && e.requestInfo.hasSuperuserAuth()) {
    e.next()
    return
  }

  var auth = e.requestInfo ? e.requestInfo.auth : null

  var isAuthorized =
    !!auth &&
    auth.collection().name === 'users' &&
    (auth.getString('email') || '').toLowerCase() === 'aquilessouza1@hotmail.com' &&
    auth.getString('role') === 'master'

  if (!isAuthorized) {
    // O campo simplesmente não existe na resposta para não autorizados.
    e.record.hide('hourly_rate')
  }

  e.next()
}, 'team_members')
