'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { CotaModal } from './CotaModal'
import { brl } from '@/lib/utils'
import type { Database } from '@/types/database'

type CotaWithAtivo = Database['public']['Tables']['cotas']['Row'] & {
  ativos: Pick<Database['public']['Tables']['ativos']['Row'], 'id' | 'nome' | 'tipo'> | null
}
type AtivoOption = Pick<Database['public']['Tables']['ativos']['Row'], 'id' | 'nome'>

export default function CotasPage() {
  const router = useRouter()
  const [cotas, setCotas]     = useState<CotaWithAtivo[]>([])
  const [ativos, setAtivos]   = useState<AtivoOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // ── Load all data using browser client ────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.replace('/login'); return }

    const [{ data: cotasData, error: e1 }, { data: ativosData }] = await Promise.all([
      supabase
        .from('cotas')
        .select('*, ativos(id, nome, tipo)')
        .order('created_at', { ascending: false }),
      supabase
        .from('ativos')
        .select('id, nome')
        .eq('status', 'Ativo')
        .eq('tipo', 'Multipropriedade')
        .order('nome'),
    ])

    if (e1) { setError(e1.message); setLoading(false); return }
    setCotas((cotasData ?? []) as CotaWithAtivo[])
    setAtivos(ativosData ?? [])
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  // ── Delete via browser client ─────────────────────────────────────────────
  async function handleDelete(id: string, nome: string) {
    if (!window.confirm(`Excluir a cota "${nome}"? As semanas vinculadas também serão excluídas.`)) return
    setDeleting(id)
    const supabase = createClient()
    const { error: err } = await supabase.from('cotas').delete().eq('id', id)
    setDeleting(null)
    if (err) { alert('Erro ao excluir: ' + err.message); return }
    // Remove from local state instantly (no re-fetch needed)
    setCotas(prev => prev.filter(c => c.id !== id))
  }

  // ── Derived totals ────────────────────────────────────────────────────────
  const totAq  = cotas.reduce((s, c) => s + (c.valor_aquisicao ?? 0), 0)
  const totMan = cotas.reduce((s, c) => s + (c.taxa_manutencao ?? 0), 0)

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-32 bg-gray-200 rounded-lg" />
        <div className="h-9 w-28 bg-gray-200 rounded-lg" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="card h-20" />)}
      </div>
      <div className="card h-48" />
    </div>
  )

  // ── Error state ───────────────────────────────────────────────────────────
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
          <h2 className="text-xl font-bold text-gray-900">Cotas</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {cotas.length} cota(s) · Portfólio: {brl(totAq)} · Manutenção/ano: {brl(totMan)}
          </p>
        </div>
        <CotaModal
          ativos={ativos}
          onSuccess={load}
          trigger={
            <button className="btn-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
              </svg>
              Nova cota
            </button>
          }
        />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Total de cotas
          </div>
          <div className="text-2xl font-extrabold text-indigo-600">{cotas.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Portfólio investido
          </div>
          <div className="text-2xl font-extrabold text-gray-900">{brl(totAq)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Manutenção anual
          </div>
          <div className="text-2xl font-extrabold text-red-500">{brl(totMan)}</div>
        </div>
      </div>

      {/* Empty state */}
      {cotas.length === 0 && (
        <div className="card p-16 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="font-semibold text-gray-900 mb-1">Nenhuma cota cadastrada</h3>
          <p className="text-sm text-gray-500 mb-4">
            {ativos.length === 0
              ? 'Cadastre ativos do tipo Multipropriedade primeiro.'
              : 'Adicione cotas aos seus ativos.'}
          </p>
          <CotaModal
            ativos={ativos}
            onSuccess={load}
            trigger={<button className="btn-primary mx-auto">+ Nova cota</button>}
          />
        </div>
      )}

      {/* Table */}
      {cotas.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full border-collapse">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                {['Ativo', 'Unidade', 'Fração', 'Sem./ano', 'Aquisição', 'Manutenção/ano', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cotas.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-sm text-gray-900">
                    {c.ativos?.nome ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c.unidade}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.fracao ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c.semanas_por_ano}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{brl(c.valor_aquisicao)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-red-500">{brl(c.taxa_manutencao)}</td>
                  <td className="px-4 py-3">
                    <Badge
                      label={c.status}
                      colorClass={c.status === 'Ativa'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-gray-100 text-gray-500'}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <CotaModal
                        ativos={ativos}
                        editData={c}
                        onSuccess={load}
                        trigger={
                          <button className="btn-ghost text-xs py-1 px-2.5">Editar</button>
                        }
                      />
                      <button
                        onClick={() => handleDelete(c.id, c.unidade)}
                        disabled={deleting === c.id}
                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deleting === c.id ? '...' : 'Excluir'}
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
