migrate(
  (app) => {
    const collections = ['allocations', 'tasks', 'time_entries', 'task_assignments']
    const masterRule = "@request.auth.role = 'admin' || @request.auth.role = 'master'"
    const adminOnlyRule = "@request.auth.role = 'admin'"

    for (const name of collections) {
      const col = app.findCollectionByNameOrId(name)
      col.createRule = masterRule
      col.updateRule = masterRule
      col.deleteRule = masterRule
      app.save(col)
    }
  },
  (app) => {
    const collections = ['allocations', 'tasks', 'time_entries', 'task_assignments']
    const adminOnlyRule = "@request.auth.role = 'admin'"

    for (const name of collections) {
      const col = app.findCollectionByNameOrId(name)
      col.createRule = adminOnlyRule
      col.updateRule = adminOnlyRule
      col.deleteRule = adminOnlyRule
      app.save(col)
    }
  },
)
