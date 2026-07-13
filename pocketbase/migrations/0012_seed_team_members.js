migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('team_members')
    var members = [
      { name: 'Ana Carolina Silva', function: 'Gerente de Projetos' },
      { name: 'Bruno Oliveira', function: 'Desenvolvedor Frontend' },
      { name: 'Carla Mendes', function: 'Designer UX/UI' },
      { name: 'Diego Fernandes', function: 'Analista de Negócios' },
      { name: 'Eduarda Lima', function: 'Desenvolvedora Backend' },
      { name: 'Felipe Santos', function: 'DevOps' },
    ]
    for (var i = 0; i < members.length; i++) {
      try {
        app.findFirstRecordByData('team_members', 'name', members[i].name)
      } catch (_) {
        var record = new Record(col)
        record.set('name', members[i].name)
        record.set('function', members[i].function)
        app.save(record)
      }
    }
  },
  (app) => {
    var col = app.findCollectionByNameOrId('team_members')
    app.truncateCollection(col)
  },
)
