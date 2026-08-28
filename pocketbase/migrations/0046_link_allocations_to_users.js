migrate(
  (app) => {
    // 1. Fetch all team_members and users to build mapping dictionaries
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

    // Map helper to normalize string for fuzzy matching (accents, lowercase, trimmed)
    var normalizeStr = function (str) {
      if (!str) return ''
      return str
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
    }

    var userByEmail = {}
    var userByName = {}
    var userList = []

    for (var u = 0; u < allUsers.length; u++) {
      var usr = allUsers[u]
      var uEmail = (usr.getString('email') || '').trim().toLowerCase()
      var uName = (usr.getString('name') || '').trim()
      var uNormName = normalizeStr(uName)

      if (uEmail) {
        userByEmail[uEmail] = usr.id
      }
      if (uNormName) {
        userByName[uNormName] = usr.id
      }
      userList.push({
        id: usr.id,
        email: uEmail,
        name: uName,
        normName: uNormName,
      })
    }

    var tmByExactName = {}
    var tmByNormName = {}
    var tmByEmail = {}
    var tmList = []

    for (var t = 0; t < allTeamMembers.length; t++) {
      var tm = allTeamMembers[t]
      var tmName = (tm.getString('name') || '').trim()
      var tmEmail = (tm.getString('email') || '').trim().toLowerCase()
      var tmNormName = normalizeStr(tmName)

      if (tmName) {
        tmByExactName[tmName.toLowerCase()] = tm
      }
      if (tmNormName) {
        tmByNormName[tmNormName] = tm
      }
      if (tmEmail) {
        tmByEmail[tmEmail] = tm
      }
      tmList.push({
        id: tm.id,
        name: tmName,
        normName: tmNormName,
        email: tmEmail,
      })
    }

    // Helper: find user by email or team_members match
    var resolveUserId = function (memberName) {
      if (!memberName) return ''
      var trimmed = memberName.trim()
      var lower = trimmed.toLowerCase()
      var norm = normalizeStr(trimmed)

      // 1. If member_name is an email
      if (lower.indexOf('@') !== -1) {
        if (userByEmail[lower]) return userByEmail[lower]
        // check team member email
        if (tmByEmail[lower] && tmByEmail[lower].getString('email')) {
          var tmEm = tmByEmail[lower].getString('email').trim().toLowerCase()
          if (userByEmail[tmEm]) return userByEmail[tmEm]
        }
      }

      // 2. Direct match on team_members exact or normalized name -> email -> user
      var tm = tmByExactName[lower] || tmByNormName[norm]
      if (tm) {
        var email = (tm.getString('email') || '').trim().toLowerCase()
        if (email && userByEmail[email]) {
          return userByEmail[email]
        }
      }

      // 3. Direct match on user by exact or normalized name
      if (userByName[norm]) {
        return userByName[norm]
      }

      // 4. Fuzzy / substring matching with team_members
      // E.g. "Regina Mueller Gonçalves" vs "Regina Muller Gonçalves"
      // or "Victor Bonjorno Nadal" vs "Victor Bongiorno Nadal"
      // or "Louse Natália Ribeiro" vs "Louise Natalia Ribeiro"
      for (var i = 0; i < tmList.length; i++) {
        var item = tmList[i]
        if (!item.email) continue
        var targetUser = userByEmail[item.email]
        if (!targetUser) continue

        // Check if normalized strings share high similarity / common words
        var words1 = norm.split(/\s+/).filter(function (w) {
          return w.length > 2
        })
        var words2 = item.normName.split(/\s+/).filter(function (w) {
          return w.length > 2
        })

        if (words1.length > 0 && words2.length > 0) {
          // Check first and last name match or major token overlap
          var first1 = words1[0]
          var first2 = words2[0]
          var last1 = words1[words1.length - 1]
          var last2 = words2[words2.length - 1]

          if (
            (first1 === first2 && last1 === last2) ||
            (first1.startsWith(first2.slice(0, 3)) && last1 === last2) ||
            item.normName.indexOf(norm) !== -1 ||
            norm.indexOf(item.normName) !== -1
          ) {
            return targetUser
          }
        }
      }

      // 5. Direct fuzzy / substring matching with users list
      for (var k = 0; k < userList.length; k++) {
        var uItem = userList[k]
        var uWords = uItem.normName.split(/\s+/).filter(function (w) {
          return w.length > 2
        })
        var mWords = norm.split(/\s+/).filter(function (w) {
          return w.length > 2
        })

        if (uWords.length > 0 && mWords.length > 0) {
          var uFirst = uWords[0]
          var mFirst = mWords[0]
          var uLast = uWords[uWords.length - 1]
          var mLast = mWords[mWords.length - 1]

          if (
            (uFirst === mFirst && uLast === mLast) ||
            (uFirst.startsWith(mFirst.slice(0, 3)) && uLast === mLast) ||
            uItem.normName.indexOf(norm) !== -1 ||
            norm.indexOf(uItem.normName) !== -1
          ) {
            return uItem.id
          }
        }
      }

      return ''
    }

    // 2. Fetch allocations where user is empty
    var allocations = []
    try {
      allocations = app.findRecordsByFilter(
        'allocations',
        "user = '' || user = null",
        'created',
        0,
        0,
      )
    } catch (_) {
      try {
        allocations = app.findRecordsByFilter('allocations', 'id != ""', 'created', 0, 0)
      } catch (_) {
        allocations = []
      }
    }

    var linkedCount = 0
    var unmatched = []

    for (var a = 0; a < allocations.length; a++) {
      var alloc = allocations[a]
      // Skip if already linked (defensive)
      var currentUserId = alloc.getString('user')
      if (currentUserId && currentUserId.trim() !== '') {
        continue
      }

      var memberName = alloc.getString('member_name')
      var matchedUserId = resolveUserId(memberName)

      if (matchedUserId) {
        alloc.set('user', matchedUserId)
        app.save(alloc)
        linkedCount++
      } else {
        unmatched.push({
          id: alloc.id,
          member_name: memberName || '(vazio)',
          project: alloc.getString('project'),
        })
      }
    }

    console.log('=== Migration 0046: Link Allocations to Users ===')
    console.log('Total allocations checked: ' + allocations.length)
    console.log('Allocations successfully linked: ' + linkedCount)

    if (unmatched.length > 0) {
      console.log('=== Unmatched allocations (' + unmatched.length + ') ===')
      for (var j = 0; j < unmatched.length; j++) {
        console.log(
          '  [Unmatched] ID: ' +
            unmatched[j].id +
            ' | Member: "' +
            unmatched[j].member_name +
            '" | Project: ' +
            unmatched[j].project,
        )
      }
    } else {
      console.log('All unlinked allocations were successfully linked to a user.')
    }
  },
  (app) => {
    // Irreversible: cannot distinguish which allocations were linked by this migration vs manual edits.
  },
)
