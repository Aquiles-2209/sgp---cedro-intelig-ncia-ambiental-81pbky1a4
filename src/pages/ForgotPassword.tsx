import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Briefcase, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import pb from '@/lib/pocketbase/client'
import bgImage from '@/assets/chatgpt-image-31-de-jul.de-2026-155002-78bb2.png'

const schema = z.object({
  email: z.string().email({ message: 'E-mail inválido.' }),
})
type FormValues = z.infer<typeof schema>

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true)
    try {
      await pb.collection('users').requestPasswordReset(data.email)
      toast({
        title: 'E-mail de recuperação enviado!',
        description: 'Verifique sua caixa de entrada.',
      })
    } catch (err) {
      toast({
        title: 'Erro ao enviar e-mail',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center lg:justify-end bg-slate-900 bg-cover bg-center bg-no-repeat p-4 sm:p-6 lg:p-12 overflow-hidden"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="absolute inset-0 bg-slate-950/20 sm:bg-slate-950/30 lg:bg-transparent pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-2xl shadow-2xl border border-white/20 lg:mr-8 xl:mr-16">
        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-12 bg-primary text-white rounded-xl flex items-center justify-center mb-4 shadow-md">
            <Briefcase className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Esqueceu sua senha?</h2>
          <p className="text-sm text-slate-500 mt-2">
            Informe seu e-mail corporativo e enviaremos um link de recuperação.
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-8">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-700 font-medium">
              E-mail corporativo
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="nome@empresa.com"
              autoComplete="off"
              className={`h-11 bg-white ${errors.email ? 'border-red-500' : 'border-slate-200'}`}
              {...register('email')}
            />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <Button
            type="submit"
            className="w-full h-11 text-base font-medium transition-transform active:scale-[0.98] shadow-md"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'Enviar link de recuperação'
            )}
          </Button>
        </form>
        <div className="text-center text-sm mt-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  )
}
