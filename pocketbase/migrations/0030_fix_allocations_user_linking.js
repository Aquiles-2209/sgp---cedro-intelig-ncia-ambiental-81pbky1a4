migrate(
  (app) => {
    var allocations = []
    try {
      allocations = app.findRecordsByFilter('allocations', 'id != ""', 'created', 0, 0)
    } catch (_) {
      return
    }

    var unmatched = []

    for (var i = 0; i < allocations.length; i++) {
      var alloc = allocations[i]
      if (alloc.getString('user')) continue

      var memberName = alloc.getString('member_name')
      if (!memberName) continue
      memberName = memberName.trim()

      var userId = ''

      // 1. Match via team_members: name -> email -> users.email
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

      // 2. Match by user email (if member_name contains @)
      if (!userId && memberName.indexOf('@') !== -1) {
        try {
          var userByEmail = app.findAuthRecordByEmail('_pb_users_auth_', memberName)
          if (userByEmail) userId = userByEmail.id
        } catch (_) {}
      }

      // 3. Match by user name (exact)
      if (!userId) {
        try {
          var userByName = app.findFirstRecordByData('_pb_users_auth_', 'name', memberName)
          if (userByName) userId = userByName.id
        } catch (_) {}
      }

      // 4. Case-insensitive matching via team_members -> email -> user
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

      // 5. Case-insensitive name matching against users
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

      // 6. Match via team_members: email = member_name -> user email
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
    }
  },
  (app) => {
    // Irreversible — cannot determine which allocations were linked
    // by this migration vs. set manually elsewhere.
  },
)
