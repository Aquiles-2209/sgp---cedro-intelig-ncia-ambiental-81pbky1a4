// Sincroniza a role de `users` (auth) sempre que a role de um `team_members`
// for alterada via API. Aplica as mesmas regras de proteção do hook de users:
// apenas Master pode alterar a role de outro usuário; Master pode definir
// qualquer role (admin/user/master). Usuários não-Master têm a alteração
// silenciosamente revertida para o valor original.
onRecordUpdateRequest((e) => {
  var auth = e.requestInfo().auth
  var authRole = auth ? auth.getString('role') : ''

  var originalRole = e.record.original().getString('role')
  var newRole = e.record.getString('role')

  // Normaliza roles inválidas para o valor original (ou 'user' como fallback).
  if (newRole !== 'admin' && newRole !== 'user' && newRole !== 'master') {
    newRole = originalRole || 'user'
    e.record.set('role', newRole)
  }

  // Só Master pode alterar a role de outro usuário.
  if (authRole !== 'master') {
    if (newRole !== originalRole) {
      e.record.set('role', originalRole)
    }
    return e.next()
  }

  // Master alterou (ou manteve) a role. Se mudou, sincroniza o usuário auth
  // correspondente para que users.role permaneça em sincronia com team_members.role.
  if (newRole !== originalRole) {
    var email = e.record.getString('email')
    if (email) {
      try {
        var userRecord = $app.findAuthRecordByEmail('_pb_users_auth_', email)
        userRecord.set('role', newRole)
        $app.save(userRecord)
      } catch (err) {
        // Usuário auth ainda não existe (ex: membro convidado sem credenciais)
        // ou erro de persistência — apenas registra e segue.
        $app
          .logger()
          .error(
            'team_members role sync failed',
            'teamMemberId',
            e.record.id,
            'email',
            email,
            'error',
            err.message,
          )
      }
    }
  }

  return e.next()
}, 'team_members')
