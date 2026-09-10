import { useState } from 'react'
import { Plus, Edit2, Trash2, AlertTriangle, ShieldCheck, Clock, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  EnvironmentalLicense,
  EnvironmentalLicenseType,
  safeFormatDate,
  normalizeDate,
} from '@/types/models'
import {
  ENVIRONMENTAL_LICENSE_TYPES,
  calculateLicenseStatus,
  checkLicenseValidityInconsistency,
} from '@/lib/environmental-licenses'

export interface EnvironmentalLicensesSectionProps {
  licenses: EnvironmentalLicense[]
  onAddLicense?: (license: Omit<EnvironmentalLicense, 'id'>) => Promise<any> | void
  onUpdateLicense?: (id: string, license: Partial<EnvironmentalLicense>) => Promise<any> | void
  onDeleteLicense?: (id: string) => Promise<any> | void
  readOnly?: boolean
}

export function EnvironmentalLicensesSection({
  licenses,
  onAddLicense,
  onUpdateLicense,
  onDeleteLicense,
  readOnly = false,
}: EnvironmentalLicensesSectionProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingLicense, setEditingLicense] = useState<EnvironmentalLicense | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    license_type: 'LAP - Licença Ambiental Prévia' as EnvironmentalLicenseType,
    description: '',
    validity_months: '',
    start_date: '',
    end_date: '',
  })
  const [formError, setFormError] = useState('')

  const handleOpenNew = () => {
    setEditingLicense(null)
    setForm({
      license_type: 'LAP - Licença Ambiental Prévia',
      description: '',
      validity_months: '12',
      start_date: '',
      end_date: '',
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleOpenEdit = (lic: EnvironmentalLicense) => {
    setEditingLicense(lic)
    setForm({
      license_type: lic.license_type,
      description: lic.description || '',
      validity_months: lic.validity_months ? String(lic.validity_months) : '',
      start_date: normalizeDate(lic.start_date),
      end_date: normalizeDate(lic.end_date),
    })
    setFormError('')
    setModalOpen(true)
  }

  const isInconsistent = checkLicenseValidityInconsistency(
    form.start_date,
    form.end_date,
    form.validity_months ? Number(form.validity_months) : null,
  )

  const handleSaveModal = async () => {
    if (!form.end_date) {
      setFormError('A data de término da licença é obrigatória.')
      return
    }

    setSaving(true)
    setFormError('')
    try {
      const payload: Partial<EnvironmentalLicense> = {
        license_type: form.license_type,
        description: form.description.trim() || undefined,
        validity_months: form.validity_months ? Number(form.validity_months) : undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date,
      }

      if (editingLicense) {
        if (onUpdateLicense) {
          await onUpdateLicense(editingLicense.id, payload)
        }
      } else {
        if (onAddLicense) {
          await onAddLicense(payload as Omit<EnvironmentalLicense, 'id'>)
        }
      }
      setModalOpen(false)
    } catch (err: any) {
      console.error('Error saving license:', err)
      setFormError('Erro ao salvar a licença. Verifique os dados informados.')
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId || !onDeleteLicense) return
    try {
      await onDeleteLicense(deleteConfirmId)
    } finally {
      setDeleteConfirmId(null)
    }
  }

  const getStatusBadge = (lic: EnvironmentalLicense) => {
    const { status, daysRemaining } = calculateLicenseStatus(lic)
    if (status === 'Vencida') {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          Vencida ({Math.abs(daysRemaining)}d atrás)
        </Badge>
      )
    }
    if (status === 'Próxima do vencimento') {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          Próxima do vencimento ({daysRemaining}d)
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
        Vigente
      </Badge>
    )
  }

  return (
    <Card id="licencas-ambientais" className="border-slate-200 shadow-sm scroll-mt-20">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 className="font-semibold text-lg text-slate-800 flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-emerald-600" />
              Licenças Ambientais
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestão de licenças, prazos de validade e alertas de vencimento do projeto.
            </p>
          </div>
          {!readOnly && onAddLicense && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenNew}
              className="border-emerald-200 hover:bg-emerald-50 text-emerald-800 shrink-0"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Adicionar Licença Ambiental
            </Button>
          )}
        </div>

        {licenses.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            Nenhuma licença ambiental cadastrada para este projeto.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[240px]">Tipo de Licença</TableHead>
                  <TableHead className="w-28">Validade</TableHead>
                  <TableHead className="w-32">Início</TableHead>
                  <TableHead className="w-32">Término</TableHead>
                  <TableHead className="w-44">Status</TableHead>
                  {!readOnly && <TableHead className="w-24 text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenses.map((lic) => {
                  const { inconsistentValidity } = calculateLicenseStatus(lic)
                  return (
                    <TableRow key={lic.id} className="hover:bg-slate-50/80">
                      <TableCell>
                        <div className="font-medium text-slate-900">{lic.license_type}</div>
                        {lic.description && (
                          <div className="text-xs text-slate-500 mt-0.5">{lic.description}</div>
                        )}
                        {inconsistentValidity && (
                          <div className="flex items-center gap-1 text-[11px] text-amber-600 mt-1">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            Prazo em meses difere das datas cadastradas
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-700 text-sm">
                        {lic.validity_months ? `${lic.validity_months} meses` : '—'}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {safeFormatDate(lic.start_date)}
                      </TableCell>
                      <TableCell className="text-slate-900 font-medium text-sm">
                        {safeFormatDate(lic.end_date)}
                      </TableCell>
                      <TableCell>{getStatusBadge(lic)}</TableCell>
                      {!readOnly && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {onUpdateLicense && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-slate-800"
                                onClick={() => handleOpenEdit(lic)}
                                title="Editar licença"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                            {onDeleteLicense && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setDeleteConfirmId(lic.id)}
                                title="Excluir licença"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Modal de Cadastro/Edição */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingLicense ? 'Editar Licença Ambiental' : 'Nova Licença Ambiental'}
            </DialogTitle>
            <DialogDescription>
              Informe os dados da licença ambiental vinculada ao projeto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="license_type">Tipo de Licença *</Label>
              <Select
                value={form.license_type}
                onValueChange={(val) =>
                  setForm((prev) => ({
                    ...prev,
                    license_type: val as EnvironmentalLicenseType,
                  }))
                }
              >
                <SelectTrigger id="license_type" className="w-full">
                  <SelectValue placeholder="Selecione o tipo de licença" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {ENVIRONMENTAL_LICENSE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Descrição complementar{' '}
                {form.license_type === 'Outras' ? '(recomendado para "Outras")' : '(opcional)'}
              </Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder={
                  form.license_type === 'Outras'
                    ? 'Ex: Autorização Ambiental Municipal...'
                    : 'Informações complementares sobre a licença...'
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="validity_months">Validade (meses)</Label>
                <Input
                  id="validity_months"
                  type="number"
                  min="1"
                  value={form.validity_months}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, validity_months: e.target.value }))
                  }
                  placeholder="Ex: 12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Data de Início</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">Data de Término *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
                  required
                />
              </div>
            </div>

            {isInconsistent && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <strong>Atenção:</strong> O prazo informado em meses não confere exatamente com o
                  intervalo entre as datas de início e término. Verifique os dados antes de
                  prosseguir. (O sistema não alterará suas datas).
                </div>
              </div>
            )}

            {formError && (
              <div className="text-sm text-red-600 bg-red-50 p-2.5 rounded-md border border-red-200">
                {formError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveModal} disabled={saving}>
              {saving ? 'Salvando...' : editingLicense ? 'Atualizar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Licença Ambiental?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja remover esta licença ambiental do projeto? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
