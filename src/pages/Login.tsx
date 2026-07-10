import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Briefcase } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  email: z.string().email({ message: 'E-mail inválido.' }),
  password: z.string().min(6, { message: 'Mínimo 6 caracteres.' }),
})
type FormValues = z.infer<typeof schema>

export default function Login() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'aquilessouza1@hotmail.com', password: 'Skip@Pass' },
  })

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true)
    const result = isSignUp
      ? await signUp(data.email, data.password)
      : await signIn(data.email, data.password)
    setIsLoading(false)
    if (result.error) {
      toast({ title: 'Erro', description: 'Verifique suas credenciais.', variant: 'destructive' })
    } else {
      const from = location.state?.from?.pathname || '/'
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex w-full bg-slate-50">
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-40 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://img.usecurling.com/p/800/1200?q=modern%20architecture%20office&color=blue')",
          }}
        />
        <div className="relative z-10 p-12 text-white max-w-xl">
          <h1 className="text-4xl font-bold mb-6">Gestão Inteligente de Contratos e Equipes</h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            Centralize as operações da sua organização. Aloque times de alta performance, monitore
            entregas e garanta prazos.
          </p>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-2xl shadow-subtle border border-slate-100">
          <div className="flex flex-col items-center text-center">
            <div className="h-12 w-12 bg-primary text-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
              <Briefcase className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {isSignUp ? 'Criar Conta' : 'Acesse sua conta'}
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              {isSignUp ? 'Cadastre-se para começar.' : 'Insira suas credenciais para continuar.'}
            </p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-8">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail corporativo</Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@empresa.com"
                className={`h-11 ${errors.email ? 'border-red-500' : ''}`}
                {...register('email')}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className={`h-11 ${errors.password ? 'border-red-500' : ''}`}
                {...register('password')}
              />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-base font-medium transition-transform active:scale-[0.98]"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isSignUp ? (
                'Cadastrar'
              ) : (
                'Entrar na Plataforma'
              )}
            </Button>
          </form>
          <div className="text-center text-sm">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:underline font-medium"
            >
              {isSignUp ? 'Já tem conta? Entrar' : 'Não tem conta? Cadastre-se'}
            </button>
          </div>
          {!isSignUp && (
            <div className="mt-2 text-center text-xs text-slate-400">
              Dica: <span className="font-semibold text-slate-600">aquilessouza1@hotmail.com</span>{' '}
              / <span className="font-semibold text-slate-600">Skip@Pass</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
