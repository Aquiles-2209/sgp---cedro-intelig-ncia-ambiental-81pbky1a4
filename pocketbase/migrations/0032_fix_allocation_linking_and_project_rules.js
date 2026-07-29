migrate(
  (app) => {
    // 1. Build lookup maps from team_members and users for efficient matching
    var allTeamMembers = []
    try {
      allTeamMembers = app.findRecordsByFilter('team_members', 'id != ""', 'name', 0, 0)
    } catch (_) {
      allTeamMembers = []
    }

    var allUsers = []
    try {
      allUsers = app.findRecordsByFilter('_pb_users_auth_', 'id != ""', 'name', 0, 0)
    } catch (_) {
      allUsers = []
    }

    var tmNameToEmail = {}
    var tmEmailToName = {}
    for (var t = 0; t < allTeamMembers.length; t++) {
      var tm = allTeamMembers[t]
      var tmName = tm.getString('name').trim()
      var tmEmail = tm.getString('email').trim()
      if (tmName) {
        tmNameToEmail[tmName.toLowerCase()] = tmEmail
      }
      if (tmEmail) {
        tmEmailToName[tmEmail.toLowerCase()] = tmName
      }
    }

    var userNameToId = {}
    var userEmailToId = {}
    for (var u = 0; u < allUsers.length; u++) {
      var usr = allUsers[u]
      var uName = usr.getString('name').trim()
      var uEmail = usr.getString('email').trim()
      if (uName) {
        userNameToId[uName.toLowerCase()] = usr.id
      }
      if (uEmail) {
        userEmailToId[uEmail.toLowerCase()] = usr.id
      }
    }

    // 2. Link all allocations to users using three fallback strategies
    var allocations = []
    try {
      allocations = app.findRecordsByFilter('allocations', 'id != ""', 'created', 0, 0)
    } catch (_) {
      allocations = []
    }

    var unmatched = []

    for (var i = 0; i < allocations.length; i++) {
      var alloc = allocations[i]
      if (alloc.getString('user')) continue

      var memberName = alloc.getString('member_name')
      if (!memberName) {
        unmatched.push({ id: alloc.id, member_name: '(empty)' })
        continue
      }
      memberName = memberName.trim()
      var lowerName = memberName.toLowerCase()

      var userId = ''

      // Strategy 1: team_members name -> email -> users email
      if (!userId) {
        var tmEmail1 = tmNameToEmail[lowerName]
        if (tmEmail1) {
          userId = userEmailToId[tmEmail1.toLowerCase()] || ''
        }
      }

      // Strategy 2: users name (case-insensitive)
      if (!userId) {
        userId = userNameToId[lowerName] || ''
      }

      // Strategy 3: member_name is an email -> match directly to users email
      if (!userId && memberName.indexOf('@') !== -1) {
        userId = userEmailToId[lowerName] || ''
        // Also try: team_members email = member_name -> team_members name -> users name
        if (!userId) {
          var tmName3 = tmEmailToName[lowerName]
          if (tmName3) {
            userId = userNameToId[tmName3.toLowerCase()] || ''
          }
        }
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
      for (var j = 0; j < unmatched.length; j++) {
        console.log(
          '  Allocation ID: ' + unmatched[j].id + ' | member_name: ' + unmatched[j].member_name,
        )
      }
      console.log('Total unmatched: ' + unmatched.length)
    } else {
      console.log('All allocations have a valid user link.')
    }

    // 3. Set projects API rules - admin sees all, non-admin sees only allocated projects
    var projectsCol = app.findCollectionByNameOrId('projects')
    projectsCol.listRule =
      "@request.auth.role = 'admin' || (@collection.allocations.project = id && @collection.allocations.user = @request.auth.id)"
    projectsCol.viewRule =
      "@request.auth.role = 'admin' || (@collection.allocations.project = id && @collection.allocations.user = @request.auth.id)"
    app.save(projectsCol)

    // 4. Set allocations API rules - admin sees all, non-admin sees only their own
    var allocationsCol = app.findCollectionByNameOrId('allocations')
    allocationsCol.listRule = "@request.auth.role = 'admin' || user = @request.auth.id"
    allocationsCol.viewRule = "@request.auth.role = 'admin' || user = @request.auth.id"
    app.save(allocationsCol)
  },
  (app) => {
    var projectsCol = app.findCollectionByNameOrId('projects')
    projectsCol.listRule = "@request.auth.id != ''"
    projectsCol.viewRule = "@request.auth.id != ''"
    app.save(projectsCol)

    var allocationsCol = app.findCollectionByNameOrId('allocations')
    allocationsCol.listRule = "@request.auth.id != ''"
    allocationsCol.viewRule = "@request.auth.id != ''"
    app.save(allocationsCol)
  },
)
