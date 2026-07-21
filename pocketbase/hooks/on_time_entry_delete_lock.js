onRecordDeleteRequest((e) => {
  var auth = e.requestInfo().auth
  if (!auth || auth.getString('role') === 'admin') {
    e.next()
    return
  }

  var startTimeStr = e.record.getString('start_time')
  if (!startTimeStr) {
    e.next()
    return
  }

  var startTime = new Date(startTimeStr)
  var now = new Date()

  var isPreviousMonth =
    startTime.getFullYear() < now.getFullYear() ||
    (startTime.getFullYear() === now.getFullYear() && startTime.getMonth() < now.getMonth())

  if (isPreviousMonth) {
    return e.forbiddenError('Nao e permitido excluir lancamentos de horas de meses anteriores.')
  }

  e.next()
}, 'time_entries')
