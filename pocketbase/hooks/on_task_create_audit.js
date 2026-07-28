onRecordCreateRequest((e) => {
  const userId = e.auth?.id || ''
  const resourceName = e.record.getString('title') || ''
  e.next()
  if (!userId) return
  try {
    const col = $app.findCollectionByNameOrId('audit_logs')
    const rec = new Record(col)
    rec.set('user', userId)
    rec.set('action', 'CREATE')
    rec.set('resource_type', 'Tarefa')
    rec.set('resource_name', resourceName || 'Sem nome')
    $app.save(rec)
  } catch (err) {
    $app.logger().error('audit log failed', 'error', err.message)
  }
}, 'tasks')
