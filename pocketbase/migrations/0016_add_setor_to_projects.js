migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('projects')
    if (!col.fields.getByName('setor')) {
      col.fields.add(
        new SelectField({
          name: 'setor',
          required: false,
          values: ['Mineração', 'Geração de Energia', 'Infraestrutura'],
          maxSelect: 1,
        }),
      )
    }
    app.save(col)

    var existing = app.findRecordsByFilter('projects', 'id != ""', '-created', 500, 0)
    for (var i = 0; i < existing.length; i++) {
      if (!existing[i].getString('setor')) {
        existing[i].set('setor', 'Infraestrutura')
        app.save(existing[i])
      }
    }
  },
  (app) => {
    var col = app.findCollectionByNameOrId('projects')
    if (col.fields.getByName('setor')) {
      col.fields.removeByName('setor')
    }
    app.save(col)
  },
)
