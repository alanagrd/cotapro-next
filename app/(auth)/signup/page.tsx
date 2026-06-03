'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError('Senha deve ter pelo menos 6 caracteres.'); return }
    setLoading(true); setError(null)

    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { nome } }
    })

    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(true)
  }

  if (success) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="card p-10 max-w-md w-full text-center">
        <div className="text-4xl mb-4">✉️</div>
        <h2 className="text-xl font-bold mb-2">Confirme seu e-mail</h2>
        <p className="text-gray-500 text-sm mb-4">
          Enviamos um link de confirmação para <strong>{email}</strong>.
          Clique no link para ativar sua conta.
        </p>
        <Link href="/login" className="btn-primary w-full justify-center py-2.5">Ir para o login</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">CotaPro</span>
          </div>
        </div>

        <div className="card p-8">
          <h1 className="text-lg font-bold text-gray-900 mb-6">Criar conta</h1>
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="lbl">Nome completo</label>
              <input className="inp" type="text" placeholder="João Costa"
                value={nome} onChange={e => setNome(e.target.value)} required />
            </div>
            <div>
              <label className="lbl">E-mail</label>
              <input className="inp" type="email" placeholder="seu@email.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="lbl">Senha</label>
              <input className="inp" type="password" placeholder="Mínimo 6 caracteres"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 disabled:opacity-60">
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            Já tem conta?{' '}
            <Link href="/login" className="text-indigo-600 font-medium hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
