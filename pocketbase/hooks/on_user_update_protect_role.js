onRecordUpdateRequest((e) => {
  var auth = e.requestInfo().auth
  var authRole = auth ? auth.getString('role') : ''

  // Only "master" can change the role of a user.
  if (authRole !== 'master') {
    var originalRole = e.record.original().getString('role')
    if (e.record.getString('role') !== originalRole) {
      e.record.set('role', originalRole)
    }
  }
  e.next()
}, 'users')
