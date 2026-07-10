import { Project, Team } from '@/types/models'

export const mockTeams: Team[] = [
  {
    id: 't1',
    name: 'Esquadrão Alpha',
    members: [
      {
        id: 'm1',
        name: 'Carlos Silva',
        role: 'Gerente de Projeto',
        avatar: 'https://img.usecurling.com/ppl/thumbnail?seed=1&gender=male',
      },
      {
        id: 'm2',
        name: 'Ana Costa',
        role: 'Desenvolvedora Frontend',
        avatar: 'https://img.usecurling.com/ppl/thumbnail?seed=2&gender=female',
      },
      {
        id: 'm3',
        name: 'Bruno Santos',
        role: 'Desenvolvedor Backend',
        avatar: 'https://img.usecurling.com/ppl/thumbnail?seed=3&gender=male',
      },
    ],
  },
  {
    id: 't2',
    name: 'Design Ops',
    members: [
      {
        id: 'm4',
        name: 'Mariana Lima',
        role: 'UX Designer',
        avatar: 'https://img.usecurling.com/ppl/thumbnail?seed=4&gender=female',
      },
      {
        id: 'm5',
        name: 'Roberto Alves',
        role: 'UI Designer',
        avatar: 'https://img.usecurling.com/ppl/thumbnail?seed=5&gender=male',
      },
    ],
  },
  {
    id: 't3',
    name: 'Cloud Infra',
    members: [
      {
        id: 'm6',
        name: 'Fernanda Rocha',
        role: 'DevOps Engineer',
        avatar: 'https://img.usecurling.com/ppl/thumbnail?seed=6&gender=female',
      },
    ],
  },
]

export const mockProjects: Project[] = [
  {
    id: 'p1',
    name: 'Renovação de Portal Corporativo',
    contractId: 'CTR-2026-001',
    client: 'TechCorp S.A.',
    startDate: '2026-01-10',
    endDate: '2026-08-15',
    status: 'Em Andamento',
    description:
      'Redesign completo e migração do portal legado corporativo para nova stack com React e Node.js. Inclui treinamento das equipes internas.',
    teamIds: ['t1', 't2'],
  },
  {
    id: 'p2',
    name: 'Migração de Dados para Nuvem',
    contractId: 'CTR-2026-042',
    client: 'Global Logistics',
    startDate: '2026-06-01',
    endDate: '2026-12-20',
    status: 'Planejado',
    description:
      'Migração de bancos de dados on-premise para infraestrutura AWS. Estruturação de pipelines CI/CD.',
    teamIds: ['t3'],
  },
  {
    id: 'p3',
    name: 'Aplicativo de Entregas',
    contractId: 'CTR-2025-119',
    client: 'FastDelivery BR',
    startDate: '2025-05-10',
    endDate: '2025-11-30',
    status: 'Concluído',
    description:
      'Desenvolvimento de app móvel iOS e Android para rastreamento de entregas em tempo real.',
    teamIds: ['t1'],
  },
]
