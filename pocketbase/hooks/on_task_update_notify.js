onRecordAfterUpdateSuccess((e) => {
  var task = e.record
  var title = task.getString('title')
  var oldStatus = task.original().getString('status')
  var newStatus = task.getString('status')

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

  function notifyAllocs(msgTitle, msgContent, msgType) {
    for (var i = 0; i < allocationIds.length; i++) {
      try {
        var alloc = $app.findRecordById('allocations', allocationIds[i])
        var userId = alloc.getString('user')
        if (!userId) continue
        var notif = new Record(notifCol)
        notif.set('user', userId)
        notif.set('title', msgTitle)
        notif.set('content', msgContent)
        notif.set('is_read', false)
        notif.set('type', msgType)
        $app.save(notif)
      } catch (_) {}
    }
  }

  if (oldStatus !== newStatus) {
    notifyAllocs(
      'Status da tarefa atualizado',
      "A tarefa '" + title + "' mudou de " + oldStatus + ' para ' + newStatus,
      'Alert',
    )
  }

  var oldDueDate = task.original().getString('due_date')
  var newDueDate = task.getString('due_date')
  if (oldDueDate !== newDueDate && newDueDate) {
    var due = new Date(newDueDate)
    if (!isNaN(due.getTime())) {
      var now = new Date()
      var diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24))
      if (diffDays >= 0 && diffDays <= 7) {
        notifyAllocs(
          'Prazo de tarefa se aproximando',
          "A tarefa '" + title + "' vence em " + diffDays + ' dia(s)',
          'Alert',
        )
      }
    }
  }

  return e.next()
}, 'tasks')
