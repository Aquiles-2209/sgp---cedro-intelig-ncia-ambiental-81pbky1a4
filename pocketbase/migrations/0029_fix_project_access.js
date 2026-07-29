migrate(
  (app) => {
    // 1. Ensure admin user has role = 'admin'
    try {
      var adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'aquilessouza1@hotmail.com')
      if (adminUser && adminUser.getString('role') !== 'admin') {
        adminUser.set('role', 'admin')
        app.save(adminUser)
      }
    } catch (_) {}

    // 2. Ensure all users have a role set (default to 'user')
    try {
      var allUsers = app.findRecordsByFilter('_pb_users_auth_', 'id != ""', 'created', 0, 0)
      for (var i = 0; i < allUsers.length; i++) {
        var u = allUsers[i]
        if (!u.getString('role')) {
          u.set('role', 'user')
          app.save(u)
        }
      }
    } catch (_) {}

    // 3. Re-link all allocations to users (more thorough than 0026/0028)
    var allocations = []
    try {
      allocations = app.findRecordsByFilter('allocations', 'id != ""', 'created', 0, 0)
    } catch (_) {
      allocations = []
    }

    for (var j = 0; j < allocations.length; j++) {
      var alloc = allocations[j]
      if (alloc.getString('user')) continue

      var memberName = alloc.getString('member_name')
      if (!memberName) continue
      memberName = memberName.trim()

      var userId = ''

      // Match by user name (exact)
      if (!userId) {
        try {
          var userByName = app.findFirstRecordByData('_pb_users_auth_', 'name', memberName)
          if (userByName) userId = userByName.id
        } catch (_) {}
      }

      // Match by user email (if member_name contains @)
      if (!userId && memberName.indexOf('@') !== -1) {
        try {
          var userByEmail = app.findAuthRecordByEmail('_pb_users_auth_', memberName)
          if (userByEmail) userId = userByEmail.id
        } catch (_) {}
      }

      // Match via team_members: name -> email -> user
      if (!userId) {
        try {
          var teamMember = app.findFirstRecordByData('team_members', 'name', memberName)
          if (teamMember) {
            var tmEmail = teamMember.getString('email')
            if (tmEmail) {
              try {
                var userRecord = app.findAuthRecordByEmail('_pb_users_auth_', tmEmail)
                if (userRecord) userId = userRecord.id
              } catch (_) {}
            }
          }
        } catch (_) {}
      }

      // Match via team_members: email = member_name -> user email
      if (!userId && memberName.indexOf('@') !== -1) {
        try {
          var tmByEmail = app.findFirstRecordByData('team_members', 'email', memberName)
          if (tmByEmail) {
            var tmEmail2 = tmByEmail.getString('email')
            if (tmEmail2) {
              try {
                var userRecord2 = app.findAuthRecordByEmail('_pb_users_auth_', tmEmail2)
                if (userRecord2) userId = userRecord2.id
              } catch (_) {}
            }
          }
        } catch (_) {}
      }

      // Case-insensitive name matching against users
      if (!userId) {
        try {
          var allUsersList = app.findRecordsByFilter('_pb_users_auth_', 'id != ""', 'name', 0, 0)
          for (var k = 0; k < allUsersList.length; k++) {
            var u2 = allUsersList[k]
            var uName = u2.getString('name')
            if (uName && uName.trim().toLowerCase() === memberName.toLowerCase()) {
              userId = u2.id
              break
            }
          }
        } catch (_) {}
      }

      // Case-insensitive name matching via team_members
      if (!userId) {
        try {
          var allTeamMembers = app.findRecordsByFilter('team_members', 'id != ""', 'name', 0, 0)
          for (var m = 0; m < allTeamMembers.length; m++) {
            var tm = allTeamMembers[m]
            var tmName = tm.getString('name')
            if (tmName && tmName.trim().toLowerCase() === memberName.toLowerCase()) {
              var tmEmail3 = tm.getString('email')
              if (tmEmail3) {
                try {
                  var userRecord3 = app.findAuthRecordByEmail('_pb_users_auth_', tmEmail3)
                  if (userRecord3) {
                    userId = userRecord3.id
                    break
                  }
                } catch (_) {}
              }
            }
          }
        } catch (_) {}
      }

      if (userId) {
        alloc.set('user', userId)
        app.save(alloc)
      }
    }

    // 4. Update projects API rules - allow all authenticated users to list/view
    //    Client-side filtering ensures non-admin users only see allocated projects
    var projectsCol = app.findCollectionByNameOrId('projects')
    projectsCol.listRule = "@request.auth.id != ''"
    projectsCol.viewRule = "@request.auth.id != ''"
    app.save(projectsCol)

    // 5. Update tasks API rules - same approach for consistency
    var tasksCol = app.findCollectionByNameOrId('tasks')
    tasksCol.listRule = "@request.auth.id != ''"
    tasksCol.viewRule = "@request.auth.id != ''"
    app.save(tasksCol)
  },
  (app) => {
    var projectsCol = app.findCollectionByNameOrId('projects')
    projectsCol.listRule =
      "@request.auth.role = 'admin' || (@collection.allocations.project = id && @collection.allocations.user = @request.auth.id)"
    projectsCol.viewRule =
      "@request.auth.role = 'admin' || (@collection.allocations.project = id && @collection.allocations.user = @request.auth.id)"
    app.save(projectsCol)

    var tasksCol = app.findCollectionByNameOrId('tasks')
    tasksCol.listRule =
      "@request.auth.role = 'admin' || (@collection.allocations.project = project && @collection.allocations.user = @request.auth.id)"
    tasksCol.viewRule =
      "@request.auth.role = 'admin' || (@collection.allocations.project = project && @collection.allocations.user = @request.auth.id)"
    app.save(tasksCol)
  },
)
