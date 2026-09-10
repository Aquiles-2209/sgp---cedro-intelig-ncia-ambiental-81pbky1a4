migrate(
  (app) => {
    const projectsCol = app.findCollectionByNameOrId('projects')

    const collection = new Collection({
      name: 'environmental_licenses',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'admin' || @request.auth.role = 'master'",
      updateRule: "@request.auth.role = 'admin' || @request.auth.role = 'master'",
      deleteRule: "@request.auth.role = 'admin' || @request.auth.role = 'master'",
      fields: [
        {
          name: 'project',
          type: 'relation',
          required: true,
          collectionId: projectsCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'license_type',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          type: 'text',
        },
        {
          name: 'validity_months',
          type: 'number',
        },
        {
          name: 'start_date',
          type: 'date',
        },
        {
          name: 'end_date',
          type: 'date',
          required: true,
        },
        {
          name: 'last_notified_period',
          type: 'text',
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_env_licenses_project ON environmental_licenses (project)',
        'CREATE INDEX idx_env_licenses_end_date ON environmental_licenses (end_date)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('environmental_licenses')
      app.delete(collection)
    } catch (_) {}
  },
)
