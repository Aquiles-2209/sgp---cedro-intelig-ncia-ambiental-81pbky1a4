onRecordUpdateRequest((e) => {
  const auth = e.requestInfo().auth
  if (!auth || auth.getString('role') !== 'admin') {
    const originalRole = e.record.original().getString('role')
    e.record.set('role', originalRole || 'user')
  }
  e.next()
}, 'users')
