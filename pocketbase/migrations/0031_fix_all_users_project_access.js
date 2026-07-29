migrate(
  (app) => {
    // 1. Fix allocation user links
    var allocations = []
    try {
      allocations = app.findRecordsByFilter('allocations', 'id != ""', 'created', 0, 0)
    } catch (_) {
      allocations = []
    }

    var unmatched = []

    for (var i = 0; i < allocations.length; i++) {
      var alloc = allocations[i]

      // Check if user field is empty
      if (alloc.getString('user')) continue

      var memberName = alloc.getString('member_name')
      if (!memberName) {
        unmatched.push({ id: alloc.id, member_name: '(empty)' })
        continue
      }
      memberName = memberName.trim()

      var userId = ''

      // Priority 1: Match via team_members name -> email -> users email (exact)
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

      // Priority 1b: Case-insensitive team_members name -> email -> users email
      if (!userId) {
        try {
          var allTeamMembers = app.findRecordsByFilter('team_members', 'id != ""', 'name', 0, 0)
          for (var m = 0; m < allTeamMembers.length; m++) {
            var tm = allTeamMembers[m]
            var tmName = tm.getString('name')
            if (tmName && tmName.trim().toLowerCase() === memberName.toLowerCase()) {
              var tmEmailCI = tm.getString('email')
              if (tmEmailCI) {
                try {
                  var userRecordCI = app.findAuthRecordByEmail('_pb_users_auth_', tmEmailCI)
                  if (userRecordCI) {
                    userId = userRecordCI.id
                    break
                  }
                } catch (_) {}
              }
            }
          }
        } catch (_) {}
      }

      // Priority 2: Match by users name (exact)
      if (!userId) {
        try {
          var userByName = app.findFirstRecordByData('_pb_users_auth_', 'name', memberName)
          if (userByName) userId = userByName.id
        } catch (_) {}
      }

      // Priority 2b: Match by users name (case-insensitive)
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

      // Priority 3: If member_name contains @, try matching as email directly
      if (!userId && memberName.indexOf('@') !== -1) {
        try {
          var userByEmail = app.findAuthRecordByEmail('_pb_users_auth_', memberName)
          if (userByEmail) userId = userByEmail.id
        } catch (_) {}
      }

      // Priority 3b: Try matching member_name against team_members email -> users email
      if (!userId && memberName.indexOf('@') !== -1) {
        try {
          var tmByEmail = app.findFirstRecordByData('team_members', 'email', memberName)
          if (tmByEmail) {
            var tmEmail3 = tmByEmail.getString('email')
            if (tmEmail3) {
              try {
                var userRecord3 = app.findAuthRecordByEmail('_pb_users_auth_', tmEmail3)
                if (userRecord3) userId = userRecord3.id
              } catch (_) {}
            }
          }
        } catch (_) {}
      }

      if (userId) {
        alloc.set('user', userId)
        app.save(alloc)
      } else {
        unmatched.push({ id: alloc.id, member_name: memberName })
      }
    }

    if (unmatched.length > 0) {
      console.log('=== Unmatched allocations (no user found) ===')
      for (var u = 0; u < unmatched.length; u++) {
        console.log(
          '  Allocation ID: ' + unmatched[u].id + ' | member_name: ' + unmatched[u].member_name,
        )
      }
      console.log('Total unmatched: ' + unmatched.length)
    } else {
      console.log('All allocations have a valid user link.')
    }

    // 2. Update projects API rules for server-side filtering
    var projectsCol = app.findCollectionByNameOrId('projects')
    projectsCol.listRule =
      "@request.auth.role = 'admin' || (@collection.allocations.project = id && @collection.allocations.user = @request.auth.id)"
    projectsCol.viewRule =
      "@request.auth.role = 'admin' || (@collection.allocations.project = id && @collection.allocations.user = @request.auth.id)"
    app.save(projectsCol)

    // 3. Update tasks API rules for consistency
    var tasksCol = app.findCollectionByNameOrId('tasks')
    tasksCol.listRule =
      "@request.auth.role = 'admin' || (@collection.allocations.project = project && @collection.allocations.user = @request.auth.id)"
    tasksCol.viewRule =
      "@request.auth.role = 'admin' || (@collection.allocations.project = project && @collection.allocations.user = @request.auth.id)"
    app.save(tasksCol)
  },
  (app) => {
    // Revert API rules
    var projectsCol = app.findCollectionByNameOrId('projects')
    projectsCol.listRule = "@request.auth.id != ''"
    projectsCol.viewRule = "@request.auth.id != ''"
    app.save(projectsCol)

    var tasksCol = app.findCollectionByNameOrId('tasks')
    tasksCol.listRule = "@request.auth.id != ''"
    tasksCol.viewRule = "@request.auth.id != ''"
    app.save(tasksCol)
  },
)
