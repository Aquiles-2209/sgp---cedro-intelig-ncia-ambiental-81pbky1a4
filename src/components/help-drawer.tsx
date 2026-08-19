import { useState } from 'react'
import {
  FolderPlus,
  ListChecks,
  FileBarChart,
  ShieldCheck,
  FileSpreadsheet,
  HelpCircle,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

type TopicId = 'projeto' | 'tarefas' | 'relatorios' | 'permissoes' | 'importar'

interface Topic {
  id: TopicId
  emoji: string
  icon: typeof FolderPlus
  label: string
}

const TOPICS: Topic[] = [
  { id: 'projeto', emoji: '🏗️', icon: FolderPlus, label: 'Criar um Projeto' },
  { id: 'tarefas', emoji: '📝', icon: ListChecks, label: 'Criar e Gerenciar Tarefas' },
  { id: 'relatorios', emoji: '📊', icon: FileBarChart, label: 'Gerar Relatórios' },
  { id: 'permissoes', emoji: '👑', icon: ShieldCheck, label: 'Permissões de Usuários' },
  { id: 'importar', emoji: '📥', icon: FileSpreadsheet, label: 'Importar Planilha Excel' },
]

const PERMISSIONS: {
  feature: string
  master: boolean | 'partial'
  admin: boolean | 'partial'
  user: boolean | 'partial'
  note?: string
}[] = [
  {
    feature: 'Ver todos os projetos',
    master: true,
    admin: true,
    user: false,
    note: 'Usuário vê apenas alocados',
  },
  { feature: 'Criar/Editar projetos', master: true, admin: true, user: false },
  { feature: 'Criar/Editar tarefas', master: true, admin: true, user: false },
  { feature: 'Editar horas previstas após criação', master: true, admin: false, user: false },
  {
    feature: 'Usar Play/Pause',
    master: true,
    admin: true,
    user: 'partial',
    note: 'Com restrições',
  },
  { feature: 'Alterar role de usuários', master: true, admin: false, user: false },
  { feature: 'Importar planilhas', master: true, admin: true, user: false },
  { feature: 'Gerar relatórios', master: true, admin: true, user: false },
  { feature: 'Excluir projetos/tarefas', master: true, admin: true, user: false },
]

function PermCell({ value }: { value: boolean | 'partial' }) {
  if (value === 'partial') {
    return (
      <span className="inline-flex items-center justify-center text-amber-500">
        <AlertTriangle className="h-4 w-4" />
      </span>
    )
  }
  return value ? (
    <span className="inline-flex items-center justify-center text-emerald-600">
      <CheckCircle2 className="h-4 w-4" />
    </span>
  ) : (
    <span className="inline-flex items-center justify-center text-slate-300">
      <XCircle className="h-4 w-4" />
    </span>
  )
}

function SectionTitle({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 mb-4">
      <span className="text-2xl leading-none">{emoji}</span>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
    </div>
  )
}

function ProjetoContent() {
  return (
    <div>
      <SectionTitle emoji="🏗️" title="Criar um Projeto" />
      <p className="text-sm text-slate-600 mb-4">
        Siga o passo a passo abaixo para cadastrar um novo projeto no sistema.
      </p>
      <ol className="space-y-3">
        {[
          'No menu lateral, acesse "Projetos".',
          'Clique no botão "Novo Projeto" (disponível apenas para Admins e Masters).',
          'Preencha o Nome do projeto.',
          'Adicione uma Descrição com os detalhes e objetivos.',
          'Defina as Datas (início e fim previstos).',
          'Selecione o Gerente do Projeto (campo restrito a Admins).',
          'Clique em "Salvar" para criar o projeto.',
        ].map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-semibold">
              {i + 1}
            </span>
            <span className="text-sm text-slate-700 pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
      <div className="mt-5 rounded-lg bg-blue-50 border border-blue-100 p-3">
        <p className="text-sm text-blue-800">
          ✅ O projeto criado aparece imediatamente na lista de projetos e pode ser{' '}
          <strong>editado depois</strong> a qualquer momento (através do botão de edição dentro do
          projeto).
        </p>
      </div>
    </div>
  )
}

function TarefasContent() {
  return (
    <div>
      <SectionTitle emoji="📝" title="Criar e Gerenciar Tarefas" />
      <p className="text-sm text-slate-600 mb-4">
        As tarefas são gerenciadas dentro de cada projeto.
      </p>

      <h3 className="text-sm font-semibold text-slate-900 mb-2">Criar uma nova tarefa</h3>
      <ol className="space-y-2 mb-5">
        {[
          'Abra o projeto desejado e acesse a aba "Tarefas".',
          'Clique em "Nova Tarefa".',
          'Preencha: Nome, Descrição e Horas Previstas.',
          'Defina as Datas de início e fim da tarefa.',
          'Selecione os usuários da equipe que trabalharão nela.',
          'Salve a tarefa.',
        ].map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-[10px] font-semibold">
              {i + 1}
            </span>
            <span className="text-sm text-slate-700 pt-0.5">{step}</span>
          </li>
        ))}
      </ol>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Play className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-900">Botão Play / Pause</h3>
        </div>
        <p className="text-sm text-slate-600 mb-2">Cada tarefa possui um controle de timer:</p>
        <ul className="space-y-1.5 text-sm text-slate-700">
          <li className="flex gap-2">
            <Play className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Clique em <strong>Play</strong> para iniciar o contador de tempo da tarefa.
            </span>
          </li>
          <li className="flex gap-2">
            <Pause className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              Clique em <strong>Pause</strong> para parar o timer e registrar as horas trabalhadas.
            </span>
          </li>
        </ul>
      </div>

      <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 mb-5">
        <p className="text-sm text-emerald-800">
          ⏱️ As <strong>horas trabalhadas</strong> são somadas automaticamente ao usar Play/Pause —
          não é necessário lançar o tempo manualmente.
        </p>
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-amber-800">Restrições importantes</h3>
        </div>
        <ul className="space-y-1.5 text-sm text-amber-800">
          <li>
            Apenas <strong>Master</strong> pode editar as horas previstas após a criação da tarefa.
          </li>
          <li>
            Usuários não-Master só podem usar o <strong>Play</strong> se:
          </li>
          <ul className="ml-5 mt-1 space-y-1">
            <li>• Houver saldo de horas positivo no projeto/tarefa;</li>
            <li>• A data atual estiver dentro do período da tarefa.</li>
          </ul>
        </ul>
      </div>
    </div>
  )
}

