migrate(
  (app) => {
    const tasksCol = app.findCollectionByNameOrId('tasks')
    tasksCol.listRule =
      "@request.auth.role = 'admin' || @request.auth.role = 'master' || (@collection.allocations.project ?= project && @collection.allocations.user ?= @request.auth.id) || (@collection.task_assignments.task ?= id && @collection.task_assignments.team_member.email ?= @request.auth.email)"
    tasksCol.viewRule =
      "@request.auth.role = 'admin' || @request.auth.role = 'master' || (@collection.allocations.project ?= project && @collection.allocations.user ?= @request.auth.id) || (@collection.task_assignments.task ?= id && @collection.task_assignments.team_member.email ?= @request.auth.email)"
    app.save(tasksCol)
  },
  (app) => {
    const tasksCol = app.findCollectionByNameOrId('tasks')
    tasksCol.listRule =
      "@request.auth.role = 'admin' || @request.auth.role = 'master' || (@collection.allocations.project ?= project && @collection.allocations.user ?= @request.auth.id)"
    tasksCol.viewRule =
      "@request.auth.role = 'admin' || @request.auth.role = 'master' || (@collection.allocations.project ?= project && @collection.allocations.user ?= @request.auth.id)"
    app.save(tasksCol)
  },
)
