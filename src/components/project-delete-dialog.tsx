import { useState, ReactNode } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { deleteProject } from '@/services/projects'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'

interface ProjectDeleteDialogProps {
  projectId: string
  projectName: string
  projectStatus: string
  onDeleted?: () => void
  trigger?: ReactNode
}

export function ProjectDeleteDialog({
  projectId,
  projectName,
  projectStatus,
  onDeleted,
  trigger,
}: ProjectDeleteDialogProps) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()
  const canDelete = projectStatus === 'Concluído'

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteProject(projectId)
      toast({ title: 'Projeto excluído com sucesso' })
      setOpen(false)
      onDeleted?.()
    } catch (err) {
      toast({
        title: 'Erro ao excluir projeto',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  if (!canDelete) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex">
            <Button variant="destructive" disabled className="opacity-50 cursor-not-allowed">
              <Trash2 className="h-4 w-4 mr-2" /> Excluir
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Apenas projetos concluídos podem ser excluídos.</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="destructive" disabled={deleting}>
            <Trash2 className="h-4 w-4 mr-2" /> Excluir
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Projeto</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir <strong>{projectName}</strong>? Todas as tarefas,
            alocações e lançamentos de horas associados serão removidos permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
