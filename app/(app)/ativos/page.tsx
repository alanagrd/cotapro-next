'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { DeleteButton } from '@/components/ui/DeleteButton'
import { AtivoModal } from './AtivoModal'
import { deleteAtivo } from './actions'
import type { Database } from '@/types/database'

type Ativo = Database['public']['Tables']['ativos']['Row']

export default function AtivosPage() {
  const router = useRouter()
  const [ativos, setAtivos]   = useState<Ativo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // ── Fetch from Supabase browser client (always fresh, respects RLS) ──────
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    // Verify session first
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) { router.replace('/login'); return }

    const { data, error: qErr } = await supabase
      .from('ativos')
      .select('*')
      .order('nome')

    if (qErr) setError(qErr.message)
    else setAtivos(data ?? [])
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalMulti  = ativos.filter(a => a.tipo === 'Multipropriedade').length
  const totalPts    = ativos.filter(a => a.tipo === 'Programa de Pontos').length
  const totalAtivo  = ativos.filter(a => a.status === 'Ativo').length

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-40 bg-gray-200 rounded-lg" />
        <div className="h-9 w-32 bg-gray-200 rounded-lg" />
      </div>
      <div className="card overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50">
            <div className="h-4 w-48 bg-gray-200 rounded" />
            <div className="h-5 w-28 bg-gray-100 rounded-full" />
            <div className="h-4 w-32 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  )

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) return (
    <div className="card p-8 text-center">
      <div className="text-3xl mb-3">⚠️</div>
      <p className="text-sm text-red-600 font-medium mb-3">Erro ao carregar ativos: {error}</p>
      <button onClick={load} className="btn-secondary text-sm">Tentar novamente</button>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Ativos</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {ativos.length} cadastrado(s) · {totalAtivo} ativo(s) ·{' '}
            {totalMulti} multipropriedades · {totalPts} prog. pontos
          </p>
        </div>
        <AtivoModal
          onSuccess={load}
          trigger={
            <button className="btn-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
              </svg>
              Novo ativo
            </button>
          }
        />
      </div>

      {/* Empty state */}
      {ativos.length === 0 && (
        <div className="card p-16 text-center">
          <div className="text-4xl mb-3">🏢</div>
          <h3 className="font-semibold text-gray-900 mb-1">Nenhum ativo cadastrado</h3>
          <p className="text-sm text-gray-500 mb-4">
            Comece adicionando seu primeiro empreendimento ou programa de pontos.
          </p>
          <AtivoModal
            onSuccess={load}
            trigger={<button className="btn-primary mx-auto">+ Novo ativo</button>}
          />
        </div>
      )}

      {/* Table */}
      {ativos.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full border-collapse">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                {['Nome', 'Tipo', 'Localização', 'Portal', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ativos.map(a => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-sm text-gray-900">{a.nome}</div>
                    {a.observacoes && (
                      <div className="text-xs text-gray-400 truncate max-w-xs mt-0.5">{a.observacoes}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={a.tipo}
                      colorClass={a.tipo === 'Multipropriedade'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-purple-50 text-purple-700'} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {[a.cidade, a.estado, a.pais].filter(Boolean).join(', ')}
                  </td>
                  <td className="px-4 py-3">
                    {a.portal
                      ? <a href={a.portal} target="_blank" rel="noreferrer"
                          className="text-indigo-600 text-xs hover:underline">Abrir portal ↗</a>
                      : <span className="text-gray-300 text-xs">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={a.status}
                      colorClass={a.status === 'Ativo'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-gray-100 text-gray-500'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <AtivoModal
                        editData={a}
                        onSuccess={load}
                        trigger={<button className="btn-ghost text-xs py-1 px-2.5">Editar</button>}
                      />
                      <DeleteButton
                        id={a.id}
                        action={deleteAtivo}
                        onSuccess={load}
                        label="Excluir"
                        confirmMessage={`Excluir o ativo "${a.nome}"? Todas as cotas e semanas vinculadas também serão excluídas.`}
                      />
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
