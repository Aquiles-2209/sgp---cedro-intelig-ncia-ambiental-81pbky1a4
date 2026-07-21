migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('team_members')

    if (!col.fields.getByName('avatar')) {
      col.fields.add(
        new FileField({
          name: 'avatar',
          required: false,
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        }),
      )
    }

    app
      .db()
      .newQuery(
        "DELETE FROM team_members WHERE id NOT IN (SELECT MIN(id) FROM team_members WHERE email != '' GROUP BY email) AND email != ''",
      )
      .execute()

    col.addIndex('idx_team_members_email_unique', true, 'email', "email != ''")

    app.save(col)
  },
  (app) => {
    var col = app.findCollectionByNameOrId('team_members')

    var avatarField = col.fields.getByName('avatar')
    if (avatarField) {
      col.fields.remove(avatarField)
    }

    col.removeIndex('idx_team_members_email_unique')

    app.save(col)
  },
)
