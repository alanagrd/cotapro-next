'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <h1 className="text-lg font-bold text-gray-900 mb-2">Recuperar senha</h1>
          <p className="text-sm text-gray-500 mb-6">Enviaremos um link para redefinir sua senha.</p>
          {sent ? (
            <div className="text-center">
              <div className="text-3xl mb-3">📧</div>
              <p className="text-sm text-gray-600 mb-4">Link enviado para <strong>{email}</strong></p>
              <Link href="/login" className="btn-primary w-full justify-center py-2.5">Voltar ao login</Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="lbl">E-mail</label>
                <input className="inp" type="email" placeholder="seu@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 disabled:opacity-60">
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>
          )}
          <p className="text-center text-sm text-gray-500 mt-4">
            <Link href="/login" className="text-indigo-600 hover:underline">← Voltar ao login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
