'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TIMEZONES = ['America/Sao_Paulo','America/Manaus','America/Belem','America/Fortaleza','America/Recife','America/Maceio','America/Bahia','America/Cuiaba','America/Porto_Velho','America/Boa_Vista','America/Rio_Branco','America/Noronha']
const PLANOS = { free:'Gratuito', pro:'Pro', enterprise:'Enterprise' }

export default function ConfiguracoesPage() {
  const router = useRouter()
  const [profile, setProfile]   = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)
  const [success, setSuccess]   = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)

  // Form fields
  const [nome, setNome]       = useState('')
  const [telefone, setTelone] = useState('')
  const [timezone, setTZ]     = useState('America/Sao_Paulo')
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifDias, setNotifDias]   = useState(7)

  // Password change
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd]         = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdError, setPwdError]     = useState<string | null>(null)
  const [pwdSuccess, setPwdSuccess] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.replace('/login'); return }

    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (p) {
      setProfile(p)
      setNome(p.nome ?? '')
      setTelone(p.telefone ?? '')
      setTZ(p.timezone ?? 'America/Sao_Paulo')
      setNotifEmail(p.notif_email ?? true)
      setNotifDias(p.notif_dias ?? 7)
    }
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function handleSavePerfil(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null); setSuccess(null)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { setError('Sessão expirada.'); setSaving(false); return }

    const { error: err } = await (supabase as any)
      .from('profiles')
      .update({ nome, telefone: telefone || null, notif_email: notifEmail, notif_dias: notifDias })
      .eq('id', session.user.id)

    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess('Perfil atualizado com sucesso!')
    setTimeout(() => setSuccess(null), 3000)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwdError(null); setPwdSuccess(false)
    if (newPwd.length < 6) { setPwdError('A nova senha deve ter pelo menos 6 caracteres.'); return }
    if (newPwd !== confirmPwd) { setPwdError('As senhas não coincidem.'); return }
    setSavingPwd(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password: newPwd })
    setSavingPwd(false)
    if (err) { setPwdError(err.message); return }
    setPwdSuccess(true)
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    setTimeout(() => setPwdSuccess(false), 4000)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) return (
    <div className="max-w-2xl space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded"/>
      {[0,1,2].map(i => <div key={i} className="card h-40"/>)}
    </div>
  )

  const email = profile?.email ?? ''
  const plano = profile?.plano ?? 'free'
  const initials = nome.split(' ').map((n:string) => n[0]).join('').slice(0,2).toUpperCase() || '?'

  return (
    <div className="max-w-2xl space-y-5">

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Configurações</h2>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie seu perfil e preferências</p>
      </div>

      {/* Avatar + plano */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div>
            <div className="font-bold text-gray-900 text-lg">{nome || 'Sem nome'}</div>
            <div className="text-sm text-gray-500">{email}</div>
            <div className="mt-1.5">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                plano === 'pro' ? 'bg-indigo-100 text-indigo-700' :
                plano === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {plano === 'pro' ? '⭐ Plano Pro' : plano === 'enterprise' ? '💎 Enterprise' : '🆓 Gratuito'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Perfil */}
      <div className="card p-6">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">
          Informações do perfil
        </div>
        <form onSubmit={handleSavePerfil} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="lbl">Nome completo</label>
              <input className="inp" value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Seu nome" required />
            </div>
            <div>
              <label className="lbl">E-mail</label>
              <input className="inp bg-gray-50 cursor-not-allowed" value={email} disabled
                title="O e-mail não pode ser alterado" />
            </div>
            <div>
              <label className="lbl">Telefone</label>
              <input className="inp" value={telefone} onChange={e => setTelone(e.target.value)}
                placeholder="+55 11 99999-0000" />
            </div>
            <div>
              <label className="lbl">Fuso horário</label>
              <select className="inp" value={timezone} onChange={e => setTZ(e.target.value)}>
                {TIMEZONES.map(t => <option key={t} value={t}>{t.replace('America/','')}</option>)}
              </select>
            </div>
          </div>

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-center gap-2">
              ✅ {success}
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? 'Salvando...' : 'Salvar perfil'}
            </button>
          </div>
        </form>
      </div>

      {/* Notificações */}
      <div className="card p-6">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">
          Notificações por e-mail
        </div>
        <div className="space-y-5">
          {/* Toggle notificações */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">Alertas de semanas próximas</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Receber e-mail quando uma semana estiver próxima de iniciar
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNotifEmail(v => !v)}
              className="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
              style={{ background: notifEmail ? '#4f46e5' : '#e5e7eb' }}
            >
              <span
                className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                style={{ transform: `translateX(${notifEmail ? '20px' : '0px'})` }}
              />
            </button>
          </div>

          {/* Dias de antecedência */}
          {notifEmail && (
            <div className="ml-0 pl-4 border-l-2 border-indigo-100">
              <label className="lbl">Avisar com quantos dias de antecedência</label>
              <div className="flex gap-2 flex-wrap mt-2">
                {[3, 5, 7, 10, 14, 30].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setNotifDias(d)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      notifDias === d
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {d} dias
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Você receberá um e-mail quando uma semana iniciar em menos de <strong>{notifDias} dias</strong>.
              </p>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button onClick={handleSavePerfil} disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? 'Salvando...' : 'Salvar notificações'}
            </button>
          </div>
        </div>
      </div>

      {/* Alterar senha */}
      <div className="card p-6">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">
          Segurança
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="lbl">Nova senha</label>
              <input type="password" className="inp" value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className="lbl">Confirmar nova senha</label>
              <input type="password" className="inp" value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                placeholder="Repita a nova senha" />
            </div>
          </div>
          {pwdError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{pwdError}</div>
          )}
          {pwdSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
              ✅ Senha alterada com sucesso!
            </div>
          )}
          <div className="flex justify-end">
            <button type="submit" disabled={savingPwd || !newPwd} className="btn-primary disabled:opacity-60">
              {savingPwd ? 'Alterando...' : 'Alterar senha'}
            </button>
          </div>
        </form>
      </div>

      {/* Plano */}
      <div className="card p-6">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">
          Plano e assinatura
        </div>
        <div className="flex items-center gap-4 p-4 rounded-xl"
          style={{ background: plano === 'pro' ? '#eef2ff' : '#f8fafc' }}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white ${
            plano === 'pro' ? 'bg-indigo-600' : 'bg-gray-300'
          }`}>
            {plano === 'pro' ? 'PRO' : plano === 'enterprise' ? 'ENT' : 'FREE'}
          </div>
          <div className="flex-1">
            <div className={`font-semibold ${plano === 'pro' ? 'text-indigo-700' : 'text-gray-700'}`}>
              {PLANOS[plano as keyof typeof PLANOS] ?? 'Gratuito'}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {plano === 'pro' ? 'Acesso completo a todos os módulos · R$ 97,00/mês' :
               plano === 'free' ? 'Módulos básicos disponíveis' : 'Plano empresarial personalizado'}
            </div>
          </div>
          {plano === 'free' && (
            <button className="btn-primary text-xs py-2">
              Fazer upgrade → Pro
            </button>
          )}
        </div>
      </div>

      {/* Zona de perigo */}
      <div className="card p-6 border-red-100">
        <div className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-4">
          Zona de perigo
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-900">Sair da conta</div>
            <div className="text-xs text-gray-500 mt-0.5">Encerrar sessão em todos os dispositivos</div>
          </div>
          <button onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
            Sair da conta
          </button>
        </div>
      </div>

    </div>
  )
}
