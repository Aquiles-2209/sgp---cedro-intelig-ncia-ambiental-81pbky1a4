import { useState, useCallback, useRef } from 'react'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { readXlsxFile, type SheetData } from '@/lib/xlsx-reader'
import { validateImport, type ValidationError, type ParsedData } from '@/lib/import-data'
import { executeImport, type ImportResult } from '@/lib/import-executor'

type State = 'idle' | 'parsing' | 'preview' | 'importing' | 'success' | 'error'

function PreviewTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 50).map((row, i) => (
              <TableRow key={i}>
                {row.map((cell, j) => (
                  <TableCell key={j}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length > 50 && (
          <p className="text-sm text-muted-foreground mt-2">
            Mostrando 50 de {rows.length} linhas.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function Importar() {
  const [state, setState] = useState<State>('idle')
  const [sheets, setSheets] = useState<SheetData[]>([])
  const [parsed, setParsed] = useState<ParsedData | null>(null)
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      const msg = 'Apenas arquivos .xlsx são aceitos.'
      setErrors([{ sheet: '', row: 0, column: '', message: msg }])
      setState('error')
      toast({ title: 'Formato inválido', description: msg, variant: 'destructive' })
      return
    }
    setFileName(file.name)
    setState('parsing')
    try {
      const s = await readXlsxFile(file)
      setSheets(s)
      const { data, errors: errs } = validateImport(s)
      if (errs.length > 0) {
        setErrors(errs)
        setState('error')
        toast({
          title: 'Validação falhou',
          description: `${errs.length} erro(s) encontrado(s). Corrija a planilha e tente novamente.`,
          variant: 'destructive',
        })
      } else {
        setParsed(data)
        setErrors([])
        setState('preview')
      }
    } catch (e) {
      const msg = `Erro ao ler arquivo: ${(e as Error).message}`
      setErrors([{ sheet: '', row: 0, column: '', message: msg }])
      setState('error')
      toast({ title: 'Erro ao ler arquivo', description: msg, variant: 'destructive' })
    }
  }, [])

  const handleImport = async () => {
    if (!parsed) return
    setState('importing')
    try {
      const r = await executeImport(parsed)
      setResult(r)
      setState('success')
      const emptyTitleSummary =
        r.emptyTitleRows.length > 0
          ? ` Linhas ${r.emptyTitleRows.join(', ')}: título preenchido automaticamente como 'Tarefa sem título'.`
          : ''
      toast({
        title: 'Importação concluída com sucesso!',
        description: r.message + emptyTitleSummary,
      })
    } catch (e) {
      const msg = `Erro ao importar: ${(e as Error).message}`
      setErrors([{ sheet: '', row: 0, column: '', message: msg }])
      setState('error')
      toast({ title: 'Falha na importação', description: msg, variant: 'destructive' })
    }
  }

  const reset = () => {
    setState('idle')
    setSheets([])
    setParsed(null)
    setErrors([])
    setResult(null)
    setFileName('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importar Dados</h1>
          <p className="text-sm text-muted-foreground">
            Importe projetos, usuários, alocações e tarefas de uma planilha Excel.
          </p>
        </div>
      </div>

      {(state === 'idle' || state === 'parsing') && (
        <Card>
          <CardContent className="pt-6">
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const f = e.dataTransfer.files[0]
                if (f) handleFile(f)
              }}
              onClick={() => inputRef.current?.click()}
              className={cn(
                'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-12 cursor-pointer transition-colors',
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50',
              )}
            >
              {state === 'parsing' ? (
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="h-10 w-10 text-muted-foreground" />
              )}
              <p className="text-sm font-medium">
                {state === 'parsing'
                  ? 'Processando...'
                  : 'Arraste um arquivo .xlsx aqui ou clique para selecionar'}
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {state === 'error' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" /> Erros de Validação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Arquivo: {fileName}</p>
            {errors.map((e, i) => (
              <Alert key={i} variant="destructive">
                <AlertDescription>
                  {e.sheet && <span className="font-medium">Aba {e.sheet} — </span>}
                  {e.row > 0 && <span>Linha {e.row}: </span>}
                  {e.column && <span className="font-mono">{e.column}: </span>}
                  {e.message}
                </AlertDescription>
              </Alert>
            ))}
            <Button onClick={reset} variant="outline">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {state === 'preview' && parsed && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" /> Pré-visualização — {fileName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="font-medium">{parsed.projects.length} projetos</span>
                <span className="font-medium">{parsed.members.length} usuários</span>
                <span className="font-medium">{parsed.allocations.length} alocações</span>
                <span className="font-medium">{parsed.tasks.length} tarefas</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {sheets.map((s) => (
                  <span key={s.name} className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                    {s.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="Projetos">
            <TabsList>
              <TabsTrigger value="Projetos">Projetos ({parsed.projects.length})</TabsTrigger>
              <TabsTrigger value="Usuários">Usuários ({parsed.members.length})</TabsTrigger>
              <TabsTrigger value="Alocações">Alocações ({parsed.allocations.length})</TabsTrigger>
              <TabsTrigger value="Tarefas">Tarefas ({parsed.tasks.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="Projetos">
              <PreviewTable
                headers={['Nome', 'Status', 'Setor', 'Cliente']}
                rows={parsed.projects.map((p) => [p.name, p.status, p.setor, p.client])}
              />
            </TabsContent>
            <TabsContent value="Usuários">
              <PreviewTable
                headers={['Nome', 'Função', 'Setor', 'Email']}
                rows={parsed.members.map((m) => [m.name, m.function, m.setor, m.email])}
              />
            </TabsContent>
            <TabsContent value="Alocações">
              <PreviewTable
                headers={['Projeto', 'Membro', 'Função', 'Início', 'Fim']}
                rows={parsed.allocations.map((a) => [
                  a.projectName,
                  a.memberName,
                  a.function,
                  a.start_date,
                  a.end_date,
                ])}
              />
            </TabsContent>
            <TabsContent value="Tarefas">
              <PreviewTable
                headers={['Título', 'Projeto', 'Status', 'Prazo', 'Horas']}
                rows={parsed.tasks.map((t) => [
                  t.title,
                  t.projectName,
                  t.status,
                  t.due_date,
                  String(t.planned_hours),
                ])}
              />
            </TabsContent>
          </Tabs>

          <div className="flex gap-3">
            <Button onClick={handleImport} size="lg">
              <CheckCircle2 className="h-5 w-5 mr-2" /> Confirmar Importação
            </Button>
            <Button onClick={reset} variant="outline" size="lg">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {state === 'importing' && (
        <Card>
          <CardContent className="flex items-center justify-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg font-medium">Importando dados...</p>
          </CardContent>
        </Card>
      )}

      {state === 'success' && result && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <p className="text-lg font-medium text-center">{result.message}</p>
            {result.emptyTitleRows.length > 0 && (
              <Alert className="max-w-lg">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="text-sm">
                    Linhas {result.emptyTitleRows.join(', ')}: título preenchido automaticamente
                    como &ldquo;Tarefa sem título&rdquo;.
                  </p>
                </AlertDescription>
              </Alert>
            )}
            <Button onClick={reset} size="lg">
              Nova Importação
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
