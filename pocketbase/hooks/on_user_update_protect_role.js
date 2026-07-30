onRecordUpdate((e) => {
  const originalRole = e.record.original().getString('role')
  if (e.record.getString('role') !== originalRole) {
    e.record.set('role', originalRole)
  }
  e.next()
}, 'users')
