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

    var pbUrl = $secrets.get('PB_INSTANCE_URL') || ''
    if (pbUrl && pbUrl.indexOf('://') !== -1) {
      if (pbUrl.charAt(pbUrl.length - 1) === '/') {
        pbUrl = pbUrl.slice(0, -1)
      }
      try {
        var res = $http.send({
          url: pbUrl + '/api/collections/users/request-password-reset',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email }),
          timeout: 15,
        })
        if (res.statusCode !== 200) {
          $app
            .logger()
            .warn('invitation email may have failed', 'email', email, 'statusCode', res.statusCode)
        }
      } catch (mailErr) {
        $app
          .logger()
          .error('failed to send invitation email', 'email', email, 'error', mailErr.message)
      }
    }
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
