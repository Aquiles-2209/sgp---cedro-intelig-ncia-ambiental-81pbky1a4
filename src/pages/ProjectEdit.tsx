import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import { useAppState } from '@/hooks/use-app-state'
import { ProjectStatus, normalizeDate } from '@/types/models'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/date-picker'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface LocalAlloc {
  id: string
  member_name: string
  function: string
  start_date: string
  end_date: string
  isNew: boolean
}

const statusOptions: ProjectStatus[] = ['Planejado', 'Em Andamento', 'Concluído']

export default function ProjectEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { projects, allocations, editProject, addAllocation, editAllocation, removeAllocation } =
    useAppState()
  const project = projects.find((p) => p.id === id)

  const [form, setForm] = useState({
    name: '',
    contract_id: '',
    client: '',
    start_date: '',
    end_date: '',
    status: 'Planejado' as ProjectStatus,
    description: '',
  })
  const [localAllocs, setLocalAllocs] = useState<LocalAlloc[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name,
        contract_id: project.contract_id,
        client: project.client,
        start_date: normalizeDate(project.start_date),
        end_date: normalizeDate(project.end_date),
        status: project.status,
        description: project.description,
      })
    }
  }, [project])

  useEffect(() => {
    if (id) {
      setLocalAllocs(
        allocations
          .filter((a) => a.project === id)
          .map((a) => ({
            id: a.id,
            member_name: a.member_name,
            function: a.function,
            start_date: normalizeDate(a.start_date),
            end_date: normalizeDate(a.end_date),
            isNew: false,
          })),
      )
    }
  }, [allocations, id])

  if (!project) return <div className="p-8 text-center">Projeto não encontrado.</div>

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }))
  const updateAlloc = (allocId: string, field: keyof LocalAlloc, value: string) =>
    setLocalAllocs((prev) => prev.map((a) => (a.id === allocId ? { ...a, [field]: value } : a)))
  const addAllocRow = () =>
    setLocalAllocs((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        member_name: '',
        function: '',
        start_date: form.start_date,
        end_date: form.end_date,
        isNew: true,
      },
    ])
  const removeAllocRow = (allocId: string) =>
    setLocalAllocs((prev) => prev.filter((a) => a.id !== allocId))

  const handleSave = async () => {
    setSaving(true)
    try {
      await editProject(id!, form)
      for (const alloc of localAllocs) {
        if (alloc.isNew && alloc.member_name) {
          await addAllocation({
            project: id,
            member_name: alloc.member_name,
            function: alloc.function,
            start_date: alloc.start_date,
            end_date: alloc.end_date,
          })
        } else if (!alloc.isNew) {
          const orig = allocations.find((a) => a.id === alloc.id)
          if (
            orig &&
            (orig.member_name !== alloc.member_name ||
              orig.function !== alloc.function ||
              normalizeDate(orig.start_date) !== alloc.start_date ||
              normalizeDate(orig.end_date) !== alloc.end_date)
          ) {
            await editAllocation(alloc.id, {
              member_name: alloc.member_name,
              function: alloc.function,
              start_date: alloc.start_date,
              end_date: alloc.end_date,
            })
          }
        }
      }
      const removed = allocations.filter(
        (a) => a.project === id && !localAllocs.find((la) => la.id === a.id),
      )
      for (const r of removed) {
        await removeAllocation(r.id)
      }
      navigate(`/projetos/${id}`)
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Editar Projeto</h1>
          <p className="text-slate-500 text-sm">Modifique detalhes e gerencie alocações.</p>
        </div>
      </div>
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 space-y-6">
          <h3 className="font-semibold text-lg text-slate-800 border-b border-slate-100 pb-2">
            Detalhes Básicos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Nome do Projeto</Label>
              <Input value={form.name} onChange={(e) => update('name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input value={form.client} onChange={(e) => update('client', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Número do Contrato</Label>
              <Input
                value={form.contract_id}
                onChange={(e) => update('contract_id', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <DatePicker value={form.start_date} onChange={(v) => update('start_date', v)} />
            </div>
            <div className="space-y-2">
              <Label>Data de Término</Label>
              <DatePicker value={form.end_date} onChange={(v) => update('end_date', v)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição e Objetivos</Label>
            <Textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-4">
            <h3 className="font-semibold text-lg text-slate-800">Alocações de Usuários CEDRO</h3>
            <Button type="button" variant="outline" size="sm" onClick={addAllocRow}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar Usuário CEDRO
            </Button>
          </div>
          {localAllocs.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">Nenhum Usuário CEDRO alocado.</p>
          )}
          {localAllocs.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead className="w-36">Início</TableHead>
                  <TableHead className="w-36">Término</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
            </Table>
          )}
          {localAllocs.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Usuário CEDRO</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead className="w-36">Início</TableHead>
                  <TableHead className="w-36">Término</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localAllocs.map((alloc) => (
                  <TableRow key={alloc.id}>
                    <TableCell>
                      <Input
                        value={alloc.member_name}
                        onChange={(e) => updateAlloc(alloc.id, 'member_name', e.target.value)}
                        className="h-9"
                        placeholder="Nome completo"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={alloc.function}
                        onChange={(e) => updateAlloc(alloc.id, 'function', e.target.value)}
                        className="h-9"
                        placeholder="Ex: Meio Ambiente"
                      />
                    </TableCell>
                    <TableCell>
                      <DatePicker
                        value={alloc.start_date}
                        onChange={(v) => updateAlloc(alloc.id, 'start_date', v)}
                        compact
                      />
                    </TableCell>
                    <TableCell>
                      <DatePicker
                        value={alloc.end_date}
                        onChange={(v) => updateAlloc(alloc.id, 'end_date', v)}
                        compact
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAllocRow(alloc.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </div>
  )
}
