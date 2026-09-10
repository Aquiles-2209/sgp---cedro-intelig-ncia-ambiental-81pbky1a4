cronAdd('check_environmental_licenses', '0 6 * * *', () => {
  try {
    var licensesCol = $app.findCollectionByNameOrId('environmental_licenses')
    var notificationsCol = $app.findCollectionByNameOrId('notifications')
    var usersCol = $app.findCollectionByNameOrId('_pb_users_auth_')
    var projectsCol = $app.findCollectionByNameOrId('projects')
  } catch (err) {
    console.log('[cron_check_environmental_licenses] Collections error:', err)
    return
  }

  // Find admin and master users
  var adminUsers = []
  try {
    adminUsers = $app.findRecordsByFilter(
      '_pb_users_auth_',
      "role = 'admin' || role = 'master'",
      '',
      200,
      0,
    )
  } catch (e) {
    console.log('[cron_check_environmental_licenses] Failed to query admin users:', e)
    return
  }

  if (!adminUsers || adminUsers.length === 0) {
    return
  }

  var licenses = []
  try {
    licenses = $app.findRecordsByFilter('environmental_licenses', '', '', 1000, 0)
  } catch (e) {
    console.log('[cron_check_environmental_licenses] Failed to query licenses:', e)
    return
  }

  var today = new Date()
  today.setHours(0, 0, 0, 0)

  for (var i = 0; i < licenses.length; i++) {
    var lic = licenses[i]
    var endDateStr = lic.getString('end_date')
    if (!endDateStr) continue

    var startDateStr = lic.getString('start_date')
    var endDate = new Date(endDateStr.split('T')[0] + 'T00:00:00')
    if (isNaN(endDate.getTime())) continue

    var startDate = null
    if (startDateStr) {
      startDate = new Date(startDateStr.split('T')[0] + 'T00:00:00')
      if (isNaN(startDate.getTime())) startDate = null
    }

    var totalValidityDays = 180
    if (startDate) {
      totalValidityDays = Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      )
    }

    var thresholdDays = totalValidityDays < 180 ? 30 : 180
    var diffTime = endDate.getTime() - today.getTime()
    var daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // Alert period: daysRemaining >= 0 && daysRemaining <= thresholdDays
    if (daysRemaining >= 0 && daysRemaining <= thresholdDays) {
      var currentPeriodKey = thresholdDays + 'd'
      var lastNotified = lic.getString('last_notified_period')

      if (lastNotified !== currentPeriodKey) {
        var projectId = lic.getString('project')
        var projectName = 'Projeto'
        try {
          var proj = $app.findRecordById('projects', projectId)
          if (proj) {
            projectName = proj.getString('name') || projectName
          }
        } catch (_) {}

        var licType = lic.getString('license_type')
        var desc = lic.getString('description')
        var displayType = licType
        if (licType === 'Outras' && desc) {
          displayType = 'Outras — ' + desc
        }

        var endFormatted = endDateStr.split('T')[0].split('-').reverse().join('/')

        var notifTitle = 'Licença Ambiental próxima do vencimento'
        var notifContent =
          'Licença Ambiental próxima do vencimento — Projeto: ' +
          projectName +
          ' — Licença: ' +
          displayType +
          ' — Vencimento: ' +
          endFormatted +
          ' — Prazo restante: ' +
          daysRemaining +
          ' dias. Providenciar renovação ou atualização da licença.'

        for (var u = 0; u < adminUsers.length; u++) {
          try {
            var n = new Record(notificationsCol)
            n.set('user', adminUsers[u].id)
            n.set('title', notifTitle)
            n.set('content', notifContent)
            n.set('is_read', false)
            n.set('type', 'Alert')
            $app.save(n)
          } catch (notifErr) {
            console.log(
              '[cron_check_environmental_licenses] Error creating notification:',
              notifErr,
            )
          }
        }

        lic.set('last_notified_period', currentPeriodKey)
        try {
          $app.save(lic)
        } catch (saveErr) {
          console.log('[cron_check_environmental_licenses] Error saving license period:', saveErr)
        }
      }
    }
  }
})
