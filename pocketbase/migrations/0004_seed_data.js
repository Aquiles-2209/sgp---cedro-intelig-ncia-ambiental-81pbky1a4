migrate(
  (app) => {
    const projectsCol = app.findCollectionByNameOrId('projects')
    const allocationsCol = app.findCollectionByNameOrId('allocations')

    try {
      app.findFirstRecordByData('projects', 'name', 'Renovação de Portal Corporativo')
      return
    } catch (_) {}

    var projectData = [
      {
        name: 'Renovação de Portal Corporativo',
        description:
          'Redesign completo e migracao do portal legado corporativo para nova stack com React e Node.js.',
        contract_id: 'CTR-2026-001',
        client: 'TechCorp S.A.',
        start_date: '2026-01-10',
        end_date: '2026-08-15',
        status: 'Em Andamento',
      },
      {
        name: 'Migracao de Dados para Nuvem',
        description: 'Migracao de bancos de dados on-premise para infraestrutura AWS.',
        contract_id: 'CTR-2026-042',
        client: 'Global Logistics',
        start_date: '2026-06-01',
        end_date: '2026-12-20',
        status: 'Planejado',
      },
      {
        name: 'Aplicativo de Entregas',
        description:
          'Desenvolvimento de app movel iOS e Android para rastreamento de entregas em tempo real.',
        contract_id: 'CTR-2025-119',
        client: 'FastDelivery BR',
        start_date: '2025-05-10',
        end_date: '2025-11-30',
        status: 'Concluído',
      },
    ]

    var projectIds = []
    for (var i = 0; i < projectData.length; i++) {
      var pd = projectData[i]
      var record = new Record(projectsCol)
      record.set('name', pd.name)
      record.set('description', pd.description)
      record.set('contract_id', pd.contract_id)
      record.set('client', pd.client)
      record.set('start_date', pd.start_date)
      record.set('end_date', pd.end_date)
      record.set('status', pd.status)
      app.save(record)
      projectIds.push(record.id)
    }

    var allocationData = [
      {
        project: 0,
        member_name: 'Carlos Silva',
        fn: 'Gerente de Projeto',
        start_date: '2026-01-10',
        end_date: '2026-08-15',
      },
      {
        project: 0,
        member_name: 'Ana Costa',
        fn: 'Desenvolvedora Frontend',
        start_date: '2026-01-15',
        end_date: '2026-07-30',
      },
      {
        project: 0,
        member_name: 'Bruno Santos',
        fn: 'Desenvolvedor Backend',
        start_date: '2026-02-01',
        end_date: '2026-08-10',
      },
      {
        project: 0,
        member_name: 'Mariana Lima',
        fn: 'UX Designer',
        start_date: '2026-01-10',
        end_date: '2026-05-30',
      },
      {
        project: 0,
        member_name: 'Roberto Alves',
        fn: 'UI Designer',
        start_date: '2026-03-01',
        end_date: '2026-06-15',
      },
      {
        project: 1,
        member_name: 'Fernanda Rocha',
        fn: 'DevOps Engineer',
        start_date: '2026-06-01',
        end_date: '2026-12-20',
      },
      {
        project: 2,
        member_name: 'Carlos Silva',
        fn: 'Tech Lead',
        start_date: '2025-05-10',
        end_date: '2025-11-30',
      },
      {
        project: 2,
        member_name: 'Ana Costa',
        fn: 'Mobile Developer',
        start_date: '2025-06-01',
        end_date: '2025-11-15',
      },
    ]

    for (var j = 0; j < allocationData.length; j++) {
      var ad = allocationData[j]
      var arecord = new Record(allocationsCol)
      arecord.set('project', projectIds[ad.project])
      arecord.set('member_name', ad.member_name)
      arecord.set('function', ad.fn)
      arecord.set('start_date', ad.start_date)
      arecord.set('end_date', ad.end_date)
      app.save(arecord)
    }
  },
  (app) => {
    try {
      app.truncateCollection(app.findCollectionByNameOrId('allocations'))
    } catch (_) {}
    try {
      app.truncateCollection(app.findCollectionByNameOrId('projects'))
    } catch (_) {}
  },
)
