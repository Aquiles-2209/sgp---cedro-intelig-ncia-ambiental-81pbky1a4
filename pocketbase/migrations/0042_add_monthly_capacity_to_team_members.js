migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('team_members')
    if (!col.fields.getByName('monthly_capacity')) {
      col.fields.add(
        new NumberField({
          name: 'monthly_capacity',
          required: false,
          min: 0,
        }),
      )
      app.save(col)
    }

    // Atualiza membros existentes que não possuem monthly_capacity definido para o padrão 170
    app
      .db()
      .newQuery(
        'UPDATE team_members SET monthly_capacity = 170 WHERE monthly_capacity IS NULL OR monthly_capacity = 0',
      )
      .execute()
  },
  (app) => {
    const col = app.findCollectionByNameOrId('team_members')
    const field = col.fields.getByName('monthly_capacity')
    if (field) {
      col.fields.removeById(field.id)
      app.save(col)
    }
  },
)
