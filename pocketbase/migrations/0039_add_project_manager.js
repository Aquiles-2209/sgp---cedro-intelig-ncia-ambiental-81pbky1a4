migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('projects')

    if (!col.fields.getByName('project_manager')) {
      col.fields.add(
        new RelationField({
          name: 'project_manager',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          minSelect: 0,
          maxSelect: 1,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('projects')
    const field = col.fields.getByName('project_manager')
    if (field) {
      col.fields.remove(field)
      app.save(col)
    }
  },
)
