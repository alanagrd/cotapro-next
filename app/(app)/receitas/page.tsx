'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { ReceitaModal, type SemanaOption, type AtivoOption } from './ReceitaModal'
import { brl, fmtDate, RECEITA_STATUS_BADGE, badgeClass, RECEITA_STATUSES, CANAIS } from '@/lib/utils'

type ReceitaRow = any

export default function ReceitasPage() {
  const router = useRouter()
  const [receitas, setReceitas]   = useState<ReceitaRow[]>([])
  const [semanas, setSemanas]     = useState<SemanaOption[]>([])
  const [ativos, setAtivos]       = useState<AtivoOption[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [deleting, setDeleting]   = useState<string | null>(null)

  // ── Filters ───────────────────────────────────────────────────────────────
  const [fAtivo,  setFAtivo]  = useState('')
  const [fCanal,  setFCanal]  = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fAno,    setFAno]    = useState('')

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setError(null)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.replace('/login'); return }

    const [r0, r1, r2] = await Promise.all([
      (supabase as any).from('receitas')
        .select('*, ativos(id, nome), semanas(numero_semana, ano, data_inicio, cotas(unidade))')
        .order('data_competencia', { ascending: false })
        .order('created_at', { ascending: false }),
      (supabase as any).from('semanas')
        .select('id, numero_semana, ano, cotas(unidade, ativos(nome))')
        .order('data_inicio', { ascending: false })
        .limit(200),
      (supabase as any).from('ativos').select('id, nome').eq('status', 'Ativo').order('nome'),
    ])
    const recData: any[] = r0?.data ?? []; const e1 = r0?.error
    const semsData: any[] = r1?.data ?? []
    const atsData: any[]  = r2?.data ?? []

    if (e1) { setError(e1.message); setLoading(false); return }
    setReceitas(recData ?? [])
    setSemanas((semsData ?? []).map((s: any) => ({
      id: s.id,
      label: `${s.cotas?.ativos?.nome ?? '?'} — Sem ${s.numero_semana}/${s.ano}`,
    })))
    setAtivos(atsData ?? [])
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  // ── Delete via browser client ─────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!window.confirm('Excluir esta receita?')) return
    setDeleting(id)
    const supabase = createClient()
    const { error: err } = await (supabase as any).from('receitas').delete().eq('id', id)
    setDeleting(null)
    if (err) { alert('Erro ao excluir: ' + err.message); return }
    setReceitas((prev: any[]) => prev.filter(r => r.id !== id))
  }

  // ── Client-side filtering ─────────────────────────────────────────────────
  const filtered = receitas.filter((r: any) => {
    if (fAtivo  && r.ativos?.id !== fAtivo)  return false
    if (fCanal  && r.canal      !== fCanal)  return false
    if (fStatus && r.status     !== fStatus) return false
    if (fAno    && !r.data_competencia?.startsWith(fAno)) return false
    return true
  })

  const totBruto = filtered.reduce((s: number, r: any) => s + (r.valor_bruto   ?? 0), 0)
  const totTaxas = filtered.reduce((s: number, r: any) => s + (r.taxas         ?? 0), 0)
  const totLiq   = filtered.reduce((s: number, r: any) => s + (r.valor_liquido ?? 0), 0)
  const anos = [...new Set(receitas.map((r: any) => r.data_competencia?.substring(0, 4)).filter(Boolean))].sort().reverse()

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-32 bg-gray-200 rounded-lg" /><div className="h-9 w-32 bg-gray-200 rounded-lg" />
      </div>
      <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_,i)=><div key={i} className="card h-20"/>)}</div>
      <div className="card h-48" />
    </div>
  )

  if (error) return (
    <div className="card p-8 text-center">
      <div className="text-3xl mb-3">⚠️</div>
      <p className="text-sm text-red-600 font-medium mb-3">Erro: {error}</p>
      <button onClick={load} className="btn-secondary text-sm">Tentar novamente</button>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Receitas</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} registro(s){fAtivo||fCanal||fStatus||fAno?' filtrados':''}
          </p>
        </div>
        <ReceitaModal semanas={semanas} ativos={ativos} onSuccess={load}
          trigger={
            <button className="btn-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
              </svg>
              Nova receita
            </button>
          }
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="card p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Receita Bruta</div>
          <div className="text-2xl font-extrabold text-emerald-600">{brl(totBruto)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Taxas / Descontos</div>
          <div className="text-2xl font-extrabold text-red-500">− {brl(totTaxas)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Receita Líquida</div>
          <div className="text-2xl font-extrabold text-indigo-600">{brl(totLiq)}</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 self-center">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/>
            </svg>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filtros</span>
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">Ano</label>
            <select className="inp py-1.5 text-xs" value={fAno} onChange={e=>setFAno(e.target.value)}>
              <option value="">Todos</option>
              {anos.map(a=><option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">Ativo</label>
            <select className="inp py-1.5 text-xs" value={fAtivo} onChange={e=>setFAtivo(e.target.value)}>
              <option value="">Todos</option>
              {ativos.map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">Canal</label>
            <select className="inp py-1.5 text-xs" value={fCanal} onChange={e=>setFCanal(e.target.value)}>
              <option value="">Todos</option>
              {CANAIS.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">Status</label>
            <select className="inp py-1.5 text-xs" value={fStatus} onChange={e=>setFStatus(e.target.value)}>
              <option value="">Todos</option>
              {RECEITA_STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          {(fAtivo||fCanal||fStatus||fAno) && (
            <button onClick={()=>{setFAtivo('');setFCanal('');setFStatus('');setFAno('')}}
              className="text-xs text-gray-400 hover:text-gray-700 underline self-end pb-1.5">Limpar</button>
          )}
          <div className="ml-auto self-end pb-1.5 text-xs text-gray-400">
            <strong className="text-indigo-600">{filtered.length}</strong> de {receitas.length}
          </div>
        </div>
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="card p-16 text-center">
          <div className="text-4xl mb-3">💰</div>
          <h3 className="font-semibold text-gray-900 mb-1">Nenhuma receita encontrada</h3>
          <p className="text-sm text-gray-500">
            {receitas.length===0?'Registre sua primeira receita.':'Tente ajustar os filtros.'}
          </p>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead className="border-b border-gray-100 bg-gray-50/50">
                <tr>
                  {['Semana / Ativo','Competência','Canal','Bruto','Taxas','Líquido','Recebimento','Status',''].map(h=>(
                    <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-3 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: any) => {
                  const sem = r.semanas
                  const semLabel = sem
                    ? `${sem.cotas?.unidade ?? '?'} · Sem ${sem.numero_semana}/${sem.ano}`
                    : (r.descricao ?? '—')
                  return (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="px-3 py-3">
                        <div className="text-sm font-medium text-gray-900">{semLabel}</div>
                        <div className="text-xs text-gray-400">{r.ativos?.nome ?? '—'}</div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {r.data_competencia
                          ? new Date(r.data_competencia+'T12:00:00').toLocaleDateString('pt-BR',{month:'short',year:'numeric'})
                          : '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">{r.canal ?? '—'}</td>
                      <td className="px-3 py-3 text-sm font-medium text-gray-900">{brl(r.valor_bruto)}</td>
                      <td className="px-3 py-3 text-sm text-red-500">
                        {(r.taxas??0)>0?`− ${brl(r.taxas)}`:'—'}
                      </td>
                      <td className="px-3 py-3 text-sm font-bold text-emerald-600">{brl(r.valor_liquido)}</td>
                      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(r.data_recebimento)}</td>
                      <td className="px-3 py-3">
                        <Badge label={r.status} colorClass={badgeClass(RECEITA_STATUS_BADGE, r.status)} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <ReceitaModal semanas={semanas} ativos={ativos} editData={r} onSuccess={load}
                            trigger={<button className="btn-ghost text-xs py-1 px-2">Editar</button>} />
                          <button
                            onClick={() => handleDelete(r.id)}
                            disabled={deleting === r.id}
                            className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deleting === r.id ? '...' : '✕'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
