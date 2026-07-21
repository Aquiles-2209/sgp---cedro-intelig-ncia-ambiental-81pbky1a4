onRecordCreateRequest((e) => {
  var auth = e.auth
  if (!auth) {
    e.next()
    return
  }

  try {
    var auditCol = $app.findCollectionByNameOrId('audit_logs')
    var log = new Record(auditCol)
    log.set('user', auth.id)
    log.set('action', 'CREATE')
    log.set('resource_type', 'Project')
    log.set('resource_name', e.record.getString('name') || 'Unnamed')
    $app.save(log)
  } catch (err) {
    console.log('audit log failed: ' + err.message)
  }

  e.next()
}, 'projects')
