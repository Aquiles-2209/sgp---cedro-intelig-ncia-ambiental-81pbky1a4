migrate(
  (app) => {
    const projectsCol = app.findCollectionByNameOrId('projects')
    projectsCol.listRule =
      "@request.auth.role = 'admin' || (@collection.allocations.project = id && @collection.allocations.user = @request.auth.id)"
    projectsCol.viewRule =
      "@request.auth.role = 'admin' || (@collection.allocations.project = id && @collection.allocations.user = @request.auth.id)"
    app.save(projectsCol)

    const tasksCol = app.findCollectionByNameOrId('tasks')
    tasksCol.listRule =
      "@request.auth.role = 'admin' || (@collection.allocations.project = project && @collection.allocations.user = @request.auth.id)"
    tasksCol.viewRule =
      "@request.auth.role = 'admin' || (@collection.allocations.project = project && @collection.allocations.user = @request.auth.id)"
    app.save(tasksCol)
  },
  (app) => {
    const projectsCol = app.findCollectionByNameOrId('projects')
    projectsCol.listRule =
      "@request.auth.role = 'admin' || (@collection.allocations.project ?= id && @collection.allocations.user ?= @request.auth.id)"
    projectsCol.viewRule =
      "@request.auth.role = 'admin' || (@collection.allocations.project ?= id && @collection.allocations.user ?= @request.auth.id)"
    app.save(projectsCol)

    const tasksCol = app.findCollectionByNameOrId('tasks')
    tasksCol.listRule =
      "@request.auth.role = 'admin' || (@collection.allocations.project ?= project && @collection.allocations.user ?= @request.auth.id)"
    tasksCol.viewRule =
      "@request.auth.role = 'admin' || (@collection.allocations.project ?= project && @collection.allocations.user ?= @request.auth.id)"
    app.save(tasksCol)
  },
)
