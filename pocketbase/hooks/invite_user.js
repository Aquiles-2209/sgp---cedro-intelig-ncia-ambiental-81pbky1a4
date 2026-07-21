routerAdd(
  'POST',
  '/backend/v1/invite-user',
  (e) => {
    var auth = e.auth
    if (!auth || auth.getString('role') !== 'admin') {
      return e.forbiddenError('Only admins can invite users')
    }

    var body = e.requestInfo().body || {}
    var name = (body.name || '').trim()
    var email = (body.email || '').trim()
    var role = body.role === 'admin' ? 'admin' : 'user'

    if (!name) {
      return e.badRequestError('Name is required')
    }
    if (!email) {
      return e.badRequestError('Email is required')
    }

    try {
      $app.findAuthRecordByEmail('_pb_users_auth_', email)
      return e.badRequestError('A user with this email already exists')
    } catch (_) {}

    var tempPassword = $security.randomString(12)

    try {
      var usersCol = $app.findCollectionByNameOrId('_pb_users_auth_')
      var record = new Record(usersCol)
      record.setEmail(email)
      record.setPassword(tempPassword)
      record.setVerified(true)
      record.set('name', name)
      record.set('role', role)
      $app.save(record)

      return e.json(201, {
        id: record.id,
        name: name,
        email: email,
        role: role,
        tempPassword: tempPassword,
      })
    } catch (err) {
      return e.internalServerError('Failed to create user: ' + err.message)
    }
  },
  $apis.requireAuth(),
)
