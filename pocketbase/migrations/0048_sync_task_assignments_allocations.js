migrate(
  (app) => {
    var allocCol = app.findCollectionByNameOrId('allocations')

    // 1. Obter todos os usuários auth
    var allUsers = []
    try {
      allUsers = app.findRecordsByFilter('_pb_users_auth_', 'id != ""', 'name', 0, 0)
    } catch (_) {
      allUsers = []
    }

    var userByEmail = {}
    var userByName = {}
    for (var u = 0; u < allUsers.length; u++) {
      var usr = allUsers[u]
      var uEmail = (usr.getString('email') || '').trim().toLowerCase()
      var uName = (usr.getString('name') || '').trim().toLowerCase()
      if (uEmail) {
        userByEmail[uEmail] = usr.id
      }
      if (uName) {
        userByName[uName] = usr.id
      }
    }

    // 2. Obter todos os team_members
    var allTeamMembers = []
    try {
      allTeamMembers = app.findRecordsByFilter('team_members', 'id != ""', 'name', 0, 0)
    } catch (_) {
      allTeamMembers = []
    }

    var tmById = {}
    for (var t = 0; t < allTeamMembers.length; t++) {
      var tm = allTeamMembers[t]
      tmById[tm.id] = tm
    }

    // 3. Obter todos os projetos
    var allProjects = []
    try {
      allProjects = app.findRecordsByFilter('projects', 'id != ""', 'name', 0, 0)
    } catch (_) {
      allProjects = []
    }

    var projById = {}
    for (var p = 0; p < allProjects.length; p++) {
      var prj = allProjects[p]
      projById[prj.id] = prj
    }

    // 4. Obter todas as tarefas
    var allTasks = []
    try {
      allTasks = app.findRecordsByFilter('tasks', 'id != ""', 'created', 0, 0)
    } catch (_) {
      allTasks = []
    }

    var taskById = {}
    for (var k = 0; k < allTasks.length; k++) {
      var tsk = allTasks[k]
      taskById[tsk.id] = tsk
    }

    // 5. Obter todas as alocações existentes
    var allAllocations = []
    try {
      allAllocations = app.findRecordsByFilter('allocations', 'id != ""', 'created', 0, 0)
    } catch (_) {
      allAllocations = []
    }

    // Mapa de alocações existentes por projeto e chave (userId ou memberName)
    var allocMap = {}
    for (var a = 0; a < allAllocations.length; a++) {
      var alloc = allAllocations[a]
      var pId = alloc.getString('project')
      var aUserId = alloc.getString('user')
      var aName = (alloc.getString('member_name') || '').trim().toLowerCase()

      if (!allocMap[pId]) {
        allocMap[pId] = {
          byUserId: {},
          byName: {},
        }
      }

      if (aUserId) {
        allocMap[pId].byUserId[aUserId] = alloc
      }
      if (aName) {
        allocMap[pId].byName[aName] = alloc
      }
    }

    // 6. Obter todos os task_assignments
    var allAssignments = []
    try {
      allAssignments = app.findRecordsByFilter('task_assignments', 'id != ""', 'created', 0, 0)
    } catch (_) {
      allAssignments = []
    }

    var createdCount = 0
    var updatedCount = 0

    for (var i = 0; i < allAssignments.length; i++) {
      var assignment = allAssignments[i]
      var taskId = assignment.getString('task')
      var teamMemberId = assignment.getString('team_member')

      if (!taskId || !teamMemberId) continue

      var task = taskById[taskId]
      if (!task) continue

      var projectId = task.getString('project')
      if (!projectId) continue

      var project = projById[projectId]
      var projStart = project ? project.getString('start_date') : ''
      var projEnd = project ? project.getString('end_date') : ''

      var teamMember = tmById[teamMemberId]
      var memberName = teamMember ? (teamMember.getString('name') || '').trim() : ''
      var memberFunction = teamMember
        ? (teamMember.getString('function') || '').trim()
        : 'Usuário(a) CEDRO'
      var memberEmail = teamMember ? (teamMember.getString('email') || '').trim().toLowerCase() : ''

      // Resolver ID do usuário auth
      var userId = ''
      if (memberEmail && userByEmail[memberEmail]) {
        userId = userByEmail[memberEmail]
      } else if (memberName && userByName[memberName.toLowerCase()]) {
        userId = userByName[memberName.toLowerCase()]
      }

      if (!allocMap[projectId]) {
        allocMap[projectId] = {
          byUserId: {},
          byName: {},
        }
      }

      var existingAlloc = null
      if (userId && allocMap[projectId].byUserId[userId]) {
        existingAlloc = allocMap[projectId].byUserId[userId]
      } else if (memberName && allocMap[projectId].byName[memberName.toLowerCase()]) {
        existingAlloc = allocMap[projectId].byName[memberName.toLowerCase()]
      }

      if (existingAlloc) {
        // Se a alocação existe mas não está com user preenchido e temos userId, atualiza
        if (!existingAlloc.getString('user') && userId) {
          existingAlloc.set('user', userId)
          app.save(existingAlloc)
          allocMap[projectId].byUserId[userId] = existingAlloc
          updatedCount++
        }
        continue
      }

      // Alocação não existe, criar nova
      var newAlloc = new Record(allocCol)
      newAlloc.set('project', projectId)
      newAlloc.set('member_name', memberName || 'Usuário(a) CEDRO')
      newAlloc.set('function', memberFunction || 'Usuário(a) CEDRO')

      var assignStart = assignment.getString('start_date')
      var taskStart = task.getString('start_date')
      var startDateToUse =
        assignStart ||
        taskStart ||
        projStart ||
        new Date().toISOString().split('T')[0] + ' 00:00:00.000Z'

      var assignEnd = assignment.getString('end_date')
      var taskEnd = task.getString('due_date')
      var endDateToUse = assignEnd || taskEnd || projEnd || startDateToUse

      newAlloc.set('start_date', startDateToUse)
      newAlloc.set('end_date', endDateToUse)

      if (userId) {
        newAlloc.set('user', userId)
      }

      app.save(newAlloc)
      createdCount++

      if (userId) {
        allocMap[projectId].byUserId[userId] = newAlloc
      }
      if (memberName) {
        allocMap[projectId].byName[memberName.toLowerCase()] = newAlloc
      }
    }

    console.log('=== Migration 0048: Sync Task Assignments to Allocations ===')
    console.log('Total task assignments checked: ' + allAssignments.length)
    console.log('New allocations created: ' + createdCount)
    console.log('Existing allocations updated with user: ' + updatedCount)
  },
  (app) => {
    // Irreversível de forma segura sem risco de deletar alocações legítimas criadas manualmente
  },
)
