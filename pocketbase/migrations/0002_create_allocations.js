migrate(
  (app) => {
    const projectsCollection = app.findCollectionByNameOrId('projects')
    const collection = new Collection({
      name: 'allocations',
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
        { name: 'member_name', type: 'text', required: true },
        { name: 'function', type: 'text', required: true },
        { name: 'start_date', type: 'date', required: true },
        { name: 'end_date', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_allocations_project ON allocations (project)',
        'CREATE INDEX idx_allocations_start_date ON allocations (start_date)',
        'CREATE INDEX idx_allocations_end_date ON allocations (end_date)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('allocations')
    app.delete(collection)
  },
)
