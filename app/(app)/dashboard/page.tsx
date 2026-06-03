import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { brl, fmtDate, SEMANA_STATUS_BADGE, badgeClass } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// ── Safe wrapper: returns [] on error instead of throwing ────────────────────
async function safeQuery(promise: Promise<any>): Promise<any[]> {
  try {
    const { data, error } = await promise
    if (error) {
      console.error('[Dashboard] query error:', error.message)
      return []
    }
    return data ?? []
  } catch (err) {
    console.error('[Dashboard] unexpected error:', err)
    return []
  }
}

export default async function DashboardPage() {
  const supabase = createClient()

  // Verify session — if cookie is missing/expired, redirect to login
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) redirect('/login')

  const db = supabase as any

  // ── Fetch data independently so one failing query doesn't crash the page ──
  const [ativos, cotas, semanas, receitas, custos, saldoProgramas, receitaAtivos] =
    await Promise.all([
      safeQuery(db.from('ativos').select('*').eq('status', 'Ativo')),
      safeQuery(db.from('cotas').select('*').eq('status', 'Ativa')),
      safeQuery(
        db.from('semanas')
          .select('*, cotas(unidade, ativos(nome))')
          .order('data_inicio', { ascending: false })
      ),
      safeQuery(
        db.from('receitas')
          .select('*')
          .in('status', ['Recebido', 'Parcial', 'Previsto'])
      ),
      safeQuery(db.from('custos').select('*').eq('status', 'Pendente')),
      safeQuery(db.from('vw_saldo_programas').select('*')),
      safeQuery(
        db.from('vw_receita_por_ativo')
          .select('*')
          .order('receita_liquida_total', { ascending: false })
      ),
    ])

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const today   = new Date()
  const yrNow   = today.getFullYear()
  const yrPrev  = yrNow - 1

  const recAcum = receitas
    .filter(r => r.status !== 'Previsto')
    .reduce((s: number, r: any) => s + (r.valor_liquido ?? 0), 0)

  const recAno = receitas
    .filter((r: any) => r.data_competencia?.startsWith(String(yrNow)) && r.status !== 'Previsto')
    .reduce((s: number, r: any) => s + (r.valor_liquido ?? 0), 0)

  const recPrev = receitas
    .filter((r: any) => r.data_competencia?.startsWith(String(yrNow)) && r.status === 'Previsto')
    .reduce((s: number, r: any) => s + (r.valor_bruto ?? 0), 0)

  const recAnoPrev = receitas
    .filter((r: any) => r.data_competencia?.startsWith(String(yrPrev)) && r.status !== 'Previsto')
    .reduce((s: number, r: any) => s + (r.valor_liquido ?? 0), 0)

  const deltaRec = recAnoPrev > 0
    ? Math.round((recAno - recAnoPrev) / recAnoPrev * 100)
    : null

  const saldoTotal = (saldoProgramas as any[])
    .reduce((s: number, p: any) => s + (p.saldo_atual ?? 0), 0)

  // ── Próximas semanas (60 days) ────────────────────────────────────────────
  const limit60 = new Date(today)
  limit60.setDate(limit60.getDate() + 60)

  const proximas = (semanas as any[])
    .filter(s => {
      if (!s.data_inicio) return false
      const d = new Date(s.data_inicio)
      return d >= today && d <= limit60
    })
    .sort((a: any, b: any) => a.data_inicio.localeCompare(b.data_inicio))
    .slice(0, 5)

  // ── Status count ──────────────────────────────────────────────────────────
  const statusCount: Record<string, number> = {}
  ;(semanas as any[]).forEach(s => {
    statusCount[s.status] = (statusCount[s.status] ?? 0) + 1
  })

  // ── Receita por ativo (fallback to computing from receitas if view is empty)
  const rankingList: Array<{ nome: string; val: number }> =
    (receitaAtivos as any[]).length > 0
      ? (receitaAtivos as any[]).map((r: any) => ({
          nome: r.ativo_nome,
          val:  r.receita_liquida_total ?? 0,
        }))
      : (() => {
          // Compute from raw receitas + ativos if view is unavailable
          const map: Record<string, number> = {}
          ;(receitas as any[]).forEach((r: any) => {
            const nome = (ativos as any[]).find((a: any) => a.id === r.ativo_id)?.nome
            if (nome) map[nome] = (map[nome] ?? 0) + (r.valor_liquido ?? 0)
          })
          return Object.entries(map).map(([nome, val]) => ({ nome, val }))
            .sort((a, b) => b.val - a.val)
        })()

  const maxRec = rankingList[0]?.val ?? 0

  const saudacao = today.getHours() < 12 ? 'Bom dia' : today.getHours() < 18 ? 'Boa tarde' : 'Boa noite'
  const dataFormatada = today.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const statusColor: Record<string, string> = {
    Locada: '#10b981', Pool: '#a855f7', 'Disponível': '#3b82f6',
    Reservada: '#f59e0b', RCI: '#6366f1', 'Uso Próprio': '#f97316', Perdida: '#ef4444',
  }

  return (
    <div className="space-y-6">

      {/* ── Greeting ── */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">
          {saudacao} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1 capitalize">{dataFormatada}</p>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Receita Líquida Total',
            value: brl(recAcum),
            sub: deltaRec !== null
              ? `${deltaRec >= 0 ? '↑' : '↓'} ${Math.abs(deltaRec)}% vs ${yrPrev}`
              : `${brl(recPrev)} previsto`,
            color: 'text-emerald-600',
          },
          {
            label: `Receita ${yrNow}`,
            value: brl(recAno),
            sub: `${brl(recPrev)} ainda previsto`,
            color: 'text-indigo-600',
          },
          {
            label: 'Semanas cadastradas',
            value: String(semanas.length),
            sub: `${ativos.length} ativo(s) · ${cotas.length} cota(s)`,
            color: 'text-orange-500',
          },
          {
            label: 'Saldo de Pontos',
            value: `${saldoTotal.toLocaleString('pt-BR')} pts`,
            sub: `${saldoProgramas.length} programa(s)`,
            color: 'text-purple-600',
          },
        ].map(k => (
          <div key={k.label} className="card p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
              {k.label}
            </div>
            <div className={`text-2xl font-extrabold leading-none ${k.color}`}>{k.value}</div>
            <div className="text-xs text-gray-400 mt-2">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Receita por ativo */}
        <div className="col-span-2 card p-5">
          <div className="text-sm font-semibold text-gray-900 mb-4">Receita líquida por ativo</div>
          {rankingList.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Nenhuma receita registrada ainda
            </p>
          ) : (
            <div className="space-y-3">
              {rankingList.slice(0, 6).map((r, i) => {
                const pct = maxRec > 0 ? Math.round(r.val / maxRec * 100) : 0
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''
                return (
                  <div key={r.nome}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">
                        {medal} {r.nome}
                      </span>
                      <span className="font-bold text-indigo-600">{brl(r.val)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Status das semanas */}
        <div className="card p-5">
          <div className="text-sm font-semibold text-gray-900 mb-4">Status das semanas</div>
          {Object.keys(statusCount).length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Nenhuma semana cadastrada</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(statusCount)
                .sort(([, a], [, b]) => b - a)
                .map(([status, qtd]) => {
                  const total = semanas.length || 1
                  const pct   = Math.round(qtd / total * 100)
                  const col   = statusColor[status] ?? '#9ca3af'
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: col }} />
                          {status}
                        </span>
                        <span className="font-semibold text-gray-900">{qtd}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${pct}%`, background: col }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Próximas semanas */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-gray-900">Próximas semanas</div>
            <a href="/semanas" className="text-xs text-indigo-600 hover:underline">
              Ver todas →
            </a>
          </div>

          {proximas.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              Nenhuma semana nos próximos 60 dias
            </p>
          ) : (
            <div className="space-y-2">
              {proximas.map((s: any) => {
                const diff = Math.round(
                  (new Date(s.data_inicio).getTime() - today.getTime()) / 86_400_000
                )
                const ativoNome = (s.cotas as any)?.ativos?.nome ?? '—'
                return (
                  <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                      S{s.numero_semana}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900 truncate">{ativoNome}</div>
                      <div className="text-[11px] text-gray-400">
                        {fmtDate(s.data_inicio)} → {fmtDate(s.data_fim)}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${badgeClass(SEMANA_STATUS_BADGE, s.status)}`}>
                        {s.status}
                      </span>
                      <div className={`text-[10px] mt-0.5 ${diff <= 3 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                        {diff === 0 ? 'Hoje!' : diff === 1 ? 'Amanhã' : `${diff}d`}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Custos pendentes / Alertas */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-gray-900">⚠️ Alertas</div>
            <a href="/custos" className="text-xs text-indigo-600 hover:underline">
              Ver custos →
            </a>
          </div>

          {custos.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-sm text-gray-400">Nenhum custo pendente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(custos as any[]).slice(0, 5).map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl">
                  <span className="text-base">📋</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-yellow-900 truncate">{c.tipo}</div>
                    <div className="text-[11px] text-yellow-700">{c.descricao ?? 'Sem descrição'}</div>
                  </div>
                  <div className="text-xs font-bold text-red-600 flex-shrink-0">{brl(c.valor)}</div>
                </div>
              ))}
              {custos.length > 5 && (
                <p className="text-xs text-gray-400 text-center pt-1">
                  + {custos.length - 5} mais pendente(s)
                </p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
