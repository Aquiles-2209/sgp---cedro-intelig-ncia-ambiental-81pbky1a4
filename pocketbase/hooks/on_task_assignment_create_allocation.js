onRecordAfterCreateSuccess((e) => {
  var assignment = e.record
  var taskId = assignment.getString('task')
  var teamMemberId = assignment.getString('team_member')

  if (!taskId || !teamMemberId) {
    return e.next()
  }

  try {
    var task = $app.findRecordById('tasks', taskId)
    var projectId = task.getString('project')
    if (!projectId) {
      return e.next()
    }

    var project = $app.findRecordById('projects', projectId)
    var projStartDate = project.getString('start_date') || ''
    var projEndDate = project.getString('end_date') || ''

    var teamMember = $app.findRecordById('team_members', teamMemberId)
    var memberName = (teamMember.getString('name') || '').trim()
    var memberFunction = (teamMember.getString('function') || '').trim() || 'Usuário(a) CEDRO'
    var email = (teamMember.getString('email') || '').trim().toLowerCase()

    // 1. Tentar encontrar o user (auth) correspondente via e-mail ou fallback por nome
    var userId = ''
    if (email) {
      try {
        var userByEmail = $app.findAuthRecordByEmail('_pb_users_auth_', email)
        if (userByEmail) {
          userId = userByEmail.id
        }
      } catch (_) {}
    }

    if (!userId && memberName) {
      try {
        var allUsers = $app.findRecordsByFilter('_pb_users_auth_', 'id != ""', 'name', 0, 0)
        for (var u = 0; u < allUsers.length; u++) {
          var usr = allUsers[u]
          var uName = (usr.getString('name') || '').trim()
          if (uName && uName.toLowerCase() === memberName.toLowerCase()) {
            userId = usr.id
            break
          }
        }
      } catch (_) {}
    }

    // 2. Verificar se já existe uma allocation para esse usuário/membro no projeto
    var existingAllocations = []
    try {
      existingAllocations = $app.findRecordsByFilter(
        'allocations',
        'project = "' + projectId + '"',
        'created',
        0,
        0,
      )
    } catch (_) {
      existingAllocations = []
    }

    var alreadyAllocated = false
    for (var a = 0; a < existingAllocations.length; a++) {
      var existingAlloc = existingAllocations[a]
      var existingUserId = existingAlloc.getString('user')
      var existingMemberName = (existingAlloc.getString('member_name') || '').trim()

      if (userId && existingUserId && existingUserId === userId) {
        alreadyAllocated = true
        break
      }
      if (
        memberName &&
        existingMemberName &&
        existingMemberName.toLowerCase() === memberName.toLowerCase()
      ) {
        // Se a allocation existente não tiver user vinculado e encontramos o userId agora, vincula
        if (!existingUserId && userId) {
          try {
            existingAlloc.set('user', userId)
            $app.save(existingAlloc)
          } catch (_) {}
        }
        alreadyAllocated = true
        break
      }
    }

    if (alreadyAllocated) {
      return e.next()
    }

    // 3. Criar nova allocation vinculando ao projeto
    var allocCol = $app.findCollectionByNameOrId('allocations')
    var newAlloc = new Record(allocCol)
    newAlloc.set('project', projectId)
    newAlloc.set('member_name', memberName || 'Usuário(a) CEDRO')
    newAlloc.set('function', memberFunction)

    // Definir start_date e end_date coerentes com assignment/task/projeto
    var assignStart = assignment.getString('start_date')
    var taskStart = task.getString('start_date')
    var startDateToUse =
      assignStart ||
      taskStart ||
      projStartDate ||
      new Date().toISOString().split('T')[0] + ' 00:00:00.000Z'

    var assignEnd = assignment.getString('end_date')
    var taskEnd = task.getString('due_date')
    var endDateToUse = assignEnd || taskEnd || projEndDate || startDateToUse

    newAlloc.set('start_date', startDateToUse)
    newAlloc.set('end_date', endDateToUse)

    if (userId) {
      newAlloc.set('user', userId)
    }

    $app.save(newAlloc)
    $app
      .logger()
      .info(
        'allocation automatically created for task assignment',
        'project',
        projectId,
        'member',
        memberName,
        'user',
        userId,
      )
  } catch (err) {
    $app
      .logger()
      .error('error creating automatic allocation for task assignment', 'error', err.message)
  }

  return e.next()
}, 'task_assignments')
