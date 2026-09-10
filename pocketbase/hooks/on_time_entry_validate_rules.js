onRecordCreateRequest((e) => {
  var entry = e.record
  var memberId = entry.getString('team_member')
  var taskId = entry.getString('task')
  var endTimeStr = entry.getString('end_time')

  // Se não houver membro associado diretamente no registro, tentar obter via alocação
  if (!memberId) {
    var allocId = entry.getString('allocation')
    if (allocId) {
      try {
        var allocRec = $app.findRecordById('allocations', allocId)
        var allocUserId = allocRec.getString('user')
        if (allocUserId) {
          try {
            var uRec = $app.findRecordById('users', allocUserId)
            var uEmail = uRec.getString('email')
            if (uEmail) {
              var tms = $app.findRecordsByFilter(
                'team_members',
                'email = "' + uEmail.replace(/"/g, '\\"') + '"',
                '',
                1,
                0,
              )
              if (tms.length > 0) {
                memberId = tms[0].id
              }
            }
          } catch (_) {}
        }
      } catch (_) {}
    }
  }

  // 1. REGRA 1: Bloqueio de Play simultâneo entre tarefas para o mesmo usuário/membro
  // Um timer ativo é um time_entry com end_time vazio/nulo (ou seja, iniciado com Play e ainda rodando)
  var isPlayStart = !endTimeStr

  if (isPlayStart && memberId) {
    try {
      var activeTimers = $app.findRecordsByFilter(
        'time_entries',
        'team_member = "' + memberId + '" && (end_time = "" || end_time = null)',
        '-created',
        5,
        0,
      )
      if (activeTimers && activeTimers.length > 0) {
        return e.badRequestError(
          'Já existe um cronômetro ativo em andamento para este usuário. Pause o cronômetro da outra tarefa antes de iniciar um novo.',
        )
      }
    } catch (err) {
      if (err.status) throw err
    }
  }

  // 2. REGRA 2: Limite diário de 08h30m (30600s) para atividades do tipo "Campo"
  // Período de 00:00 às 24:00 do dia do lançamento.
  if (taskId && memberId) {
    var taskRec
    try {
      taskRec = $app.findRecordById('tasks', taskId)
    } catch (_) {}

    var activityType = taskRec ? taskRec.getString('activity_type') : ''

    if (activityType === 'Campo') {
      var MAX_CAMPO_SECONDS = 8.5 * 3600 // 30600 segundos (08h30m)

      var startTimeStr = entry.getString('start_time')
      var entryStartDate = startTimeStr ? new Date(startTimeStr) : new Date()
      if (isNaN(entryStartDate.getTime())) {
        entryStartDate = new Date()
      }

      // Janela do dia em UTC para busca inicial ampla (+- 1 dia para cobrir qualquer timezone)
      var entryDuration = entry.getFloat('duration') || 0

      // Se for subtração manual (duration < 0), é permitida (reduz o saldo do dia)
      if (entryDuration < 0) {
        return e.next()
      }

      // Buscar entradas do membro nos últimos dias para filtrar localmente o dia civil
      // Usamos uma margem de segurança de 36h antes e 36h depois
      var windowStart = new Date(entryStartDate.getTime() - 36 * 3600 * 1000).toISOString()
      var windowEnd = new Date(entryStartDate.getTime() + 36 * 3600 * 1000).toISOString()

      var candidateEntries = []
      try {
        candidateEntries = $app.findRecordsByFilter(
          'time_entries',
          'team_member = "' +
            memberId +
            '" && start_time >= "' +
            windowStart +
            '" && start_time <= "' +
            windowEnd +
            '"',
          '-start_time',
          500,
          0,
        )
      } catch (_) {}

      // Mapear tarefas para verificar quais são do tipo "Campo"
      var taskCache = {}
      if (taskId && taskRec) {
        taskCache[taskId] = taskRec
      }

      var entryYear = entryStartDate.getUTCFullYear()
      var entryMonth = entryStartDate.getUTCMonth()
      var entryDay = entryStartDate.getUTCDate()

      var totalWorkedSecondsToday = 0

      for (var i = 0; i < candidateEntries.length; i++) {
        var te = candidateEntries[i]
        var teStartStr = te.getString('start_time')
        if (!teStartStr) continue
        var teStart = new Date(teStartStr)
        if (isNaN(teStart.getTime())) continue

        // Verificar se é o mesmo dia civil
        // Usar tanto UTC quanto horário padrão para compatibilidade de borda
        var isSameUtcDay =
          teStart.getUTCFullYear() === entryYear &&
          teStart.getUTCMonth() === entryMonth &&
          teStart.getUTCDate() === entryDay

        var isSameLocalDay =
          teStart.getFullYear() === entryStartDate.getFullYear() &&
          teStart.getMonth() === entryStartDate.getMonth() &&
          teStart.getDate() === entryStartDate.getDate()

        if (!isSameUtcDay && !isSameLocalDay) {
          continue
        }

        var teTaskId = te.getString('task')
        if (!teTaskId) continue

        if (!taskCache[teTaskId]) {
          try {
            taskCache[teTaskId] = $app.findRecordById('tasks', teTaskId)
          } catch (_) {
            taskCache[teTaskId] = null
          }
        }

        var teTask = taskCache[teTaskId]
        if (teTask && teTask.getString('activity_type') === 'Campo') {
          var dur = te.getFloat('duration') || 0
          // Se for timer ativo (sem end_time), contar o tempo decorrido até agora
          if (!te.getString('end_time') && dur === 0) {
            var diff = Math.floor((new Date().getTime() - teStart.getTime()) / 1000)
            dur = diff > 0 ? diff : 0
          }
          totalWorkedSecondsToday += dur
        }
      }

      // Se for tentativa de iniciar o Play (duration == 0, sem end_time)
      if (isPlayStart) {
        if (totalWorkedSecondsToday >= MAX_CAMPO_SECONDS) {
          return e.badRequestError(
            'Limite diário de 08h30m para atividades de Campo atingido. Não é possível iniciar nova contagem hoje.',
          )
        }
      } else {
        // Se for acréscimo manual (duration > 0)
        if (totalWorkedSecondsToday + entryDuration > MAX_CAMPO_SECONDS) {
          var remainingSec = Math.max(0, MAX_CAMPO_SECONDS - totalWorkedSecondsToday)
          var remainingHours = (remainingSec / 3600).toFixed(2).replace('.', ',')
          return e.badRequestError(
            'Limite diário de 08h30m para atividades de Campo excedido. Horas disponíveis restantes hoje: ' +
              remainingHours +
              'h.',
          )
        }
      }
    }
  }

  return e.next()
}, 'time_entries')