function RelatoriosContent() {
  return (
    <div>
      <SectionTitle emoji="📊" title="Gerar Relatórios" />
      <p className="text-sm text-slate-600 mb-4">
        Gere relatórios detalhados de horas por projeto e período.
      </p>

      <h3 className="text-sm font-semibold text-slate-900 mb-2">Passo a passo</h3>
      <ol className="space-y-2 mb-5">
        {[
          'Acesse "Relatórios" no menu lateral (apenas Admins e Masters).',
          'Selecione os projetos desejados.',
          'Defina o período: data inicial e data final.',
          'Clique em "Gerar Relatório".',
        ].map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-[10px] font-semibold">
              {i + 1}
            </span>
            <span className="text-sm text-slate-700 pt-0.5">{step}</span>
          </li>
        ))}
      </ol>

      <h3 className="text-sm font-semibold text-slate-900 mb-2">Tabela do relatório</h3>
      <p className="text-sm text-slate-600 mb-3">
        O relatório exibe uma tabela com as seguintes colunas:
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate-200 mb-5">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                'Projeto',
                'Tarefa',
                'Usuário',
                'Setor',
                'Horas Previstas',
                'Horas Importadas',
                'Horas Trabalhadas (Play)',
                'Total Horas',
                'Saldo',
              ].map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-medium text-slate-700 whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-200">
              <td className="px-3 py-2 text-slate-500" colSpan={9}>
                Dados do relatório…
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-sm font-semibold text-slate-900 mb-2">Exportar</h3>
      <p className="text-sm text-slate-600">
        Após gerar o relatório, utilize os botões para exportar em <strong>Excel</strong> ou{' '}
        <strong>CSV</strong>.
      </p>
    </div>
  )
}

