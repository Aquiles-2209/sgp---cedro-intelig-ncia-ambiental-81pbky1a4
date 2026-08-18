migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('projects')
    col.createRule = "@request.auth.role = 'admin' || @request.auth.role = 'master'"
    col.updateRule = "@request.auth.role = 'admin' || @request.auth.role = 'master'"
    col.deleteRule = "@request.auth.role = 'admin' || @request.auth.role = 'master'"
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('projects')
    col.createRule = "@request.auth.role = 'admin'"
    col.updateRule = "@request.auth.role = 'admin'"
    col.deleteRule = "@request.auth.role = 'admin'"
    app.save(col)
  },
)
