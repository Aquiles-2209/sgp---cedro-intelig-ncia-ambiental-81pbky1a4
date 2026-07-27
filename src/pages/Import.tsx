import { useState, useRef } from 'react'
import { Upload, Download, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { executeImport, type ImportResult, type SheetImportResult } from '@/services/import'
import { downloadImportTemplate } from '@/lib/import-template'

function SheetResultCard({ title, result }: { title: string; result: SheetImportResult }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <span>{title}</span>
          <Badge variant="secondary">{result.totalRows} linhas</Badge>
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            {result.created} criados
          </Badge>
          {result.skipped.length > 0 && (
            <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
              {result.skipped.length} pulados
            </Badge>
          )}
          {result.errors.length > 0 && (
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
              {result.errors.length} erros
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      {(result.skipped.length > 0 || result.errors.length > 0) && (
        <CardContent className="space-y-3 pt-0">
          {result.skipped.length > 0 && (
            <div>
              <p className="text-sm font-medium text-yellow-700 mb-1">
                Linhas puladas (duplicadas):
              </p>
              <div className="max-h-40 overflow-auto space-y-1 rounded-md bg-yellow-50 p-2">
                {result.skipped.map((s, i) => (
                  <div key={i} className="text-sm text-slate-600">
                    <span className="font-medium">Linha {s.row}:</span> {s.reason}
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.errors.length > 0 && (
            <div>
              <p className="text-sm font-medium text-red-700 mb-1">Erros:</p>
              <div className="max-h-40 overflow-auto space-y-1 rounded-md bg-red-50 p-2">
                {result.errors.map((e, i) => (
                  <div key={i} className="text-sm text-slate-600">
                    <span className="font-medium">Linha {e.row}</span>
                    {e.column && <span> · {e.column}</span>}: {e.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export default function Import() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.xlsx')) {
      setError('Apenas arquivos .xlsx são suportados.')
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setError('')
    setFile(f)
    setResult(null)
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const r = await executeImport(file)
      setResult(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao importar arquivo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Importar Dados</h1>
        <p className="text-slate-500 text-sm">
          Importe projetos, usuários e tarefas de um arquivo .xlsx com três planilhas.
        </p>
      </div>

      <Button variant="outline" onClick={() => downloadImportTemplate()}>
        <Download className="w-4 h-4 mr-2" /> Baixar template
      </Button>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-lg p-8 cursor-pointer hover:border-primary hover:bg-slate-50 transition-colors"
          >
            <FileSpreadsheet className="h-10 w-10 text-slate-400" />
            <span className="text-sm text-slate-600">
              {file ? file.name : 'Clique para selecionar um arquivo .xlsx'}
            </span>
            <input
              id="file-upload"
              ref={inputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleImport} disabled={!file || loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" /> Importar dados
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          {result.sheetErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {result.sheetErrors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          <SheetResultCard title="Projetos" result={result.projetos} />
          <SheetResultCard title="Usuários CEDRO" result={result.usuarios} />
          <SheetResultCard title="Tarefas" result={result.tarefas} />
        </div>
      )}
    </div>
  )
}
