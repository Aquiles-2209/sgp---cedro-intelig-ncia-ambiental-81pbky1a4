import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Briefcase } from 'lucide-react'
import { useAppState } from '@/hooks/use-app-state'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const loginSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido.' }),
  password: z.string().min(6, { message: 'A senha deve ter no mínimo 6 caracteres.' }),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function Login() {
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAppState()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    // Mock login delay
    await new Promise((r) => setTimeout(r, 800))
    setIsLoading(false)

    if (data.email === 'admin@gestaopro.com' && data.password === '123456') {
      login(data.email)
      const from = location.state?.from?.pathname || '/'
      navigate(from, { replace: true })
    } else {
      toast({
        title: 'Credenciais inválidas',
        description: 'Tente admin@gestaopro.com e senha 123456.',
        variant: 'destructive',
      })
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
            entregas de projetos e garanta o cumprimento de prazos em uma única plataforma segura.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-2xl shadow-subtle border border-slate-100">
          <div className="flex flex-col items-center text-center">
            <div className="h-12 w-12 bg-primary text-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
              <Briefcase className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Acesse sua conta</h2>
            <p className="text-sm text-slate-500 mt-2">Insira suas credenciais para continuar.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-8">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail corporativo</Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@empresa.com"
                className={`h-11 ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                {...register('email')}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <a href="#" className="text-xs text-primary hover:underline font-medium">
                  Esqueceu a senha?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className={`h-11 ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                {...register('password')}
              />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-base font-medium transition-transform active:scale-[0.98]"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar na Plataforma'}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Dica: use <span className="font-semibold text-slate-600">admin@gestaopro.com</span> e{' '}
            <span className="font-semibold text-slate-600">123456</span>
          </div>
        </div>
      </div>
    </div>
  )
}
