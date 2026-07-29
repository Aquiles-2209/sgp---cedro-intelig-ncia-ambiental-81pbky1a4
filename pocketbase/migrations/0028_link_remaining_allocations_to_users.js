migrate(
  (app) => {
    var allocations = []
    try {
      allocations = app.findRecordsByFilter('allocations', 'id != ""', 'created', 0, 0)
    } catch (_) {
      return
    }

    for (var i = 0; i < allocations.length; i++) {
      var alloc = allocations[i]

      if (alloc.getString('user')) continue

      var memberName = alloc.getString('member_name')
      if (!memberName) continue

      memberName = memberName.trim()

      var userId = ''

      if (!userId) {
        try {
          var userByName = app.findFirstRecordByData('_pb_users_auth_', 'name', memberName)
          if (userByName) userId = userByName.id
        } catch (_) {}
      }

      if (!userId && memberName.indexOf('@') !== -1) {
        try {
          var userByEmail = app.findAuthRecordByEmail('_pb_users_auth_', memberName)
          if (userByEmail) userId = userByEmail.id
        } catch (_) {}
      }

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
      }
    }
  },
  (app) => {
    // Irreversible — cannot determine which allocations were linked
    // by this migration vs. set manually elsewhere.
  },
)