function PermissoesContent() {
  return (
    <div>
      <SectionTitle emoji="👑" title="Permissões de Usuários" />
      <p className="text-sm text-slate-600 mb-4">
        O sistema possui 3 níveis de permissão: <strong>Master</strong>, <strong>Admin</strong> e{' '}
        <strong>Usuário</strong>. A tabela abaixo mostra as funcionalidades disponíveis para cada
        perfil.
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium text-slate-700">Funcionalidade</th>
              <th className="px-3 py-2.5 text-center font-medium text-slate-700">Master</th>
              <th className="px-3 py-2.5 text-center font-medium text-slate-700">Admin</th>
              <th className="px-3 py-2.5 text-center font-medium text-slate-700">Usuário</th>
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((row, i) => (
              <tr
                key={row.feature}
                className={cn('border-t border-slate-100', i % 2 === 1 && 'bg-slate-50/40')}
              >
                <td className="px-3 py-2.5 text-slate-700">
                  <div>{row.feature}</div>
                  {row.note && <div className="text-xs text-slate-400">{row.note}</div>}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <PermCell value={row.master} />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <PermCell value={row.admin} />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <PermCell value={row.user} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Permitido
        </span>
        <span className="flex items-center gap-1.5">
          <XCircle className="h-4 w-4 text-slate-300" /> Não permitido
        </span>
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Com restrições
        </span>
      </div>
    </div>
  )
}

function ImportarContent() {
  const abas = [
    {
      nome: 'Projetos',
      colunas: ['Nome', 'Descrição', 'Data de Início', 'Data de Fim', 'Gerente'],
    },
    {
      nome: 'Equipe',
      colunas: ['Nome', 'E-mail', 'Setor', 'Role'],
    },
    {
      nome: 'Alocações',
      colunas: ['Projeto', 'Usuário', 'Horas Previstas'],
    },
    {
      nome: 'Tarefas',
      colunas: [
        'Projeto',
        'Nome da Tarefa',
        'Descrição',
        'Horas Previstas',
        'Início',
        'Fim',
        'Responsável',
      ],
    },
  ]
  return (
    <div>
      <SectionTitle emoji="📥" title="Importar Planilha Excel" />
      <p className="text-sm text-slate-600 mb-4">
        Importe dados em lote a partir de uma planilha Excel (.xlsx).
      </p>

      <h3 className="text-sm font-semibold text-slate-900 mb-2">Estrutura esperada da planilha</h3>
      <p className="text-sm text-slate-600 mb-3">
        O arquivo deve conter as seguintes abas com suas colunas obrigatórias:
      </p>
      <div className="space-y-2.5 mb-5">
        {abas.map((aba) => (
          <div key={aba.nome} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-slate-900">Aba “{aba.nome}”</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {aba.colunas.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center rounded-md bg-white border border-slate-200 px-2 py-0.5 text-xs text-slate-600"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <h3 className="text-sm font-semibold text-slate-900 mb-2">Processo</h3>
      <ol className="space-y-2 mb-5">
        {[
          'Acesse "Importar Dados" no menu lateral (apenas Admins e Masters).',
          'Selecione o arquivo .xlsx no seu computador.',
          'Clique em "Importar".',
          'Aguarde o processamento concluir.',
        ].map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-[10px] font-semibold">
              {i + 1}
            </span>
            <span className="text-sm text-slate-700 pt-0.5">{step}</span>
          </li>
        ))}
      </ol>

      <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-blue-800">Dicas</h3>
        </div>
        <ul className="space-y-1.5 text-sm text-blue-800">
          <li>
            Nomes de projetos iguais são <strong>atualizados</strong> (não duplicados) durante a
            importação.
          </li>
          <li>
            E-mails não diferenciam maiúsculas de minúsculas — o sistema identifica o usuário pelo
            e-mail independente do formato.
          </li>
        </ul>
      </div>
    </div>
  )
}

function TopicContent({ topic }: { topic: TopicId }) {
  switch (topic) {
    case 'projeto':
      return <ProjetoContent />
    case 'tarefas':
      return <TarefasContent />
    case 'relatorios':
      return <RelatoriosContent />
    case 'permissoes':
      return <PermissoesContent />
    case 'importar':
      return <ImportarContent />
    default:
      return null
  }
}

export function HelpDrawer() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<TopicId>('projeto')
  const activeTopic = TOPICS.find((t) => t.id === active) ?? TOPICS[0]

  return (
    <>
      <button
        type="button"
        aria-label="Ajuda"
        title="Ajuda / Tutoriais"
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-colors"
      >
        <HelpCircle className="h-[18px] w-[18px]" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-4xl sm:w-[640px] p-0 flex flex-col gap-0"
        >
          <SheetHeader className="border-b border-slate-200 px-5 py-4 space-y-0">
            <SheetTitle className="text-base font-semibold text-slate-900">
              Ajuda / Tutoriais
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-500">
              Selecione um tópico para visualizar as instruções.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 min-h-0 overflow-hidden">
            <nav className="w-60 shrink-0 border-r border-slate-200 bg-slate-50/60 p-3 overflow-y-auto">
              <ul className="space-y-1">
                {TOPICS.map((topic) => {
                  const isActive = topic.id === active
                  const Icon = topic.icon
                  return (
                    <li key={topic.id}>
                      <button
                        type="button"
                        onClick={() => setActive(topic.id)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                          isActive
                            ? 'bg-primary text-white font-medium shadow-sm'
                            : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900',
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0',
                            isActive ? 'text-white' : 'text-slate-400',
                          )}
                        />
                        <span className="flex-1">{topic.label}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </nav>

            <div className="flex-1 min-w-0 overflow-y-auto p-6">
              <div className="mb-4 flex items-center gap-2 text-xs text-slate-400">
                <span>{activeTopic.emoji}</span>
                <span>{activeTopic.label}</span>
              </div>
              <TopicContent topic={active} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
