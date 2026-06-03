'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { RECEITA_STATUSES, CANAIS } from '@/lib/utils'

export type SemanaOption = { id: string; label: string }
export type AtivoOption  = { id: string; nome: string }

interface ReceitaRow {
  id: string; semana_id: string | null; ativo_id: string | null; descricao: string | null
  valor_bruto: number; taxas: number; valor_liquido: number
  data_competencia: string | null; data_recebimento: string | null
  canal: string | null; status: string; observacoes: string | null
}

interface Props {
  semanas: SemanaOption[]
  ativos: AtivoOption[]
  trigger?: React.ReactNode
  editData?: ReceitaRow
  onSuccess?: () => void
}

export function ReceitaModal({ semanas, ativos, trigger, editData, onSuccess }: Props) {
  const isEdit = !!editData
  const [open, setOpen]       = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [bruto, setBruto]     = useState(editData?.valor_bruto ?? 0)
  const [taxas, setTaxas]     = useState(editData?.taxas ?? 0)

  useEffect(() => {
    if (open) { setBruto(editData?.valor_bruto ?? 0); setTaxas(editData?.taxas ?? 0) }
  }, [open, editData])

  function close() { setOpen(false); setError(null) }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    const valor_bruto = parseFloat(String(fd.get('valor_bruto') ?? '0')) || 0
    if (valor_bruto <= 0) { setError('O valor bruto deve ser maior que zero.'); return }

    setPending(true)
    setError(null)

    try {
      // ── Browser client — session always available ──────────────────────────
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { setError('Sessão expirada. Faça login novamente.'); return }

      const str = (k: string) => { const s = String(fd.get(k) ?? '').trim(); return s || null }
      const dt  = (k: string) => { const s = String(fd.get(k) ?? '').trim(); return s || null }

      const payload = {
        semana_id:        str('semana_id'),
        ativo_id:         str('ativo_id'),
        descricao:        str('descricao'),
        valor_bruto,
        taxas:            parseFloat(String(fd.get('taxas') ?? '0')) || 0,
        data_competencia: dt('data_competencia'),
        data_recebimento: dt('data_recebimento'),
        canal:            str('canal'),
        status:           str('status') ?? 'Previsto',
        observacoes:      str('observacoes'),
      }

      if (isEdit) {
        const { error: err } = await (supabase as any)
          .from('receitas')
          .update(payload)
          .eq('id', editData.id)
        if (err) { setError(err.message); return }
      } else {
        const { error: err } = await (supabase as any)
          .from('receitas')
          .insert({ ...payload, user_id: session.user.id })
        if (err) { setError(err.message); return }
      }

      close()
      onSuccess?.()
    } finally {
      setPending(false)
    }
  }

  const f = editData
  const liquido = bruto - taxas

  return (
    <>
      {trigger && (
        <span onClick={() => setOpen(true)} className="cursor-pointer">{trigger}</span>
      )}

      <Modal open={open} onClose={close}
        title={isEdit ? 'Editar Receita' : 'Nova Receita'} size="lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Semana + Ativo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="lbl">Semana vinculada</label>
              <select name="semana_id" className="inp" defaultValue={f?.semana_id ?? ''}>
                <option value="">Nenhuma (lançamento manual)</option>
                {semanas.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Ativo</label>
              <select name="ativo_id" className="inp" defaultValue={f?.ativo_id ?? ''}>
                <option value="">Selecione…</option>
                {ativos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="lbl">Descrição</label>
            <input name="descricao" className="inp" placeholder="Ex.: Locação Sem 28/2026 — Airbnb"
              defaultValue={f?.descricao ?? ''} />
          </div>

          {/* Valores */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Valores</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="lbl">Valor bruto (R$) *</label>
                <input name="valor_bruto" type="number" step="0.01" min={0.01} className="inp"
                  placeholder="0,00" value={bruto || ''}
                  onChange={e => setBruto(parseFloat(e.target.value) || 0)} required />
              </div>
              <div>
                <label className="lbl">Taxas / Descontos (R$)</label>
                <input name="taxas" type="number" step="0.01" min={0} className="inp"
                  placeholder="0,00" value={taxas || ''}
                  onChange={e => setTaxas(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="lbl">Valor líquido</label>
                <div className={`inp bg-gray-50 font-semibold cursor-default ${liquido > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {liquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </div>
            </div>
          </div>

          {/* Datas + Canal + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="lbl">Competência (mês de referência)</label>
              <input name="data_competencia" type="month" className="inp"
                defaultValue={f?.data_competencia?.substring(0, 7) ?? ''} />
            </div>
            <div>
              <label className="lbl">Data de recebimento</label>
              <input name="data_recebimento" type="date" className="inp"
                defaultValue={f?.data_recebimento ?? ''} />
            </div>
            <div>
              <label className="lbl">Canal</label>
              <select name="canal" className="inp" defaultValue={f?.canal ?? ''}>
                <option value="">—</option>
                {CANAIS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Status</label>
              <select name="status" className="inp" defaultValue={f?.status ?? 'Previsto'}>
                {RECEITA_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="lbl">Observações</label>
            <textarea name="observacoes" className="inp resize-none" rows={2}
              defaultValue={f?.observacoes ?? ''} />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={close} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
              {pending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar receita'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
