migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('time_entries')

    var allocField = col.fields.getByName('allocation')
    if (allocField) {
      allocField.required = false
    }

    if (!col.fields.getByName('team_member')) {
      col.fields.add(
        new RelationField({
          name: 'team_member',
          required: false,
          collectionId: app.findCollectionByNameOrId('team_members').id,
          cascadeDelete: false,
          minSelect: 0,
          maxSelect: 1,
        }),
      )
    }

    col.addIndex('idx_time_entries_team_member', false, 'team_member', '')

    app.save(col)
  },
  (app) => {
    var col = app.findCollectionByNameOrId('time_entries')

    var allocField = col.fields.getByName('allocation')
    if (allocField) {
      allocField.required = true
    }

    var tmField = col.fields.getByName('team_member')
    if (tmField) {
      col.fields.remove(tmField)
    }

    col.removeIndex('idx_time_entries_team_member')

    app.save(col)
  },
)
