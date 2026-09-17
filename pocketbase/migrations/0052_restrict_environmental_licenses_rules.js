migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('environmental_licenses')
    col.listRule = "@request.auth.role = 'admin' || @request.auth.role = 'master'"
    col.viewRule = "@request.auth.role = 'admin' || @request.auth.role = 'master'"
    col.createRule = "@request.auth.role = 'admin' || @request.auth.role = 'master'"
    col.updateRule = "@request.auth.role = 'admin' || @request.auth.role = 'master'"
    col.deleteRule = "@request.auth.role = 'admin' || @request.auth.role = 'master'"
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('environmental_licenses')
      col.listRule = "@request.auth.id != ''"
      col.viewRule = "@request.auth.id != ''"
      app.save(col)
    } catch (_) {}
  },
)
