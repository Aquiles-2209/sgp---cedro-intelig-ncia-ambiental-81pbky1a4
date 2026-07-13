migrate(
  (app) => {
    var tasks = app.findRecordsByFilter('tasks', 'id != ""', '-created', 500, 0)
    var taskAllocMap = {}
    for (var i = 0; i < tasks.length; i++) {
      var allocId = tasks[i].getString('allocation')
      if (allocId) {
        taskAllocMap[tasks[i].id] = allocId
      }
    }

    var allocCol = app.findCollectionByNameOrId('allocations')
    if (!allocCol.fields.getByName('user')) {
      allocCol.fields.add(
        new RelationField({
          name: 'user',
          required: false,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }
    app.save(allocCol)

    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    usersCol.listRule = "@request.auth.id != ''"
    usersCol.viewRule = "@request.auth.id != ''"
    app.save(usersCol)

    var tasksCol = app.findCollectionByNameOrId('tasks')
    if (tasksCol.fields.getByName('allocation')) {
      tasksCol.fields.removeByName('allocation')
    }
    tasksCol.fields.add(
      new RelationField({
        name: 'allocation',
        required: false,
        collectionId: app.findCollectionByNameOrId('allocations').id,
        cascadeDelete: true,
        minSelect: 0,
        maxSelect: 0,
      }),
    )
    app.save(tasksCol)

    var updatedTasks = app.findRecordsByFilter('tasks', 'id != ""', '-created', 500, 0)
    for (var j = 0; j < updatedTasks.length; j++) {
      var savedAllocId = taskAllocMap[updatedTasks[j].id]
      if (savedAllocId) {
        updatedTasks[j].set('allocation', [savedAllocId])
        app.save(updatedTasks[j])
      }
    }
  },
  (app) => {
    var allocCol = app.findCollectionByNameOrId('allocations')
    if (allocCol.fields.getByName('user')) {
      allocCol.fields.removeByName('user')
    }
    app.save(allocCol)

    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    usersCol.listRule = 'id = @request.auth.id'
    usersCol.viewRule = 'id = @request.auth.id'
    app.save(usersCol)

    var tasksCol = app.findCollectionByNameOrId('tasks')
    if (tasksCol.fields.getByName('allocation')) {
      tasksCol.fields.removeByName('allocation')
    }
    tasksCol.fields.add(
      new RelationField({
        name: 'allocation',
        required: true,
        collectionId: app.findCollectionByNameOrId('allocations').id,
        cascadeDelete: true,
        maxSelect: 1,
      }),
    )
    app.save(tasksCol)
  },
)
