migrate(
  (app) => {
    const tasksCol = app.findCollectionByNameOrId('tasks')
    if (!tasksCol.fields.getByName('planned_hours')) {
      tasksCol.fields.add(new NumberField({ name: 'planned_hours', onlyInt: false }))
    }
    app.save(tasksCol)
  },
  (app) => {
    const tasksCol = app.findCollectionByNameOrId('tasks')
    const field = tasksCol.fields.getByName('planned_hours')
    if (field) {
      tasksCol.fields.remove(field)
    }
    app.save(tasksCol)
  },
)
