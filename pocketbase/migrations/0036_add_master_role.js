migrate(
  (app) => {
    // 1. Add "master" to the role select field of the users collection
    //    (add() replaces existing fields by name, so this updates the select values in place)
    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    usersCol.fields.add(
      new SelectField({
        name: 'role',
        values: ['admin', 'user', 'master'],
        maxSelect: 1,
      }),
    )
    // Allow master to manage users alongside admin
    usersCol.updateRule =
      "id = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'master'"
    usersCol.deleteRule =
      "id = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'master'"
    app.save(usersCol)

    // 2. Add "master" to the role select field of team_members collection
    var tmCol = app.findCollectionByNameOrId('team_members')
    tmCol.fields.add(
      new SelectField({
        name: 'role',
        values: ['admin', 'user', 'master'],
        maxSelect: 1,
      }),
    )
    // Allow master to manage team members alongside admin
    tmCol.createRule = "@request.auth.role = 'admin' || @request.auth.role = 'master'"
    tmCol.updateRule = "@request.auth.role = 'admin' || @request.auth.role = 'master'"
    tmCol.deleteRule = "@request.auth.role = 'admin' || @request.auth.role = 'master'"
    app.save(tmCol)

    // 3. Update tasks API rules to allow master alongside admin
    var tasksCol = app.findCollectionByNameOrId('tasks')
    tasksCol.createRule = "@request.auth.role = 'admin' || @request.auth.role = 'master'"
    tasksCol.updateRule = "@request.auth.role = 'admin' || @request.auth.role = 'master'"
    tasksCol.deleteRule = "@request.auth.role = 'admin' || @request.auth.role = 'master'"
    // Allow master to read tasks (same as admin)
    tasksCol.listRule =
      "@request.auth.role = 'admin' || @request.auth.role = 'master' || (@collection.allocations.project ?= project && @collection.allocations.user ?= @request.auth.id)"
    tasksCol.viewRule =
      "@request.auth.role = 'admin' || @request.auth.role = 'master' || (@collection.allocations.project ?= project && @collection.allocations.user ?= @request.auth.id)"
    app.save(tasksCol)

    // 4. Set aquilessouza1@hotmail.com as role "master"
    try {
      var masterRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'aquilessouza1@hotmail.com')
      masterRecord.set('role', 'master')
      app.save(masterRecord)
    } catch (_) {}
  },
  (app) => {
    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    usersCol.fields.add(
      new SelectField({
        name: 'role',
        values: ['admin', 'user'],
        maxSelect: 1,
      }),
    )
    usersCol.updateRule = "id = @request.auth.id || @request.auth.role = 'admin'"
    usersCol.deleteRule = "id = @request.auth.id || @request.auth.role = 'admin'"
    app.save(usersCol)

    var tmCol = app.findCollectionByNameOrId('team_members')
    tmCol.fields.add(
      new SelectField({
        name: 'role',
        values: ['admin', 'user'],
        maxSelect: 1,
      }),
    )
    tmCol.createRule = "@request.auth.role = 'admin'"
    tmCol.updateRule = "@request.auth.role = 'admin'"
    tmCol.deleteRule = "@request.auth.role = 'admin'"
    app.save(tmCol)

    var tasksCol = app.findCollectionByNameOrId('tasks')
    tasksCol.createRule = "@request.auth.role = 'admin'"
    tasksCol.updateRule = "@request.auth.role = 'admin'"
    tasksCol.deleteRule = "@request.auth.role = 'admin'"
    tasksCol.listRule =
      "@request.auth.role = 'admin' || (@collection.allocations.project ?= project && @collection.allocations.user ?= @request.auth.id)"
    tasksCol.viewRule =
      "@request.auth.role = 'admin' || (@collection.allocations.project ?= project && @collection.allocations.user ?= @request.auth.id)"
    app.save(tasksCol)

    try {
      var masterRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'aquilessouza1@hotmail.com')
      masterRecord.set('role', 'admin')
      app.save(masterRecord)
    } catch (_) {}
  },
)
