migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!usersCol.fields.getByName('role')) {
      usersCol.fields.add(
        new SelectField({
          name: 'role',
          values: ['admin', 'user'],
          maxSelect: 1,
        }),
      )
    }
    app.save(usersCol)

    try {
      const adminRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'aquilessouza1@hotmail.com')
      adminRecord.set('role', 'admin')
      app.save(adminRecord)
    } catch (_) {}

    const projectsCol = app.findCollectionByNameOrId('projects')
    projectsCol.createRule = "@request.auth.role = 'admin'"
    projectsCol.updateRule = "@request.auth.role = 'admin'"
    projectsCol.deleteRule = "@request.auth.role = 'admin'"
    app.save(projectsCol)

    const tasksCol = app.findCollectionByNameOrId('tasks')
    tasksCol.createRule = "@request.auth.role = 'admin'"
    tasksCol.updateRule = "@request.auth.role = 'admin'"
    tasksCol.deleteRule = "@request.auth.role = 'admin'"
    app.save(tasksCol)

    const teamMembersCol = app.findCollectionByNameOrId('team_members')
    teamMembersCol.createRule = "@request.auth.role = 'admin'"
    teamMembersCol.updateRule = "@request.auth.role = 'admin'"
    teamMembersCol.deleteRule = "@request.auth.role = 'admin'"
    app.save(teamMembersCol)

    const allocationsCol = app.findCollectionByNameOrId('allocations')
    allocationsCol.createRule = "@request.auth.role = 'admin'"
    allocationsCol.updateRule = "@request.auth.role = 'admin'"
    allocationsCol.deleteRule = "@request.auth.role = 'admin'"
    app.save(allocationsCol)

    const taskAssignmentsCol = app.findCollectionByNameOrId('task_assignments')
    taskAssignmentsCol.createRule = "@request.auth.role = 'admin'"
    taskAssignmentsCol.updateRule = "@request.auth.role = 'admin'"
    taskAssignmentsCol.deleteRule = "@request.auth.role = 'admin'"
    app.save(taskAssignmentsCol)
  },
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const roleField = usersCol.fields.getByName('role')
    if (roleField) {
      usersCol.fields.remove(roleField)
    }
    app.save(usersCol)

    const collections = ['projects', 'tasks', 'team_members', 'allocations', 'task_assignments']
    for (const name of collections) {
      const col = app.findCollectionByNameOrId(name)
      col.createRule = "@request.auth.id != ''"
      col.updateRule = "@request.auth.id != ''"
      col.deleteRule = "@request.auth.id != ''"
      app.save(col)
    }
  },
)
