/**
 * 0050 — Confidencialidade do Valor Mensal (hourly_rate).
 *
 * O campo hourly_rate da collection team_members é confidencial:
 * apenas o usuário autorizado (aquilessouza1@hotmail.com, role master)
 * pode lê-lo via API. Todos os outros — inclusive outros Masters —
 * recebem o registro SEM o campo (o campo nem existe na resposta).
 *
 * A edição do Valor Mensal por Masters continua funcionando: regras de
 * escrita (create/update) permanecem admin|master e a validação do hook
 * onRecordEnrich só afeta a LEITURA (serialização das respostas).
 */
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('team_members')

    col.listRule = "@request.auth.id != ''"
    col.viewRule = "@request.auth.id != ''"
    col.createRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'master')"
    col.updateRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'master')"
    col.deleteRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'master')"

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('team_members')

    col.listRule = "@request.auth.id != ''"
    col.viewRule = "@request.auth.id != ''"
    col.createRule = "@request.auth.role = 'admin' || @request.auth.role = 'master'"
    col.updateRule = "@request.auth.role = 'admin' || @request.auth.role = 'master'"
    col.deleteRule = "@request.auth.role = 'admin' || @request.auth.role = 'master'"

    app.save(col)
  },
)
