'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { SemanaModal, type CotaOption } from './SemanaModal'
import {
  brl, fmtPeriod,
  SEMANA_STATUS_BADGE, CATEGORIA_BADGE, badgeClass,
  CATEGORIAS, SEMANA_STATUSES, CANAIS,
} from '@/lib/utils'

type SemanaRow = any

export default function SemanasPage() {
  const router = useRouter()
  const [semanas, setSemanas]   = useState<SemanaRow[]>([])
  const [cotas, setCotas]       = useState<CotaOption[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // ── Filters (client-side) ─────────────────────────────────────────────────
  const [fAtivo,   setFAtivo]   = useState('')
  const [fStatus,  setFStatus]  = useState('')
  const [fCat,     setFCat]     = useState('')
  const [fCanal,   setFCanal]   = useState('')
  const [fAno,     setFAno]     = useState('')
  const [fFuturas, setFFuturas] = useState(false)

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setError(null)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.replace('/login'); return }

    const [{ data: semsData, error: e1 }, { data: cotasData }] = await Promise.all([
      supabase
        .from('semanas')
        .select('*, cotas(id, unidade, ativos(id, nome))')
        .order('data_inicio', { ascending: false }),
      supabase
        .from('cotas')
        .select('id, unidade, ativos(id, nome)')
        .order('created_at'),
    ])

    if (e1) { setError(e1.message); setLoading(false); return }
    setSemanas(semsData ?? [])
    setCotas((cotasData ?? []).map((c: any) => ({
      id: c.id,
      unidade: c.unidade,
      ativo_nome: c.ativos?.nome ?? '—',
    })))
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  // ── Delete via browser client ─────────────────────────────────────────────
  async function handleDelete(id: string, label: string) {
    if (!window.confirm(`Excluir a semana "${label}"?`)) return
    setDeleting(id)
    const supabase = createClient()
    const { error: err } = await supabase.from('semanas').delete().eq('id', id)
    setDeleting(null)
    if (err) { alert('Erro ao excluir: ' + err.message); return }
    setSemanas((prev: any[]) => prev.filter(s => s.id !== id))
  }

  // ── Client-side filtering ─────────────────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const filtered = semanas.filter((s: any) => {
    const ativoNome: string = s.cotas?.ativos?.nome ?? ''
    if (fAtivo  && ativoNome !== fAtivo)  return false
    if (fStatus && s.status  !== fStatus) return false
    if (fCat    && s.categoria !== fCat)  return false
    if (fCanal  && s.canal   !== fCanal)  return false
    if (fAno    && !s.data_inicio?.startsWith(fAno)) return false
    if (fFuturas) {
      const fim = s.data_fim ? new Date(s.data_fim) : null
      if (!fim || fim < today) return false
    }
    return true
  })

  const ativoNomes = [...new Set(semanas.map((s: any) => s.cotas?.ativos?.nome).filter(Boolean))]
  const anos = [...new Set(semanas.map((s: any) => s.data_inicio?.substring(0, 4)).filter(Boolean))].sort().reverse()
  const totPrev = filtered.reduce((s: number, r: any) => s + (r.valor_previsto ?? 0), 0)
  const totRec  = filtered.reduce((s: number, r: any) => s + (r.valor_recebido  ?? 0), 0)

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-36 bg-gray-200 rounded-lg" />
        <div className="h-9 w-32 bg-gray-200 rounded-lg" />
      </div>
      <div className="card h-16" /><div className="card h-64" />
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
          <h2 className="text-xl font-bold text-gray-900">Semanas</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} semana(s) · Previsto: {brl(totPrev)} · Recebido: {brl(totRec)}
          </p>
        </div>
        <SemanaModal cotas={cotas} onSuccess={load}
          trigger={
            <button className="btn-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
              </svg>
              Nova semana
            </button>
          }
        />
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
          {[
            { label:'Ativo',     val:fAtivo,  set:setFAtivo,  opts:ativoNomes.map(n=>({v:n as string,l:n as string})) },
            { label:'Ano',       val:fAno,    set:setFAno,    opts:anos.map(a=>({v:a as string,l:a as string})) },
            { label:'Status',    val:fStatus, set:setFStatus, opts:SEMANA_STATUSES.map(s=>({v:s,l:s})) },
            { label:'Categoria', val:fCat,    set:setFCat,    opts:CATEGORIAS.map(c=>({v:c,l:c})) },
            { label:'Canal',     val:fCanal,  set:setFCanal,  opts:CANAIS.map(c=>({v:c,l:c})) },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-[10px] text-gray-400 mb-1">{f.label}</label>
              <select className="inp py-1.5 text-xs" value={f.val}
                onChange={e => f.set(e.target.value)}>
                <option value="">Todos</option>
                {f.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          ))}
          <label className="flex items-center gap-2 cursor-pointer self-end pb-1.5">
            <input type="checkbox" checked={fFuturas} onChange={e => setFFuturas(e.target.checked)}
              className="w-4 h-4 accent-indigo-600" />
            <span className="text-xs font-medium text-gray-600">Apenas futuras</span>
          </label>
          {(fAtivo || fStatus || fCat || fCanal || fAno || fFuturas) && (
            <button onClick={() => { setFAtivo(''); setFStatus(''); setFCat(''); setFCanal(''); setFAno(''); setFFuturas(false) }}
              className="text-xs text-gray-400 hover:text-gray-700 underline self-end pb-1.5">
              Limpar
            </button>
          )}
          <div className="ml-auto self-end pb-1.5 text-xs text-gray-400">
            <strong className="text-indigo-600">{filtered.length}</strong> de {semanas.length}
          </div>
        </div>
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="card p-16 text-center">
          <div className="text-4xl mb-3">📅</div>
          <h3 className="font-semibold text-gray-900 mb-1">Nenhuma semana encontrada</h3>
          <p className="text-sm text-gray-500">
            {semanas.length === 0 ? 'Cadastre cotas primeiro e depois adicione semanas.' : 'Tente ajustar os filtros.'}
          </p>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              <thead className="border-b border-gray-100 bg-gray-50/50">
                <tr>
                  {['Ativo / Cota','Sem.','Período','Categoria','Status','Canal','Previsto','Recebido','Hóspede',''].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-3 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s: any) => {
                  const ativoNome   = s.cotas?.ativos?.nome ?? '—'
                  const cotaUnidade = s.cotas?.unidade ?? '—'
                  const isRecebida  = (s.valor_recebido ?? 0) > 0
                  const isFutura    = s.data_inicio && new Date(s.data_inicio) >= today
                  const label       = `Sem ${s.numero_semana}/${s.ano}`
                  return (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="px-3 py-3">
                        <div className="font-semibold text-sm text-gray-900">{ativoNome}</div>
                        <div className="text-xs text-gray-400">{cotaUnidade}</div>
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-indigo-600 text-sm">
                        {String(s.numero_semana).padStart(2, '0')}
                        <div className="text-[10px] font-sans font-normal text-gray-400">{s.ano}</div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {fmtPeriod(s.data_inicio, s.data_fim)}
                        {isFutura && <div className="text-[10px] text-emerald-600 font-medium mt-0.5">● Futura</div>}
                      </td>
                      <td className="px-3 py-3">
                        <Badge label={s.categoria} colorClass={badgeClass(CATEGORIA_BADGE, s.categoria)} />
                      </td>
                      <td className="px-3 py-3">
                        <Badge label={s.status} colorClass={badgeClass(SEMANA_STATUS_BADGE, s.status)} />
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">{s.canal ?? '—'}</td>
                      <td className="px-3 py-3 text-sm text-gray-700">{brl(s.valor_previsto)}</td>
                      <td className="px-3 py-3 text-sm font-semibold"
                        style={{ color: isRecebida ? '#10b981' : '#d1d5db' }}>
                        {isRecebida ? brl(s.valor_recebido) : '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">
                        {s.hospede ?? '—'}
                        {s.receita_id && <div className="text-[10px] text-emerald-600 mt-0.5">🔗 Receita gerada</div>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <SemanaModal cotas={cotas} editData={s} onSuccess={load}
                            trigger={<button className="btn-ghost text-xs py-1 px-2">Editar</button>} />
                          <button
                            onClick={() => handleDelete(s.id, label)}
                            disabled={deleting === s.id}
                            className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deleting === s.id ? '...' : '✕'}
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
