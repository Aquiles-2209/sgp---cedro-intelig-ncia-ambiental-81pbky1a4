onRecordAfterCreateSuccess((e) => {
  var email = e.record.getString('email')
  if (!email) {
    return e.next()
  }

  try {
    $app.findAuthRecordByEmail('_pb_users_auth_', email)
    return e.next()
  } catch (_) {}

  var name = e.record.getString('name')
  var role = e.record.getString('role') || 'user'
  if (role !== 'admin' && role !== 'user') {
    role = 'user'
  }
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
  } catch (err) {
    $app
      .logger()
      .error(
        'auto-invite failed for team member',
        'teamMemberId',
        e.record.id,
        'error',
        err.message,
      )
  }

  return e.next()
}, 'team_members')
