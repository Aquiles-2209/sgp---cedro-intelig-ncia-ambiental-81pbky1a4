migrate(
  (app) => {
    var projectsCol = app.findCollectionByNameOrId('projects')
    projectsCol.listRule = "@request.auth.id != ''"
    projectsCol.viewRule = "@request.auth.id != ''"
    app.save(projectsCol)
  },
  (app) => {
    var projectsCol = app.findCollectionByNameOrId('projects')
    projectsCol.listRule =
      "@request.auth.role = 'admin' || (@collection.allocations.project ?= id && @collection.allocations.user ?= @request.auth.id)"
    projectsCol.viewRule =
      "@request.auth.role = 'admin' || (@collection.allocations.project ?= id && @collection.allocations.user ?= @request.auth.id)"
    app.save(projectsCol)
  },
)
