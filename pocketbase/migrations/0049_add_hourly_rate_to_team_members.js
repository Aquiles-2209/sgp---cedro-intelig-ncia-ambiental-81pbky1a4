migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('team_members')
    if (!col.fields.getByName('hourly_rate')) {
      col.fields.add(
        new NumberField({
          name: 'hourly_rate',
          required: false,
          min: 0,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('team_members')
    const field = col.fields.getByName('hourly_rate')
    if (field) {
      col.fields.removeById(field.id)
      app.save(col)
    }
  },
)
