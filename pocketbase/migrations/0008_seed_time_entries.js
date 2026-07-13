migrate(
  (app) => {
    const timeEntriesCollection = app.findCollectionByNameOrId('time_entries')

    const tasks = app.findRecordsByFilter('tasks', 'id != ""', '-created', 100, 0)
    if (tasks.length === 0) return

    for (const task of tasks) {
      const allocId = task.getString('allocation')
      if (!allocId) continue

      var existing = app.findRecordsByFilter(
        'time_entries',
        'task = "' + task.id + '"',
        '-created',
        1,
        0,
      )
      if (existing.length > 0) continue

      var status = task.getString('status')
      var numEntries = status === 'Concluido' || status === 'Concluído' ? 2 : 1

      for (var i = 0; i < numEntries; i++) {
        var startTime = new Date()
        startTime.setDate(startTime.getDate() - (numEntries - i))
        startTime.setHours(9 + i * 4, 0, 0, 0)
        var duration = (i + 1) * 3600 + (i + 1) * 600
        var endTime = new Date(startTime.getTime() + duration * 1000)

        var record = new Record(timeEntriesCollection)
        record.set('task', task.id)
        record.set('allocation', allocId)
        record.set('start_time', startTime.toISOString())
        record.set('end_time', endTime.toISOString())
        record.set('duration', duration)
        app.save(record)
      }
    }
  },
  (app) => {
    try {
      var entries = app.findRecordsByFilter('time_entries', 'id != ""', '-created', 500, 0)
      for (var i = 0; i < entries.length; i++) {
        app.delete(entries[i])
      }
    } catch (_) {}
  },
)
