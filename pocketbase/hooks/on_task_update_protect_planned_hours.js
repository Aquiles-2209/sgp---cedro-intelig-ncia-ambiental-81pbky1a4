onRecordUpdateRequest((e) => {
  var auth = e.requestInfo().auth
  var authRole = auth ? auth.getString('role') : ''

  // Only "master" may edit planned_hours after a task is created.
  if (authRole !== 'master') {
    var originalPlanned = e.record.original().getFloat('planned_hours')
    e.record.set('planned_hours', originalPlanned)
  }
  e.next()
}, 'tasks')
