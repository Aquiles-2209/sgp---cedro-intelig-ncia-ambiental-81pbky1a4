// Correção imediata do registro da Luana:
// team_members.role já é "master", mas users.role ficou "admin".
// Esta migration alinha users.role para "master" onde o email bate.
migrate(
  (app) => {
    try {
      var record = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'luanagabriela@cedrotbo.onmicrosoft.com',
      )
      record.set('role', 'master')
      app.save(record)
    } catch (err) {
      // Se o usuário não existir, não há o que corrigir.
    }
  },
  (app) => {
    try {
      var record = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'luanagabriela@cedrotbo.onmicrosoft.com',
      )
      record.set('role', 'admin')
      app.save(record)
    } catch (_) {}
  },
)
