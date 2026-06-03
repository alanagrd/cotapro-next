'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RCIModal } from './RCIModal'
import { fmtDate } from '@/lib/utils'

export default function RCIPage() {
  const router = useRouter()
  const [rci, setRci]         = useState<any[]>([])
  const [semOpts, setSemOpts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.replace('/login'); return }
    const [{ data: r }, { data: s }] = await Promise.all([
      (supabase as any).from('rci').select('*, semanas(numero_semana, data_inicio, cotas(unidade, ativos(nome)))').order('data_troca', { ascending: false }),
      (supabase as any).from('semanas').select('id, numero_semana, data_inicio, cotas(unidade, ativos(nome))').order('data_inicio', { ascending: false }).limit(100),
    ])
    setRci(r ?? [])
    setSemOpts((s ?? []).map((x: any) => ({ id: x.id, label: `${x.cotas?.ativos?.nome??'?'} — Sem ${x.numero_semana}/${x.data_inicio?.substring(0,4)??'?'}` })))
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string) {
    if (!window.confirm('Excluir esta troca RCI?')) return
    setDeleting(id)
    await createClient().from('rci').delete().eq('id', id)
    setDeleting(null)
    setRci(prev => prev.filter(r => r.id !== id))
  }

  const totRec  = rci.reduce((s, r) => s + (r.pontos_recebidos  ?? 0), 0)
  const totUtil = rci.reduce((s, r) => s + (r.pontos_utilizados ?? 0), 0)
  const saldo   = totRec - totUtil

  if (loading) return <div className="animate-pulse space-y-4"><div className="card h-24"/><div className="card h-48"/></div>

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div><h2 className="text-xl font-bold text-gray-900">RCI — Intercâmbio</h2><p className="text-sm text-gray-500 mt-0.5">Controle de trocas e pontos RCI</p></div>
        <RCIModal semanas={semOpts} onSuccess={load}
          trigger={<button className="btn-primary"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>Nova troca</button>} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        {[{ l:'Pontos Recebidos', v:totRec.toLocaleString('pt-BR'), c:'text-emerald-600' },{ l:'Pontos Utilizados', v:totUtil.toLocaleString('pt-BR'), c:'text-red-500' },{ l:'Saldo RCI', v:saldo.toLocaleString('pt-BR'), c:'text-indigo-600' }].map(k=>(
          <div key={k.l} className="card p-4"><div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{k.l}</div><div className={`text-2xl font-extrabold ${k.c}`}>{k.v} pts</div></div>
        ))}
      </div>

      {rci.length === 0 ? (
        <div className="card p-16 text-center"><div className="text-4xl mb-3">🔄</div><h3 className="font-semibold text-gray-900 mb-1">Nenhuma troca RCI cadastrada</h3>
          <RCIModal semanas={semOpts} onSuccess={load} trigger={<button className="btn-primary mt-4 mx-auto">+ Nova troca RCI</button>}/></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full border-collapse">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>{['Semana','Data da Troca','Pts Recebidos','Pts Utilizados','Saldo','Expiração','Destino',''].map(h=><th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rci.map(r => {
                const sem = r.semanas
                const semLabel = sem ? `${sem.cotas?.ativos?.nome??'?'} — Sem ${sem.numero_semana}/${sem.data_inicio?.substring(0,4)??'?'}` : '—'
                const saldoR = (r.pontos_recebidos??0) - (r.pontos_utilizados??0)
                return (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{semLabel}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(r.data_troca)}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">{(r.pontos_recebidos??0).toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-red-500">{(r.pontos_utilizados??0)>0?(r.pontos_utilizados).toLocaleString('pt-BR'):'—'}</td>
                    <td className="px-4 py-3 font-bold text-indigo-600">{saldoR.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.data_expiracao)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.destino??'—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <RCIModal semanas={semOpts} editData={r} onSuccess={load} trigger={<button className="btn-ghost text-xs py-1 px-2.5">Editar</button>}/>
                        <button onClick={()=>handleDelete(r.id)} disabled={deleting===r.id} className="inline-flex items-center px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50">{deleting===r.id?'...':'✕'}</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
