migrate(
  (app) => {
    const tasksCol = app.findCollectionByNameOrId('tasks')
    if (!tasksCol.fields.getByName('start_date')) {
      tasksCol.fields.add(new DateField({ name: 'start_date' }))
    }
    app.save(tasksCol)

    const tasksCollection = app.findCollectionByNameOrId('tasks')
    const allocationsCollection = app.findCollectionByNameOrId('allocations')

    const timeEntriesCollection = new Collection({
      name: 'time_entries',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'task',
          type: 'relation',
          required: true,
          collectionId: tasksCollection.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'allocation',
          type: 'relation',
          required: true,
          collectionId: allocationsCollection.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'start_time', type: 'date', required: true },
        { name: 'end_time', type: 'date' },
        { name: 'duration', type: 'number', onlyInt: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_time_entries_task ON time_entries (task)',
        'CREATE INDEX idx_time_entries_allocation ON time_entries (allocation)',
        'CREATE INDEX idx_time_entries_end_time ON time_entries (end_time)',
      ],
    })
    app.save(timeEntriesCollection)
  },
  (app) => {
    const tasksCol = app.findCollectionByNameOrId('tasks')
    const startDateField = tasksCol.fields.getByName('start_date')
    if (startDateField) {
      tasksCol.fields.remove(startDateField)
    }
    app.save(tasksCol)

    try {
      const timeEntriesCol = app.findCollectionByNameOrId('time_entries')
      app.delete(timeEntriesCol)
    } catch (_) {}
  },
)
