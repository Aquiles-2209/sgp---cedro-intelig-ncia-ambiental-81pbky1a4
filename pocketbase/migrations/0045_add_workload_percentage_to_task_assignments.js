migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('task_assignments')
    if (!col.fields.getByName('workload_percentage')) {
      col.fields.add(
        new NumberField({
          name: 'workload_percentage',
          min: 0,
          max: 100,
          required: false,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('task_assignments')
    col.fields.removeByName('workload_percentage')
    app.save(col)
  },
)
