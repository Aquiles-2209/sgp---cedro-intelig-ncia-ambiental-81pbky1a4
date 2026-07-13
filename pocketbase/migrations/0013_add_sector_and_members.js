migrate(
  (app) => {
    var tmCol = app.findCollectionByNameOrId('team_members')
    if (!tmCol.fields.getByName('setor')) {
      tmCol.fields.add(
        new SelectField({
          name: 'setor',
          required: true,
          values: ['Meio-Ambiente', 'Desenvolvimento Urbano', 'Administrativo'],
          maxSelect: 1,
        }),
      )
    }
    app.save(tmCol)

    var existing = app.findRecordsByFilter('team_members', 'id != ""', 'name', 500, 0)
    for (var i = 0; i < existing.length; i++) {
      if (!existing[i].getString('setor')) {
        existing[i].set('setor', 'Administrativo')
        app.save(existing[i])
      }
    }

    var tasksCol = app.findCollectionByNameOrId('tasks')
    if (!tasksCol.fields.getByName('members')) {
      tasksCol.fields.add(
        new RelationField({
          name: 'members',
          required: false,
          collectionId: app.findCollectionByNameOrId('team_members').id,
          cascadeDelete: false,
          minSelect: 0,
          maxSelect: 0,
        }),
      )
    }
    app.save(tasksCol)
  },
  (app) => {
    var tmCol = app.findCollectionByNameOrId('team_members')
    if (tmCol.fields.getByName('setor')) {
      tmCol.fields.removeByName('setor')
    }
    app.save(tmCol)

    var tasksCol = app.findCollectionByNameOrId('tasks')
    if (tasksCol.fields.getByName('members')) {
      tasksCol.fields.removeByName('members')
    }
    app.save(tasksCol)
  },
)
