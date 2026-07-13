migrate(
  (app) => {
    var tasksCollection = app.findCollectionByNameOrId('tasks')
    var teamMembersCollection = app.findCollectionByNameOrId('team_members')

    var collection = new Collection({
      name: 'task_assignments',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'task',
          type: 'relation',
          required: true,
          collectionId: tasksCollection.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'team_member',
          type: 'relation',
          required: true,
          collectionId: teamMembersCollection.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'start_date', type: 'date', required: false },
        { name: 'end_date', type: 'date', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_task_assignments_task ON task_assignments (task)',
        'CREATE INDEX idx_task_assignments_team_member ON task_assignments (team_member)',
      ],
    })
    app.save(collection)

    var taCol = app.findCollectionByNameOrId('task_assignments')
    var existingTasks = app.findRecordsByFilter('tasks', 'id != ""', '-created', 500, 0)
    for (var i = 0; i < existingTasks.length; i++) {
      var taskId = existingTasks[i].id
      var members = existingTasks[i].get('members')
      if (!members || members.length === 0) continue
      var tsd = existingTasks[i].getString('start_date') || ''
      var tdd = existingTasks[i].getString('due_date') || ''
      for (var j = 0; j < members.length; j++) {
        var memberId = members[j]
        try {
          app.findRecordById('team_members', memberId)
        } catch (_) {
          continue
        }
        var existing = app.findRecordsByFilter(
          'task_assignments',
          'task = "' + taskId + '" && team_member = "' + memberId + '"',
          '-created',
          1,
          0,
        )
        if (existing.length > 0) continue
        var taRecord = new Record(taCol)
        taRecord.set('task', taskId)
        taRecord.set('team_member', memberId)
        if (tsd) taRecord.set('start_date', tsd)
        if (tdd) taRecord.set('end_date', tdd)
        try {
          app.save(taRecord)
        } catch (_) {}
      }
    }
  },
  (app) => {
    var collection = app.findCollectionByNameOrId('task_assignments')
    app.delete(collection)
  },
)
