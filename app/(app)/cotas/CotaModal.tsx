'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { getPlanLimits } from '@/lib/plans'
import type { Database } from '@/types/database'

type Cota  = Database['public']['Tables']['cotas']['Row']
type Ativo = Pick<Database['public']['Tables']['ativos']['Row'], 'id' | 'nome'>

interface Props {
  ativos: Ativo[]
  trigger?: React.ReactNode
  editData?: Cota
  onSuccess?: () => void
}

export function CotaModal({ ativos, trigger, editData, onSuccess }: Props) {
  const isEdit = !!editData
  const [open, setOpen]       = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function close() { setOpen(false); setError(null) }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    const ativo_id = String(fd.get('ativo_id') ?? '').trim()
    const unidade  = String(fd.get('unidade')  ?? '').trim()
    if (!ativo_id) { setError('Selecione um ativo.'); return }
    if (!unidade)  { setError('A unidade é obrigatória.'); return }

    setPending(true)
    setError(null)

    try {
      // ── Use the BROWSER client — session is always available here ──────────
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { setError('Sessão expirada. Faça login novamente.'); return }

      const { data: profile } = await supabase
        .from('profiles').select('plano').eq('id', session.user.id).single()
      const limits = getPlanLimits((profile as { plano: string } | null)?.plano)

      if (!isEdit && limits.cotas !== Infinity) {
        const { count } = await supabase
          .from('cotas')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
        if ((count ?? 0) >= limits.cotas) {
          setError(`Seu plano ${limits.name} permite até ${limits.cotas} cota(s). Faça upgrade para adicionar mais.`)
          return
        }
      }

      const payload = {
        ativo_id,
        unidade,
        fracao:          String(fd.get('fracao')          ?? '1/52').trim() || '1/52',
        descricao:       String(fd.get('descricao')       ?? '').trim() || null,
        semanas_por_ano: parseInt(String(fd.get('semanas_por_ano') ?? '1')) || 1,
        valor_aquisicao: parseFloat(String(fd.get('valor_aquisicao') ?? '0')) || 0,
        taxa_manutencao: parseFloat(String(fd.get('taxa_manutencao') ?? '0')) || 0,
        status:          String(fd.get('status') ?? 'Ativa'),
      }

      let cotaId = editData?.id ?? ''

      if (isEdit) {
        const { error: err } = await (supabase as any)
          .from('cotas')
          .update(payload)
          .eq('id', editData.id)
        if (err) { setError(err.message); return }
      } else {
        const { data: nova, error: err } = await (supabase as any)
          .from('cotas')
          .insert({ ...payload, user_id: session.user.id })
          .select('id')
          .single()
        if (err) { setError(err.message); return }
        cotaId = nova?.id ?? ''
      }

      // ── Auto-criar custo de manutenção anual ─────────────────────────
      if (payload.taxa_manutencao > 0 && cotaId) {
        const anoAtual = new Date().getFullYear()
        // Verifica se já existe custo de manutenção para este cota+ano
        const { data: existing } = await supabase
          .from('custos')
          .select('id')
          .eq('cota_id', cotaId)
          .eq('ano', anoAtual)
          .eq('tipo', 'Taxa de Manutenção')
          .maybeSingle()

        if (!existing) {
          await (supabase as any).from('custos').insert({
            user_id:        session.user.id,
            ativo_id:       payload.ativo_id || null,
            cota_id:        cotaId,
            ano:            anoAtual,
            tipo:           'Taxa de Manutenção',
            descricao:      `Manutenção anual ${anoAtual} — ${payload.unidade}`,
            valor:          payload.taxa_manutencao,
            status:         'Pendente',
          })
        }
      }

      close()
      onSuccess?.()
    } finally {
      setPending(false)
    }
  }

  const f = editData

  return (
    <>
      {trigger && (
        <span onClick={() => setOpen(true)} className="cursor-pointer">{trigger}</span>
      )}

      <Modal
        open={open}
        onClose={close}
        title={isEdit ? `Editar cota: ${editData.unidade}` : 'Nova Cota'}
        subtitle={isEdit ? undefined : 'Vinculada a um ativo Multipropriedade'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Ativo */}
          <div>
            <label className="lbl">Ativo (Multipropriedade) *</label>
            <select name="ativo_id" className="inp" defaultValue={f?.ativo_id ?? ''} required>
              <option value="">Selecione um ativo…</option>
              {ativos.map(a => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
          </div>

          {/* Unidade + Fração */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="lbl">Unidade *</label>
              <input name="unidade" className="inp" placeholder="Ex.: Apto 412-A"
                defaultValue={f?.unidade ?? ''} required />
            </div>
            <div>
              <label className="lbl">Fração</label>
              <input name="fracao" className="inp" placeholder="1/52"
                defaultValue={f?.fracao ?? '1/52'} />
            </div>
          </div>

          {/* Semanas + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="lbl">Semanas por ano</label>
              <input name="semanas_por_ano" type="number" min={1} max={52} className="inp"
                defaultValue={f?.semanas_por_ano ?? 1} />
            </div>
            <div>
              <label className="lbl">Status</label>
              <select name="status" className="inp" defaultValue={f?.status ?? 'Ativa'}>
                <option>Ativa</option>
                <option>Inativa</option>
              </select>
            </div>
          </div>

          {/* Valores financeiros */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Valores financeiros
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="lbl">Valor de aquisição (R$)</label>
                <input name="valor_aquisicao" type="number" step="0.01" min={0} className="inp"
                  placeholder="0,00" defaultValue={f?.valor_aquisicao ?? 0} />
              </div>
              <div>
                <label className="lbl">Taxa de manutenção anual (R$)</label>
                <input name="taxa_manutencao" type="number" step="0.01" min={0} className="inp"
                  placeholder="0,00" defaultValue={f?.taxa_manutencao ?? 0} />
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="lbl">Descrição</label>
            <textarea name="descricao" className="inp resize-none" rows={2}
              placeholder="Informações adicionais sobre a cota..."
              defaultValue={f?.descricao ?? ''} />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={close} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
              {pending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar cota'}
            </button>
          </div>

        </form>
      </Modal>
    </>
  )
}
