// Notifica o gerente do projeto (ou admins/masters) quando o total de horas
// trabalhadas em uma tarefa ultrapassa as horas previstas, após a criação de
// um novo lançamento de horas (time_entry).
//
// total trabalhado = (soma de time_entries.duration em segundos / 3600)
//                    + task.allocated_hours (em horas)
// Compara com task.planned_hours (em horas).
//
// A notificação é criada uma única vez por tarefa por dia (deduplicação por
// título + conteúdo mencionando a tarefa, no mesmo dia calendário).
onRecordAfterCreateSuccess((e) => {
  var entry = e.record
  var taskId = entry.getString('task')
  if (!taskId) return e.next()

  var task
  try {
    task = $app.findRecordById('tasks', taskId)
  } catch (_) {
    return e.next()
  }

  var plannedHours = task.getFloat('planned_hours') || 0
  if (plannedHours <= 0) return e.next()

  var allocatedHours = task.getFloat('allocated_hours') || 0

  var totalSeconds = 0
  try {
    var entries = $app.findRecordsByFilter(
      'time_entries',
      'task = "' + taskId + '"',
      '-created',
      0,
      0,
    )
    for (var i = 0; i < entries.length; i++) {
      totalSeconds += entries[i].getFloat('duration') || 0
    }
  } catch (_) {}

  var totalWorkedHours = totalSeconds / 3600 + allocatedHours
  if (totalWorkedHours <= plannedHours) return e.next()

  var taskTitle = task.getString('title') || ''
  var projectId = task.getString('project') || ''
  var projectName = ''
  var projectManagerId = ''
  if (projectId) {
    try {
      var project = $app.findRecordById('projects', projectId)
      projectName = project.getString('name') || ''
      projectManagerId = project.getString('project_manager') || ''
    } catch (_) {}
  }

  var rounded = Math.round(totalWorkedHours * 100) / 100
  var content =
    'A tarefa "' +
    taskTitle +
    '" do projeto "' +
    projectName +
    '" ultrapassou as horas previstas. Previstas: ' +
    plannedHours +
    'h, Trabalhadas: ' +
    rounded +
    'h.'

  // Deduplicação: não criar nova notificação se já existe uma "Saldo de horas
  // negativo" criada hoje que mencione esta tarefa.
  var now = new Date()
  var startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  var alreadyNotified = false
  try {
    var existing = $app.findRecordsByFilter(
      'notifications',
      'title = "Saldo de horas negativo"',
      '-created',
      200,
      0,
    )
    for (var j = 0; j < existing.length; j++) {
      var n = existing[j]
      var createdMs = new Date(n.getString('created')).getTime()
      if (!isNaN(createdMs) && createdMs >= startToday) {
        var nContent = n.getString('content') || ''
        if (nContent.indexOf(taskTitle) !== -1) {
          alreadyNotified = true
          break
        }
      }
    }
  } catch (_) {}

  if (alreadyNotified) return e.next()

  var notifCol
  try {
    notifCol = $app.findCollectionByNameOrId('notifications')
  } catch (_) {
    return e.next()
  }

  var recipientIds = []
  if (projectManagerId) {
    recipientIds.push(projectManagerId)
  } else {
    try {
      var admins = $app.findRecordsByFilter(
        '_pb_users_auth_',
        "role = 'admin' || role = 'master'",
        '',
        0,
        0,
      )
      for (var k = 0; k < admins.length; k++) {
        recipientIds.push(admins[k].id)
      }
    } catch (_) {}
  }

  for (var m = 0; m < recipientIds.length; m++) {
    try {
      var notif = new Record(notifCol)
      notif.set('user', recipientIds[m])
      notif.set('title', 'Saldo de horas negativo')
      notif.set('content', content)
      notif.set('is_read', false)
      notif.set('type', 'Alert')
      $app.save(notif)
    } catch (_) {}
  }

  return e.next()
}, 'time_entries')
