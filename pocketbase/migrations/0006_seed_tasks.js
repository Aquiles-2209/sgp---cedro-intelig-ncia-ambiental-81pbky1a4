migrate(
  (app) => {
    const tasksCollection = app.findCollectionByNameOrId('tasks')

    const projects = app.findRecordsByFilter('projects', 'id != ""', '-created', 100, 0)
    if (projects.length === 0) return

    const allocations = app.findRecordsByFilter('allocations', 'id != ""', '-created', 200, 0)
    if (allocations.length === 0) return

    const seedTasks = [
      {
        title: 'Levantamento de Requisitos',
        description: 'Coletar e documentar todos os requisitos do projeto com o cliente.',
        status: 'Concluído',
      },
      {
        title: 'Análise de Viabilidade Ambiental',
        description: 'Avaliar impactos ambientais e apresentar relatório técnico.',
        status: 'Em Andamento',
      },
      {
        title: 'Elaboração de Cronograma Físico',
        description: 'Definir marcos e prazos para cada etapa da execução.',
        status: 'Pendente',
      },
      {
        title: 'Reunião de Alinhamento com Stakeholders',
        description: 'Apresentar plano de trabalho e obter validação dos envolvidos.',
        status: 'Pendente',
      },
    ]

    for (const project of projects) {
      const projAllocs = allocations.filter((a) => a.get('project') === project.id)
      if (projAllocs.length === 0) continue

      const d1 = new Date()
      d1.setDate(d1.getDate() + 14)
      const d2 = new Date()
      d2.setDate(d2.getDate() + 30)
      const d3 = new Date()
      d3.setDate(d3.getDate() + 7)
      const d4 = new Date()
      d4.setDate(d4.getDate() + 21)
      const taskDates = [d1, d2, d3, d4].map((d) => d.toISOString().split('T')[0])

      for (let i = 0; i < seedTasks.length && i < projAllocs.length; i++) {
        const alloc = projAllocs[i]
        const uniqueTitle = seedTasks[i].title + '_' + project.id
        try {
          app.findFirstRecordByData('tasks', 'title', uniqueTitle)
        } catch (_) {
          const record = new Record(tasksCollection)
          record.set('project', project.id)
          record.set('allocation', alloc.id)
          record.set('title', uniqueTitle)
          record.set('description', seedTasks[i].description)
          record.set('status', seedTasks[i].status)
          record.set('due_date', taskDates[i])
          app.save(record)
        }
      }
    }
  },
  (app) => {
    const tasks = app.findRecordsByFilter('tasks', 'id != ""', '-created', 500, 0)
    for (const t of tasks) {
      app.delete(t)
    }
  },
)
