migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('team_members')
    if (!col.fields.getByName('email')) {
      col.fields.add(
        new EmailField({
          name: 'email',
          required: false,
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    var col = app.findCollectionByNameOrId('team_members')
    if (col.fields.getByName('email')) {
      col.fields.removeByName('email')
    }
    app.save(col)
  },
)
