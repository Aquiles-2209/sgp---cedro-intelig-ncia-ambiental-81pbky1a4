migrate(
  (app) => {
    var usersCollection = app.findCollectionByNameOrId('_pb_users_auth_')

    var collection = new Collection({
      name: 'notifications',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersCollection.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'text' },
        { name: 'is_read', type: 'bool' },
        {
          name: 'type',
          type: 'select',
          values: ['Info', 'Alert'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_notifications_user ON notifications (user)',
        'CREATE INDEX idx_notifications_is_read ON notifications (is_read)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    var collection = app.findCollectionByNameOrId('notifications')
    app.delete(collection)
  },
)
