onRecordDeleteRequest((e) => {
  var task = e.record
  var taskId = task.id
  var projectId = task.getString('project')

  // Se não temos task ou project, prossegue com a deleção normal
  if (!taskId || !projectId) {
    return e.next()
  }

  // 1. Antes de excluir a tarefa, identificar todos os team_members atribuídos à tarefa
  var assignedTeamMemberIds = []

  // 1.1 Do relation field members da tarefa (se existir)
  var rawMembers = task.get('members')
  if (rawMembers) {
    if (typeof rawMembers === 'string') {
      assignedTeamMemberIds.push(rawMembers)
    } else if (Array.isArray(rawMembers)) {
      for (var m = 0; m < rawMembers.length; m++) {
        if (rawMembers[m]) assignedTeamMemberIds.push(rawMembers[m])
      }
    }
  }

  // 1.2 Dos task_assignments vinculados a esta tarefa
  var taskAssignments = []
  try {
    taskAssignments = $app.findRecordsByFilter(
      'task_assignments',
      'task = "' + taskId + '"',
      'created',
      0,
      0,
    )
  } catch (_) {
    taskAssignments = []
  }

  for (var i = 0; i < taskAssignments.length; i++) {
    var tmId = taskAssignments[i].getString('team_member')
    if (tmId && assignedTeamMemberIds.indexOf(tmId) === -1) {
      assignedTeamMemberIds.push(tmId)
    }
  }

  // 1.3 Se houver task_assignments desta tarefa, remover manualmente caso o cascade não tenha sido acionado
  // mas faremos isso após e.next() para garantir que a tarefa seja removida primeiro.

  // 2. Executar a exclusão da tarefa chamando e.next()
  e.next()

  // 3. Limpeza de task_assignments órfãos caso ainda existam
  try {
    var orphanAssignments = $app.findRecordsByFilter(
      'task_assignments',
      'task = "' + taskId + '"',
      'created',
      0,
      0,
    )
    for (var oi = 0; oi < orphanAssignments.length; oi++) {
      try {
        $app.delete(orphanAssignments[oi])
      } catch (_) {}
    }
  } catch (_) {}

  // 4. Após a exclusão da tarefa bem-sucedida, limpar/remover allocations caso o usuário/membro
  // não esteja alocado em NENHUMA outra tarefa deste mesmo projeto.
  if (assignedTeamMemberIds.length === 0) {
    return
  }

  try {
    // 4.1 Carregar todas as outras tarefas existentes neste mesmo projeto
    var otherTasks = []
    try {
      otherTasks = $app.findRecordsByFilter(
        'tasks',
        'project = "' + projectId + '" && id != "' + taskId + '"',
        'created',
        0,
        0,
      )
    } catch (_) {
      otherTasks = []
    }

    var otherTaskIds = []
    var otherTaskMembersSet = {}
    for (var t = 0; t < otherTasks.length; t++) {
      var ot = otherTasks[t]
      otherTaskIds.push(ot.id)
      var otMembers = ot.get('members')
      if (otMembers) {
        if (typeof otMembers === 'string') {
          otherTaskMembersSet[otMembers] = true
        } else if (Array.isArray(otMembers)) {
          for (var om = 0; om < otMembers.length; om++) {
            if (otMembers[om]) otherTaskMembersSet[otMembers[om]] = true
          }
        }
      }
    }

    // 4.2 Carregar todos os task_assignments ainda existentes para as outras tarefas do mesmo projeto
    var otherTaskAssignments = []
    if (otherTaskIds.length > 0) {
      // Buscar assignments pelas tarefas restantes
      try {
        var allAssignments = $app.findRecordsByFilter(
          'task_assignments',
          'task != "' + taskId + '"',
          'created',
          0,
          0,
        )
        for (var a = 0; a < allAssignments.length; a++) {
          var asgn = allAssignments[a]
          var asgnTaskId = asgn.getString('task')
          if (asgnTaskId && otherTaskIds.indexOf(asgnTaskId) !== -1) {
            otherTaskAssignments.push(asgn)
          }
        }
      } catch (_) {
        otherTaskAssignments = []
      }
    }

    var remainingActiveMemberIds = {}
    for (var k in otherTaskMembersSet) {
      remainingActiveMemberIds[k] = true
    }
    for (var ota = 0; ota < otherTaskAssignments.length; ota++) {
      var oTmId = otherTaskAssignments[ota].getString('team_member')
      if (oTmId) {
        remainingActiveMemberIds[oTmId] = true
      }
    }

    // 4.3 Buscar todas as alocações deste projeto
    var projectAllocations = []
    try {
      projectAllocations = $app.findRecordsByFilter(
        'allocations',
        'project = "' + projectId + '"',
        'created',
        0,
        0,
      )
    } catch (_) {
      projectAllocations = []
    }

    // 4.4 Para cada membro atribuído à tarefa excluída:
    for (var mi = 0; mi < assignedTeamMemberIds.length; mi++) {
      var memberId = assignedTeamMemberIds[mi]

      // Se o membro ainda possui outra tarefa no projeto, NÃO exclui a allocation
      if (remainingActiveMemberIds[memberId]) {
        continue
      }

      // Obter dados do team_member para encontrar usuário correspondente e alocação
      var memberName = ''
      var memberEmail = ''
      try {
        var teamMember = $app.findRecordById('team_members', memberId)
        memberName = (teamMember.getString('name') || '').trim()
        memberEmail = (teamMember.getString('email') || '').trim().toLowerCase()
      } catch (_) {}

      // Tentar resolver o userId do usuário correspondente (auth)
      var userId = ''
      if (memberEmail) {
        try {
          var userByEmail = $app.findAuthRecordByEmail('_pb_users_auth_', memberEmail)
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

      // Encontrar e excluir a(s) allocation(s) correspondente(s) desse membro no projeto
      for (var ai = 0; ai < projectAllocations.length; ai++) {
        var alloc = projectAllocations[ai]
        var allocUserId = alloc.getString('user')
        var allocMemberName = (alloc.getString('member_name') || '').trim()

        var isMatch = false
        if (userId && allocUserId && allocUserId === userId) {
          isMatch = true
        } else if (
          memberName &&
          allocMemberName &&
          allocMemberName.toLowerCase() === memberName.toLowerCase()
        ) {
          isMatch = true
        }

        if (isMatch) {
          try {
            $app.delete(alloc)
            $app
              .logger()
              .info(
                'allocation automatically removed upon task deletion',
                'projectId',
                projectId,
                'taskId',
                taskId,
                'allocationId',
                alloc.id,
                'memberName',
                memberName,
                'userId',
                userId,
              )
          } catch (delErr) {
            $app
              .logger()
              .error(
                'failed to delete allocation on task deletion',
                'allocationId',
                alloc.id,
                'error',
                delErr.message,
              )
          }
        }
      }
    }
  } catch (cleanupErr) {
    $app
      .logger()
      .error(
        'error during allocation cleanup on task deletion',
        'taskId',
        taskId,
        'error',
        cleanupErr.message,
      )
  }
}, 'tasks')
