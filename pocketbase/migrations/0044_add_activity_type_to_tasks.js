migrate(
  (app) => {
    const tasksCol = app.findCollectionByNameOrId('tasks')
    if (!tasksCol.fields.getByName('activity_type')) {
      tasksCol.fields.add(
        new TextField({
          name: 'activity_type',
          required: false,
        }),
      )
    }
    app.save(tasksCol)
  },
  (app) => {
    const tasksCol = app.findCollectionByNameOrId('tasks')
    const field = tasksCol.fields.getByName('activity_type')
    if (field) {
      tasksCol.fields.remove(field)
    }
    app.save(tasksCol)
  },
)
