onRecordCreateRequest((e) => {
  var auth = e.requestInfo().auth
  var authRole = auth ? auth.getString('role') : ''
  if (authRole !== 'admin' && authRole !== 'master') {
    e.record.set('role', 'user')
  }
  e.next()
}, 'users')
