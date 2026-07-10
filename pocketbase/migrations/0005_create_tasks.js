migrate(
  (app) => {
    const projectsCollection = app.findCollectionByNameOrId('projects')
    const allocationsCollection = app.findCollectionByNameOrId('allocations')
    const collection = new Collection({
      name: 'tasks',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'project',
          type: 'relation',
          required: true,
          collectionId: projectsCollection.id,
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
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['Pendente', 'Em Andamento', 'Concluído'],
          maxSelect: 1,
        },
        { name: 'due_date', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_tasks_project ON tasks (project)',
        'CREATE INDEX idx_tasks_allocation ON tasks (allocation)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('tasks')
    app.delete(collection)
  },
)
