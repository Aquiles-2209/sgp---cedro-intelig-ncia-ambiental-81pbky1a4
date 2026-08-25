// Notifica o gerente do projeto e admins/masters sobre alertas de horas e prazos
// após a criação de um novo lançamento de horas (time_entry via Play/manual).
//
// Alertas:
// 1. Alerta de 70% de horas: total trabalhado >= 70% das horas previstas
// 2. Alerta de 70% de prazo: período transcorrido (start_date até due_date) >= 70%
// 3. Alerta de 100% de horas (saldo negativo): total trabalhado > 100% das horas previstas
//
// Regras:
// - Deduplicação: se já existir notificação não lida do mesmo alerta para a mesma tarefa, não duplica.
// - Iniciais do usuário: extraídas do membro / usuário que realizou a ação ou está atribuído à tarefa.
// - Destinatários: Gerente do projeto + todos os Admins/Masters.
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

  // Obter iniciais do usuário associado
  function getInitialsFromName(fullName) {
    if (!fullName) return ''
    var parts = fullName.trim().split(/\s+/)
    var validParts = []
    for (var p = 0; p < parts.length; p++) {
      if (parts[p].length > 0) {
        validParts.push(parts[p])
      }
    }
    if (validParts.length === 0) return ''
    if (validParts.length === 1) {
      return validParts[0].charAt(0).toUpperCase() + '.'
    }
    var res = []
    for (var k = 0; k < validParts.length; k++) {
      res.push(validParts[k].charAt(0).toUpperCase() + '.')
    }
    return res.join('')
  }

  var userName = ''
  // 1. Tentar via team_member do time_entry
  var entryMemberId = entry.getString('team_member')
  if (entryMemberId) {
    try {
      var tm = $app.findRecordById('team_members', entryMemberId)
      userName = tm.getString('name') || ''
    } catch (_) {}
  }

  // 2. Tentar via allocation do time_entry
  if (!userName) {
    var entryAllocId = entry.getString('allocation')
    if (entryAllocId) {
      try {
        var alloc = $app.findRecordById('allocations', entryAllocId)
        userName = alloc.getString('member_name') || ''
        if (!userName) {
          var allocUserId = alloc.getString('user')
          if (allocUserId) {
            try {
              var u = $app.findRecordById('users', allocUserId)
              userName = u.getString('name') || ''
            } catch (_) {}
          }
        }
      } catch (_) {}
    }
  }

  // 3. Tentar via task.members ou task.allocation
  if (!userName) {
    var taskMemberIds = task.get('members')
    if (typeof taskMemberIds === 'string') {
      taskMemberIds = taskMemberIds ? [taskMemberIds] : []
    }
    if (Array.isArray(taskMemberIds) && taskMemberIds.length > 0) {
      try {
        var tm2 = $app.findRecordById('team_members', taskMemberIds[0])
        userName = tm2.getString('name') || ''
      } catch (_) {}
    }
  }

  if (!userName) {
    var taskAllocId = task.getString('allocation')
    if (taskAllocId) {
      try {
        var alloc2 = $app.findRecordById('allocations', taskAllocId)
        userName = alloc2.getString('member_name') || ''
      } catch (_) {}
    }
  }

  var userInitials = getInitialsFromName(userName)

  // Cálculo das horas trabalhadas
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

  // Destinatários: project_manager + todos os admins, masters e users
  var notifCol
  try {
    notifCol = $app.findCollectionByNameOrId('notifications')
  } catch (_) {
    return e.next()
  }

  var recipientMap = {}
  if (projectManagerId) {
    recipientMap[projectManagerId] = true
  }
  try {
    var usersToNotify = $app.findRecordsByFilter(
      '_pb_users_auth_',
      "role = 'admin' || role = 'master' || role = 'user'",
      '',
      0,
      0,
    )
    for (var a = 0; a < usersToNotify.length; a++) {
      recipientMap[usersToNotify[a].id] = true
    }
  } catch (_) {}

  var recipientIds = Object.keys(recipientMap)
  if (recipientIds.length === 0) return e.next()

  // Função auxiliar interna para verificar deduplicação e enviar notificação
  function sendAlertIfNotExists(alertTitle, alertContent) {
    var hasUnread = false
    try {
      var existing = $app.findRecordsByFilter(
        'notifications',
        'is_read = false && title = "' + alertTitle + '"',
        '-created',
        200,
        0,
      )
      for (var ex = 0; ex < existing.length; ex++) {
        var nContent = existing[ex].getString('content') || ''
        if (nContent.indexOf(taskTitle) !== -1) {
          hasUnread = true
          break
        }
      }
    } catch (_) {}

    if (hasUnread) return

    for (var r = 0; r < recipientIds.length; r++) {
      try {
        var notif = new Record(notifCol)
        notif.set('user', recipientIds[r])
        notif.set('title', alertTitle)
        notif.set('content', alertContent)
        notif.set('is_read', false)
        notif.set('type', 'Alert')
        $app.save(notif)
      } catch (_) {}
    }
  }

  // 1. Alerta de 70% de horas
  if (plannedHours > 0 && totalWorkedHours >= plannedHours * 0.7) {
    var content70Hours =
      "A tarefa '" +
      taskTitle +
      "' do projeto '" +
      projectName +
      "' atingiu 70% das horas previstas." +
      (userInitials ? ' Usuário: ' + userInitials : '')
    sendAlertIfNotExists('Alerta de 70% de horas', content70Hours)
  }

  // 2. Alerta de 70% de prazo (período entre start_date e due_date)
  var startDateStr = task.getString('start_date')
  var dueDateStr = task.getString('due_date')
  if (startDateStr && dueDateStr) {
    var startMs = new Date(startDateStr).getTime()
    var dueMs = new Date(dueDateStr).getTime()
    var nowMs = new Date().getTime()
    if (!isNaN(startMs) && !isNaN(dueMs) && dueMs > startMs) {
      var totalDurationMs = dueMs - startMs
      var elapsedMs = nowMs - startMs
      if (elapsedMs >= totalDurationMs * 0.7) {
        var content70Deadline =
          "O prazo da tarefa '" +
          taskTitle +
          "' do projeto '" +
          projectName +
          "' atingiu 70%." +
          (userInitials ? ' Usuário: ' + userInitials : '')
        sendAlertIfNotExists('Alerta de 70% do prazo', content70Deadline)
      }
    }
  }

  // 3. Alerta de 100% de horas (Saldo de horas negativo / horas ultrapassadas)
  if (plannedHours > 0 && totalWorkedHours > plannedHours) {
    var rounded = Math.round(totalWorkedHours * 100) / 100
    var content100 =
      'A tarefa "' +
      taskTitle +
      '" do projeto "' +
      projectName +
      '" ultrapassou as horas previstas. Previstas: ' +
      plannedHours +
      'h, Trabalhadas: ' +
      rounded +
      'h.' +
      (userInitials ? ' Usuário: ' + userInitials : '')
    sendAlertIfNotExists('Saldo de horas negativo', content100)
  }

  return e.next()
}, 'time_entries')
