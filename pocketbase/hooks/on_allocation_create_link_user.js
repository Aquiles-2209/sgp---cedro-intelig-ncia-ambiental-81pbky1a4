onRecordCreate((e) => {
  var memberName = e.record.getString('member_name')
  if (!memberName) {
    e.next()
    return
  }
  memberName = memberName.trim()

  try {
    var teamMember = $app.findFirstRecordByData('team_members', 'name', memberName)
    var email = teamMember.getString('email')
    if (email) {
      try {
        var userRecord = $app.findAuthRecordByEmail('_pb_users_auth_', email)
        if (userRecord) {
          e.record.set('user', userRecord.id)
          e.next()
          return
        }
      } catch (_) {}
    }
  } catch (_) {}

  try {
    var allTeamMembers = $app.findRecordsByFilter('team_members', 'id != ""', 'name', 0, 0)
    for (var m = 0; m < allTeamMembers.length; m++) {
      var tm = allTeamMembers[m]
      var tmName = tm.getString('name')
      if (tmName && tmName.trim().toLowerCase() === memberName.toLowerCase()) {
        var tmEmail = tm.getString('email')
        if (tmEmail) {
          try {
            var userCI = $app.findAuthRecordByEmail('_pb_users_auth_', tmEmail)
            if (userCI) {
              e.record.set('user', userCI.id)
              e.next()
              return
            }
          } catch (_) {}
        }
      }
    }
  } catch (_) {}

  try {
    var allUsers = $app.findRecordsByFilter('_pb_users_auth_', 'id != ""', 'name', 0, 0)
    for (var u = 0; u < allUsers.length; u++) {
      var usr = allUsers[u]
      var uName = usr.getString('name')
      if (uName && uName.trim().toLowerCase() === memberName.toLowerCase()) {
        e.record.set('user', usr.id)
        e.next()
        return
      }
    }
  } catch (_) {}

  $app
    .logger()
    .warn('allocation auto-link: could not find user for member_name', 'member_name', memberName)
  e.next()
}, 'allocations')

onRecordUpdate((e) => {
  if (e.record.getString('user')) {
    var origName = e.record.original().getString('member_name')
    var currName = e.record.getString('member_name')
    if (origName === currName) {
      e.next()
      return
    }
  }

  var memberName = e.record.getString('member_name')
  if (!memberName) {
    e.next()
    return
  }
  memberName = memberName.trim()

  try {
    var teamMember = $app.findFirstRecordByData('team_members', 'name', memberName)
    var email = teamMember.getString('email')
    if (email) {
      try {
        var userRecord = $app.findAuthRecordByEmail('_pb_users_auth_', email)
        if (userRecord) {
          e.record.set('user', userRecord.id)
          e.next()
          return
        }
      } catch (_) {}
    }
  } catch (_) {}

  try {
    var allTeamMembers = $app.findRecordsByFilter('team_members', 'id != ""', 'name', 0, 0)
    for (var m = 0; m < allTeamMembers.length; m++) {
      var tm = allTeamMembers[m]
      var tmName = tm.getString('name')
      if (tmName && tmName.trim().toLowerCase() === memberName.toLowerCase()) {
        var tmEmail = tm.getString('email')
        if (tmEmail) {
          try {
            var userCI = $app.findAuthRecordByEmail('_pb_users_auth_', tmEmail)
            if (userCI) {
              e.record.set('user', userCI.id)
              e.next()
              return
            }
          } catch (_) {}
        }
      }
    }
  } catch (_) {}

  try {
    var allUsers = $app.findRecordsByFilter('_pb_users_auth_', 'id != ""', 'name', 0, 0)
    for (var u = 0; u < allUsers.length; u++) {
      var usr = allUsers[u]
      var uName = usr.getString('name')
      if (uName && uName.trim().toLowerCase() === memberName.toLowerCase()) {
        e.record.set('user', usr.id)
        e.next()
        return
      }
    }
  } catch (_) {}

  $app
    .logger()
    .warn(
      'allocation auto-link (update): could not find user for member_name',
      'member_name',
      memberName,
    )
  e.next()
}, 'allocations')
