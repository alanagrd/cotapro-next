'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { getPlanLimits } from '@/lib/plans'
import { CATEGORIAS, SEMANA_STATUSES, CANAIS } from '@/lib/utils'

export type CotaOption = { id: string; unidade: string; ativo_nome: string }

interface SemanaRow {
  id: string; cota_id: string; ano: number; numero_semana: number
  data_inicio: string; data_fim: string; categoria: string | null
  status: string; canal: string | null; valor_previsto: number
  valor_recebido: number; data_prevista: string | null
  data_recebimento: string | null; hospede: string | null
  codigo_reserva: string | null; taxa_comissao: number; observacoes: string | null
}

interface Props {
  cotas: CotaOption[]
  trigger?: React.ReactNode
  editData?: SemanaRow
  onSuccess?: () => void
}

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? '').trim(); return s || null
}
function num(v: FormDataEntryValue | null, fb = 0): number {
  const n = parseFloat(String(v ?? '')); return isNaN(n) ? fb : n
}
function dt(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? '').trim(); return s || null
}

export function SemanaModal({ cotas, trigger, editData, onSuccess }: Props) {
  const isEdit = !!editData
  const [open, setOpen]       = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function close() { setOpen(false); setError(null) }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    // Validate required fields
    const cota_id       = str(fd.get('cota_id'))
    const numero_semana = parseInt(String(fd.get('numero_semana') ?? '0'))
    const data_inicio   = dt(fd.get('data_inicio'))
    const data_fim      = dt(fd.get('data_fim'))

    if (!cota_id)       { setError('Selecione uma cota.'); return }
    if (!numero_semana) { setError('Informe o número da semana.'); return }
    if (!data_inicio || !data_fim) { setError('Informe as datas de início e fim.'); return }
    if (data_inicio > data_fim)    { setError('A data de início deve ser anterior à data de fim.'); return }

    setPending(true)
    setError(null)

    try {
      // ── Browser client — session always available ──────────────────────────
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { setError('Sessão expirada. Faça login novamente.'); return }

      const { data: profile } = await (supabase as any)
        .from('profiles').select('plano').eq('id', session.user.id).single()
      const limits = getPlanLimits((profile as { plano: string } | null)?.plano)

      if (!isEdit && limits.semanas !== Infinity) {
        const { count } = await (supabase as any)
          .from('semanas')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
        if ((count ?? 0) >= limits.semanas) {
          setError(`Seu plano ${limits.name} permite até ${limits.semanas} semana(s) no total. Faça upgrade para adicionar mais.`)
          return
        }
      }

      const payload = {
        cota_id,
        ano:              parseInt(String(fd.get('ano') ?? String(new Date().getFullYear()))),
        numero_semana,
        data_inicio,
        data_fim,
        categoria:        str(fd.get('categoria')),
        status:           str(fd.get('status')) ?? 'Disponível',
        canal:            str(fd.get('canal')),
        valor_previsto:   num(fd.get('valor_previsto')),
        valor_recebido:   num(fd.get('valor_recebido')),
        data_prevista:    dt(fd.get('data_prevista')),
        data_recebimento: dt(fd.get('data_recebimento')),
        hospede:          str(fd.get('hospede')),
        codigo_reserva:   str(fd.get('codigo_reserva')),
        taxa_comissao:    num(fd.get('taxa_comissao')),
        observacoes:      str(fd.get('observacoes')),
      }

      if (isEdit) {
        const { error: err } = await (supabase as any)
          .from('semanas')
          .update(payload)
          .eq('id', editData.id)
        if (err) { setError(err.message); return }
      } else {
        const { error: err } = await (supabase as any)
          .from('semanas')
          .insert({ ...payload, user_id: session.user.id })
        if (err) { setError(err.message); return }
      }

      close()
      onSuccess?.()
    } finally {
      setPending(false)
    }
  }

  const f  = editData
  const yr = new Date().getFullYear()

  return (
    <>
      {trigger && (
        <span onClick={() => setOpen(true)} className="cursor-pointer">{trigger}</span>
      )}

      <Modal
        open={open}
        onClose={close}
        title={isEdit ? `Editar semana ${editData.numero_semana}/${editData.ano}` : 'Nova Semana'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* ── Cota & Período ── */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
              Cota &amp; Período
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="lbl">Cota *</label>
                <select name="cota_id" className="inp" defaultValue={f?.cota_id ?? ''} required>
                  <option value="">Selecione uma cota…</option>
                  {cotas.map(c => (
                    <option key={c.id} value={c.id}>{c.ativo_nome} — {c.unidade}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="lbl">Número da semana *</label>
                <input name="numero_semana" type="number" min={1} max={53} className="inp"
                  placeholder="1 — 53" defaultValue={f?.numero_semana ?? ''} required />
              </div>
              <div>
                <label className="lbl">Ano</label>
                <input name="ano" type="number" min={2000} max={2100} className="inp"
                  defaultValue={f?.ano ?? yr} required />
              </div>
              <div>
                <label className="lbl">Data inicial *</label>
                <input name="data_inicio" type="date" className="inp"
                  defaultValue={f?.data_inicio ?? ''} required />
              </div>
              <div>
                <label className="lbl">Data final *</label>
                <input name="data_fim" type="date" className="inp"
                  defaultValue={f?.data_fim ?? ''} required />
              </div>
            </div>
          </div>

          {/* ── Classificação ── */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
              Classificação
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="lbl">Categoria</label>
                <select name="categoria" className="inp" defaultValue={f?.categoria ?? 'Alta'}>
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="lbl">Status</label>
                <select name="status" className="inp" defaultValue={f?.status ?? 'Disponível'}>
                  {SEMANA_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="lbl">Canal</label>
                <select name="canal" className="inp" defaultValue={f?.canal ?? ''}>
                  <option value="">—</option>
                  {CANAIS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── Valores ── */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
              Valores
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="lbl">Valor previsto (R$)</label>
                <input name="valor_previsto" type="number" step="0.01" min={0} className="inp"
                  placeholder="0,00" defaultValue={f?.valor_previsto ?? 0} />
              </div>
              <div>
                <label className="lbl">Valor recebido (R$)</label>
                <input name="valor_recebido" type="number" step="0.01" min={0} className="inp"
                  placeholder="0,00" defaultValue={f?.valor_recebido ?? 0} />
              </div>
              <div>
                <label className="lbl">% Comissão / Taxa</label>
                <input name="taxa_comissao" type="number" step="0.1" min={0} max={100} className="inp"
                  placeholder="Ex.: 15" defaultValue={f?.taxa_comissao ?? 0} />
              </div>
              <div>
                <label className="lbl">Data prevista de recebimento</label>
                <input name="data_prevista" type="date" className="inp"
                  defaultValue={f?.data_prevista ?? ''} />
              </div>
              <div>
                <label className="lbl">Data de recebimento</label>
                <input name="data_recebimento" type="date" className="inp"
                  defaultValue={f?.data_recebimento ?? ''} />
              </div>
            </div>
          </div>

          {/* ── Hóspede ── */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
              Hóspede
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="lbl">Hóspede / Cliente</label>
                <input name="hospede" className="inp" placeholder="Nome completo"
                  defaultValue={f?.hospede ?? ''} />
              </div>
              <div>
                <label className="lbl">Código da reserva</label>
                <input name="codigo_reserva" className="inp" placeholder="Ex.: AIR-12345"
                  defaultValue={f?.codigo_reserva ?? ''} />
              </div>
            </div>
          </div>

          {/* ── Observações ── */}
          <div>
            <label className="lbl">Observações</label>
            <textarea name="observacoes" className="inp resize-none" rows={3}
              placeholder="Dados complementares, condições especiais..."
              defaultValue={f?.observacoes ?? ''} />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={close} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
              {pending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar semana'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
