routerAdd(
  'POST',
  '/backend/v1/team-members/{id}/credentials',
  (e) => {
    var auth = e.auth
    if (!auth || auth.getString('role') !== 'admin') {
      return e.forbiddenError('Only admins can access credentials')
    }

    var tmId = e.request.pathValue('id')

    var tmRecord
    try {
      tmRecord = $app.findRecordById('team_members', tmId)
    } catch (_) {
      return e.notFoundError('Team member not found')
    }

    var email = tmRecord.getString('email')
    if (!email) {
      return e.badRequestError('Team member has no email')
    }

    var name = tmRecord.getString('name')
    var role = tmRecord.getString('role') || 'user'
    if (role !== 'admin' && role !== 'user') {
      role = 'user'
    }

    var tempPassword = $security.randomString(12)
    var accessUrl =
      $secrets.get('SITE_URL') || 'https://gestao-de-projetos-e-equipes-1aaac.goskip.app'

    try {
      var userRecord = $app.findAuthRecordByEmail('_pb_users_auth_', email)
      userRecord.setPassword(tempPassword)
      $app.save(userRecord)
    } catch (_) {
      var usersCol = $app.findCollectionByNameOrId('_pb_users_auth_')
      var newRecord = new Record(usersCol)
      newRecord.setEmail(email)
      newRecord.setPassword(tempPassword)
      newRecord.setVerified(true)
      newRecord.set('name', name)
      newRecord.set('role', role)
      $app.save(newRecord)
    }

    return e.json(200, {
      email: email,
      tempPassword: tempPassword,
      accessUrl: accessUrl,
    })
  },
  $apis.requireAuth(),
)
