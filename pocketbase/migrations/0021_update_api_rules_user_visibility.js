migrate(
  (app) => {
    const projectsCol = app.findCollectionByNameOrId('projects')
    projectsCol.listRule =
      "@request.auth.role = 'admin' || id = @collection.allocations.project ? user = @request.auth.id"
    projectsCol.viewRule =
      "@request.auth.role = 'admin' || id = @collection.allocations.project ? user = @request.auth.id"
    app.save(projectsCol)

    const tasksCol = app.findCollectionByNameOrId('tasks')
    tasksCol.listRule =
      "@request.auth.role = 'admin' || project = @collection.allocations.project ? user = @request.auth.id"
    tasksCol.viewRule =
      "@request.auth.role = 'admin' || project = @collection.allocations.project ? user = @request.auth.id"
    app.save(tasksCol)

    const allocationsCol = app.findCollectionByNameOrId('allocations')
    allocationsCol.listRule = "@request.auth.role = 'admin' || user = @request.auth.id"
    allocationsCol.viewRule = "@request.auth.role = 'admin' || user = @request.auth.id"
    app.save(allocationsCol)
  },
  (app) => {
    const projectsCol = app.findCollectionByNameOrId('projects')
    projectsCol.listRule = "@request.auth.id != ''"
    projectsCol.viewRule = "@request.auth.id != ''"
    app.save(projectsCol)

    const tasksCol = app.findCollectionByNameOrId('tasks')
    tasksCol.listRule = "@request.auth.id != ''"
    tasksCol.viewRule = "@request.auth.id != ''"
    app.save(tasksCol)

    const allocationsCol = app.findCollectionByNameOrId('allocations')
    allocationsCol.listRule = "@request.auth.id != ''"
    allocationsCol.viewRule = "@request.auth.id != ''"
    app.save(allocationsCol)
  },
)
