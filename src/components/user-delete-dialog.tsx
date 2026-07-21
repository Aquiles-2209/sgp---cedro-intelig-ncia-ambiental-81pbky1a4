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
import { deleteUser, type SimpleUser } from '@/services/users'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'

interface UserDeleteDialogProps {
  user: SimpleUser
  onDeleted?: () => void
  trigger?: ReactNode
}

export function UserDeleteDialog({ user, onDeleted, trigger }: UserDeleteDialogProps) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteUser(user.id)
      toast({ title: 'Usuário removido com sucesso!' })
      setOpen(false)
      onDeleted?.()
    } catch (err) {
      toast({
        title: 'Erro ao remover usuário',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={deleting}>
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover usuário</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja remover <strong>{user.name}</strong> ({user.email})? Esta ação
            não pode ser desfeita e o usuário perderá acesso ao sistema permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remover'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
