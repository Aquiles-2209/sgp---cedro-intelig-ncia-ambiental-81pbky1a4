onRecordCreateRequest((e) => {
  const auth = e.requestInfo().auth
  if (!auth || auth.getString('role') !== 'admin') {
    e.record.set('role', 'user')
  }
  e.next()
}, 'users')
