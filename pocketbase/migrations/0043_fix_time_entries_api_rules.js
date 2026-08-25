migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('time_entries')
    col.createRule = "@request.auth.id != ''"
    col.updateRule = "@request.auth.id != ''"
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('time_entries')
    const masterRule = "@request.auth.role = 'admin' || @request.auth.role = 'master'"
    col.createRule = masterRule
    col.updateRule = masterRule
    app.save(col)
  },
)
