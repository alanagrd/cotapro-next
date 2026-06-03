'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { CustoModal } from './CustoModal'
import { brl, fmtDate } from '@/lib/utils'

export default function CustosPage() {
  const router = useRouter()
  const [custos, setCustos]   = useState<any[]>([])
  const [ativos, setAtivos]   = useState<any[]>([])
  const [cotas, setCotas]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [fAtivo,  setFAtivo]  = useState('')
  const [fAno,    setFAno]    = useState('')
  const [fStatus, setFStatus] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.replace('/login'); return }

    const [{ data: c, error: e1 }, { data: a }, { data: q }] = await Promise.all([
      (supabase as any).from('custos').select('*, ativos(id,nome), cotas(id,unidade)').order('ano', { ascending: false }).order('created_at', { ascending: false }),
      (supabase as any).from('ativos').select('id,nome').eq('status','Ativo').order('nome'),
      (supabase as any).from('cotas').select('id,unidade,ativos(nome)').order('created_at'),
    ])
    if (e1) { setError(e1.message); setLoading(false); return }
    setCustos(c ?? [])
    setAtivos(a ?? [])
    setCotas((q ?? []).map((c:any) => ({ id:c.id, label:`${c.ativos?.nome??'?'} — ${c.unidade}` })))
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string, label: string) {
    if (!window.confirm(`Excluir o custo "${label}"?`)) return
    setDeleting(id)
    const { error: err } = await createClient().from('custos').delete().eq('id', id)
    setDeleting(null)
    if (err) { alert('Erro: ' + err.message); return }
    setCustos(prev => prev.filter(c => c.id !== id))
  }

  const filtered = custos.filter(c => {
    if (fAtivo  && c.ativos?.id !== fAtivo)  return false
    if (fStatus && c.status    !== fStatus) return false
    if (fAno    && String(c.ano) !== fAno)   return false
    return true
  })

  const totPago  = filtered.filter(c => c.status === 'Pago').reduce((s,c) => s+(c.valor??0), 0)
  const totPend  = filtered.filter(c => c.status !== 'Pago').reduce((s,c) => s+(c.valor??0), 0)
  const anos = [...new Set(custos.map(c => String(c.ano)).filter(Boolean))].sort().reverse()

  if (loading) return <div className="space-y-4 animate-pulse"><div className="card h-24"/><div className="card h-48"/></div>
  if (error)   return <div className="card p-8 text-center"><p className="text-red-600 text-sm mb-3">{error}</p><button onClick={load} className="btn-secondary text-sm">Tentar novamente</button></div>

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Custos</h2>
          <p className="text-sm text-gray-500 mt-0.5">Taxas de manutenção e despesas</p>
        </div>
        <CustoModal ativos={ativos} cotas={cotas} onSuccess={load}
          trigger={<button className="btn-primary"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>Novo custo</button>} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        {[{ l:'Total Pago', v:brl(totPago), c:'text-emerald-600' },{ l:'Total Pendente', v:brl(totPend), c:'text-red-500' },{ l:'Total Geral', v:brl(totPago+totPend), c:'text-indigo-600' }].map(k=>(
          <div key={k.l} className="card p-4"><div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{k.l}</div><div className={`text-2xl font-extrabold ${k.c}`}>{k.v}</div></div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide self-center">Filtros</span>
          {[{ l:'Ano',    v:fAno,    s:setFAno,    opts:anos.map(a=>({v:a,l:a})) },
            { l:'Status', v:fStatus, s:setFStatus, opts:[{v:'Pago',l:'Pago'},{v:'Pendente',l:'Pendente'}] },
          ].map(f=>(
            <div key={f.l}>
              <label className="block text-[10px] text-gray-400 mb-1">{f.l}</label>
              <select className="inp py-1.5 text-xs" value={f.v} onChange={e=>f.s(e.target.value)}>
                <option value="">Todos</option>{f.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">Ativo</label>
            <select className="inp py-1.5 text-xs" value={fAtivo} onChange={e=>setFAtivo(e.target.value)}>
              <option value="">Todos</option>{ativos.map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          {(fAtivo||fAno||fStatus)&&<button onClick={()=>{setFAtivo('');setFAno('');setFStatus('')}} className="text-xs text-gray-400 underline self-end pb-1.5">Limpar</button>}
          <div className="ml-auto self-end pb-1.5 text-xs text-gray-400"><strong className="text-indigo-600">{filtered.length}</strong> de {custos.length}</div>
        </div>
      </div>

      {custos.length===0 && (
        <div className="card p-16 text-center"><div className="text-4xl mb-3">🧾</div><h3 className="font-semibold text-gray-900 mb-1">Nenhum custo cadastrado</h3><p className="text-sm text-gray-500 mb-4">Registre taxas de manutenção e outras despesas.</p>
          <CustoModal ativos={ativos} cotas={cotas} onSuccess={load} trigger={<button className="btn-primary mx-auto">+ Novo custo</button>} />
        </div>
      )}

      {filtered.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full border-collapse">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>{['Ativo','Cota','Ano','Tipo','Descrição','Valor','Pagamento','Status',''].map(h=><th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-sm text-gray-900">{c.ativos?.nome??'—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.cotas?.unidade??'—'}</td>
                  <td className="px-4 py-3 text-sm">{c.ano}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c.tipo}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.descricao??'—'}</td>
                  <td className="px-4 py-3 font-semibold text-red-500">{brl(c.valor)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(c.data_pagamento)}</td>
                  <td className="px-4 py-3"><Badge label={c.status} colorClass={c.status==='Pago'?'bg-emerald-50 text-emerald-700':'bg-yellow-50 text-yellow-700'}/></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <CustoModal ativos={ativos} cotas={cotas} editData={c} onSuccess={load} trigger={<button className="btn-ghost text-xs py-1 px-2.5">Editar</button>} />
                      <button onClick={()=>handleDelete(c.id,c.tipo)} disabled={deleting===c.id}
                        className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50">
                        {deleting===c.id?'...':'✕'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
