migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('team_members')
    if (!col.fields.getByName('role')) {
      col.fields.add(
        new SelectField({
          name: 'role',
          values: ['admin', 'user'],
          maxSelect: 1,
        }),
      )
    }
    app.save(col)

    // Backfill existing records with default role 'user'
    try {
      var existing = app.findRecordsByFilter('team_members', 'role = "" || role = null', '', 0, 0)
      for (var i = 0; i < existing.length; i++) {
        existing[i].set('role', 'user')
        app.saveNoValidate(existing[i])
      }
    } catch (_) {}
  },
  (app) => {
    const col = app.findCollectionByNameOrId('team_members')
    const roleField = col.fields.getByName('role')
    if (roleField) {
      col.fields.remove(roleField)
    }
    app.save(col)
  },
)
