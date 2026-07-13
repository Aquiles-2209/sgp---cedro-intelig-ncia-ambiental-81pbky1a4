onRecordAfterCreateSuccess((e) => {
  var task = e.record
  var title = task.getString('title')
  var allocationIds = task.get('allocation')
  if (!allocationIds) return e.next()
  if (typeof allocationIds === 'string') {
    allocationIds = allocationIds ? [allocationIds] : []
  }
  if (!Array.isArray(allocationIds) || allocationIds.length === 0) return e.next()

  try {
    var notifCol = $app.findCollectionByNameOrId('notifications')
  } catch (_) {
    return e.next()
  }

  for (var i = 0; i < allocationIds.length; i++) {
    try {
      var alloc = $app.findRecordById('allocations', allocationIds[i])
      var userId = alloc.getString('user')
      if (!userId) continue

      var notif = new Record(notifCol)
      notif.set('user', userId)
      notif.set('title', 'Nova tarefa atribuída')
      notif.set('content', 'Você foi atribuído à tarefa: ' + title)
      notif.set('is_read', false)
      notif.set('type', 'Info')
      $app.save(notif)
    } catch (_) {}
  }

  var dueDate = task.getString('due_date')
  if (dueDate) {
    var due = new Date(dueDate)
    if (!isNaN(due.getTime())) {
      var now = new Date()
      var diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24))
      if (diffDays >= 0 && diffDays <= 7) {
        for (var j = 0; j < allocationIds.length; j++) {
          try {
            var alloc2 = $app.findRecordById('allocations', allocationIds[j])
            var userId2 = alloc2.getString('user')
            if (!userId2) continue

            var notif2 = new Record(notifCol)
            notif2.set('user', userId2)
            notif2.set('title', 'Prazo de tarefa se aproximando')
            notif2.set('content', 'A tarefa "' + title + '" vence em ' + diffDays + ' dia(s)')
            notif2.set('is_read', false)
            notif2.set('type', 'Alert')
            $app.save(notif2)
          } catch (_) {}
        }
      }
    }
  }

  return e.next()
}, 'tasks')
