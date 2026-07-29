migrate(
  (app) => {
    const allocationsCol = app.findCollectionByNameOrId('allocations')
    allocationsCol.listRule = "@request.auth.id != ''"
    allocationsCol.viewRule = "@request.auth.id != ''"
    app.save(allocationsCol)

    let unlinkedAllocs = []
    try {
      unlinkedAllocs = app.findRecordsByFilter('allocations', "user = '' || user = null", '', 0, 0)
    } catch (_) {}

    let allUsers = []
    try {
      allUsers = app.findRecordsByFilter('_pb_users_auth_', '', '', 0, 0)
    } catch (_) {}

    unlinkedAllocs.forEach((alloc) => {
      const memberName = (alloc.get('member_name') || '').trim().toLowerCase()
      if (!memberName) return

      const matchedUser = allUsers.find((u) => {
        const uName = (u.get('name') || '').trim().toLowerCase()
        const uEmail = (u.get('email') || '').trim().toLowerCase()
        return (
          uName === memberName ||
          uEmail === memberName ||
          (uName && memberName.includes(uName)) ||
          (uName && uName.includes(memberName))
        )
      })

      if (matchedUser) {
        alloc.set('user', matchedUser.id)
        app.save(alloc)
      }
    })

    let allProjects = []
    try {
      allProjects = app.findRecordsByFilter('projects', '', '', 0, 0)
    } catch (_) {}

    const defaultUser =
      allUsers.find((u) => u.get('email') === 'aquilessouza1@hotmail.com') || allUsers[0] || null

    allProjects.forEach((proj) => {
      const contractId = (proj.get('contract_id') || '').trim()
      const projName = (proj.get('name') || '').trim()

      const isProj7 =
        contractId === '00007' ||
        projName.includes('00007') ||
        projName.toLowerCase().includes('aquiles')
      const isProj8 =
        contractId === '00008' ||
        projName.includes('00008') ||
        projName.toLowerCase().includes('teste 2')

      if (isProj7 || isProj8) {
        let existingAllocs = []
        try {
          existingAllocs = app.findRecordsByFilter(
            'allocations',
            `project = "${proj.id}"`,
            '',
            0,
            0,
          )
        } catch (_) {}

        if (existingAllocs.length === 0 && defaultUser) {
          const record = new Record(allocationsCol)
          record.set('project', proj.id)
          record.set('member_name', defaultUser.get('name') || 'Aquiles Souza')
          record.set('function', 'Gerente de Projeto')
          record.set('start_date', proj.get('start_date') || '2026-07-13')
          record.set('end_date', proj.get('end_date') || '2027-07-13')
          record.set('user', defaultUser.id)
          app.save(record)
        }
      }
    })
  },
  (app) => {
    const allocationsCol = app.findCollectionByNameOrId('allocations')
    allocationsCol.listRule = "@request.auth.role = 'admin' || user ?= @request.auth.id"
    allocationsCol.viewRule = "@request.auth.role = 'admin' || user ?= @request.auth.id"
    app.save(allocationsCol)
  },
)
