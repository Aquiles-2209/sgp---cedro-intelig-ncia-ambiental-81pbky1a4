migrate(
  (app) => {
    const allocations = app.findRecordsByFilter('allocations', 'member_name != ""', 'created', 0, 0)

    for (const alloc of allocations) {
      if (alloc.getString('user')) continue

      const memberName = alloc.getString('member_name')
      if (!memberName) continue

      let teamMember = null
      try {
        teamMember = app.findFirstRecordByData('team_members', 'name', memberName)
      } catch (_) {
        continue
      }

      if (!teamMember) continue

      const email = teamMember.getString('email')
      if (!email) continue

      let userRecord = null
      try {
        userRecord = app.findAuthRecordByEmail('_pb_users_auth_', email)
      } catch (_) {
        continue
      }

      if (!userRecord) continue

      alloc.set('user', userRecord.id)
      app.save(alloc)
    }
  },
  (app) => {
    // Irreversible — cannot reliably determine which allocations
    // were linked by this migration vs. set manually elsewhere.
  },
)
