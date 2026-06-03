'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'

const EMOJIS = ['⭐','🏅','🌐','🏆','💎','🎯','🔑','✨']
const CORES   = ['#fef9c3','#eff6ff','#f5f3ff','#f0fdf4','#fff7ed','#fdf2f8']

export default function ProgramasPage() {
  const router = useRouter()
  const [programas, setProgramas] = useState<any[]>([])
  const [saldos, setSaldos]       = useState<Record<string, number>>({})
  const [ativos, setAtivos]       = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState<{ open: boolean; data?: any }>({ open: false })
  const [pending, setPending]     = useState(false)
  const [mError, setMError]       = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.replace('/login'); return }

    const [r0, r1, r2] = await Promise.all([
      (supabase as any).from('programas_pontos').select('*, ativos(id,nome)').order('created_at'),
      (supabase as any).from('movimentacoes_pontos').select('programa_id, tipo, quantidade'),
      (supabase as any).from('ativos').select('id, nome').eq('status','Ativo').order('nome'),
    ])
    const p: any[] = r0?.data ?? []
    const m: any[] = r1?.data ?? []
    const a: any[] = r2?.data ?? []

    // Compute saldo for each programa
    const sd: Record<string, number> = {}
    ;(p ?? []).forEach((prog: any) => { sd[prog.id] = prog.saldo_inicial ?? 0 })
    ;(m ?? []).forEach((mov: any) => {
      if (sd[mov.programa_id] !== undefined) {
        sd[mov.programa_id] += mov.tipo === 'Entrada' ? mov.quantidade : -mov.quantidade
      }
    })
    setProgramas(p ?? [])
    setSaldos(sd)
    setAtivos(a ?? [])
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setPending(true); setMError(null)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { setMError('Sessão expirada.'); setPending(false); return }

    const str = (k: string) => { const s = String(fd.get(k)??'').trim(); return s||null }
    const payload = {
      ativo_id:      str('ativo_id'),
      nome:          str('nome') ?? '',
      saldo_inicial: parseInt(String(fd.get('saldo_inicial')??'0'))||0,
      data_inicio:   str('data_inicio'),
      emoji:         str('emoji') ?? '⭐',
      cor_fundo:     str('cor_fundo') ?? '#fef9c3',
      observacoes:   str('observacoes'),
    }

    let err: any
    if (modal.data) {
      ;({ error: err } = await (supabase as any).from('programas_pontos').update(payload).eq('id', modal.data.id))
    } else {
      ;({ error: err } = await (supabase as any).from('programas_pontos').insert({ ...payload, user_id: session.user.id }))
    }
    setPending(false)
    if (err) { setMError(err.message); return }
    setModal({ open: false }); load()
  }

  async function handleDelete(id: string, nome: string) {
    if (!window.confirm(`Excluir o programa "${nome}"? As movimentações também serão excluídas.`)) return
    await createClient().from('programas_pontos').delete().eq('id', id)
    setProgramas(prev => prev.filter(p => p.id !== id))
  }

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-gray-200 rounded"/><div className="grid grid-cols-3 gap-4">{[0,1,2].map(i=><div key={i} className="card h-40"/>)}</div></div>

  const f = modal.data

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div><h2 className="text-xl font-bold text-gray-900">Programas de Pontos</h2><p className="text-sm text-gray-500 mt-0.5">Clubes de férias e programas de fidelidade</p></div>
        <button className="btn-primary" onClick={() => { setModal({ open: true }); setMError(null) }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
          Novo programa
        </button>
      </div>

      {programas.length === 0 ? (
        <div className="card p-16 text-center"><div className="text-4xl mb-3">⭐</div><h3 className="font-semibold text-gray-900 mb-1">Nenhum programa cadastrado</h3>
          <button className="btn-primary mt-4 mx-auto" onClick={() => setModal({ open:true })}>+ Novo programa</button></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {programas.map(p => (
            <div key={p.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{ background: p.cor_fundo ?? '#fef9c3' }}>
                  {p.emoji ?? '⭐'}
                </div>
                <Badge label="Ativo" colorClass="bg-emerald-50 text-emerald-700"/>
              </div>
              <div className="font-bold text-gray-900 mb-0.5">{p.nome}</div>
              <div className="text-xs text-gray-400 mb-4">{p.ativos?.nome ?? '—'}</div>
              <div className="border-t border-gray-100 pt-3 mb-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-gray-400">Saldo atual</span>
                  <span className="text-xl font-extrabold text-indigo-600">{(saldos[p.id]??0).toLocaleString('pt-BR')}</span>
                </div>
                <div className="text-[10px] text-right text-gray-400">pontos disponíveis</div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Saldo inicial: {(p.saldo_inicial??0).toLocaleString('pt-BR')}</span>
                  {p.data_inicio && <span>Desde {p.data_inicio?.split('-').reverse().join('/')}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary flex-1 justify-center text-xs py-1.5"
                  onClick={() => { setModal({ open:true, data:p }); setMError(null) }}>✏️ Editar</button>
                <button className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  onClick={() => handleDelete(p.id, p.nome)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={modal.open} onClose={() => setModal({ open:false })}
        title={modal.data ? `Editar: ${modal.data.nome}` : 'Novo Programa de Pontos'} size="lg">
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="lbl">Nome do programa *</label><input name="nome" className="inp" placeholder="Ex.: Novotel Itu Ranch Resort" defaultValue={f?.nome??''} required/></div>
            <div><label className="lbl">Ativo vinculado</label><select name="ativo_id" className="inp" defaultValue={f?.ativo_id??''}><option value="">Nenhum</option>{ativos.map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}</select></div>
            <div><label className="lbl">Saldo inicial (pts)</label><input name="saldo_inicial" type="number" min={0} className="inp" placeholder="0" defaultValue={f?.saldo_inicial??0}/></div>
            <div><label className="lbl">Data de início</label><input name="data_inicio" type="date" className="inp" defaultValue={f?.data_inicio??''}/></div>
            <div><label className="lbl">Ícone</label><select name="emoji" className="inp" defaultValue={f?.emoji??'⭐'}>{EMOJIS.map(e=><option key={e}>{e}</option>)}</select></div>
            <div><label className="lbl">Cor do card</label><select name="cor_fundo" className="inp" defaultValue={f?.cor_fundo??'#fef9c3'}>{CORES.map(c=><option key={c} value={c} style={{background:c}}>{c}</option>)}</select></div>
            <div className="col-span-2"><label className="lbl">Observações</label><textarea name="observacoes" className="inp resize-none" rows={2} defaultValue={f?.observacoes??''}/></div>
          </div>
          {mError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{mError}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal({ open:false })} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">{pending?'Salvando...':modal.data?'Salvar alterações':'Criar programa'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
