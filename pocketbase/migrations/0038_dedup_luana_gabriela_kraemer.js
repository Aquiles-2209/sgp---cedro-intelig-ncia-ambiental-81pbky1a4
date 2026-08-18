// Elimina a conta duplicada de "Luana Gabriela Kraemer".
//
// Conta principal (mantida):
//   - users       id: 1d1pfvhoa5v9vs0  email: luanagabriela@cedrotbo.onmicrosoft.com
//   - team_members id: kwig90pvbr1vmqk
//
// Conta duplicada (removida):
//   - users       id: hbbyvpcolop9lal  email: luanagabriela@cedroambiental.com.br
//   - team_members id: 9clt0whaqymf8yv
//
// Passos:
//   1. Reatribui task_assignments do team_member duplicado para o principal
//      (evita duplicar atribuições para a mesma task).
//   2. Reatribui time_entries do team_member duplicado para o principal.
//   3. Exclui o registro duplicado de team_members.
//   4. Exclui o registro duplicado de users.
//
// Nenhuma alocação é tocada (todas já estão na conta principal) e nenhum
// projeto é alterado.
migrate(
  (app) => {
    var DUPE_TM = '9clt0whaqymf8yv'
    var MAIN_TM = 'kwig90pvbr1vmqk'
    var DUPE_USER = 'hbbyvpcolop9lal'

    // 1. Reatribuir task_assignments do team_member duplicado.
    //    Se já existir uma atribuição (mesma task) no team_member principal,
    //    removemos a duplicada em vez de reatribuir, para não criar conflito.
    var dupeAssignments = app.findRecordsByFilter(
      'task_assignments',
      "team_member = '" + DUPE_TM + "'",
      '',
      0,
      0,
    )

    for (var i = 0; i < dupeAssignments.length; i++) {
      var ta = dupeAssignments[i]
      var taskId = ta.getString('task')

      var alreadyAssigned = false
      try {
        var existing = app.findRecordsByFilter(
          'task_assignments',
          "team_member = '" + MAIN_TM + "' && task = '" + taskId + "'",
          '',
          1,
          0,
        )
        alreadyAssigned = existing.length > 0
      } catch (_) {}

      if (alreadyAssigned) {
        // Já existe atribuição equivalente no membro principal — descarta a duplicada.
        app.delete(ta)
      } else {
        ta.set('team_member', MAIN_TM)
        app.save(ta)
      }
    }

    // 2. Reatribuir time_entries do team_member duplicado para o principal.
    var dupeEntries = app.findRecordsByFilter(
      'time_entries',
      "team_member = '" + DUPE_TM + "'",
      '',
      0,
      0,
    )
    for (var j = 0; j < dupeEntries.length; j++) {
      var te = dupeEntries[j]
      te.set('team_member', MAIN_TM)
      app.save(te)
    }

    // 3. Excluir o registro duplicado de team_members.
    try {
      var dupeTmRecord = app.findFirstRecordByData('team_members', 'id', DUPE_TM)
      app.delete(dupeTmRecord)
    } catch (_) {}

    // 4. Excluir o registro duplicado de users.
    try {
      var dupeUserRecord = app.findFirstRecordByData('users', 'id', DUPE_USER)
      app.delete(dupeUserRecord)
    } catch (_) {}
  },
  (app) => {
    // Revert não recria a conta duplicada (não há como restaurar os dados originais);
    // a migration é destrutiva por natureza.
  },
)
