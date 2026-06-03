'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'

type AtivoOpt = { id: string; nome: string }
type CotaOpt  = { id: string; label: string }

interface CustoRow {
  id: string; ativo_id: string | null; cota_id: string | null
  ano: number; tipo: string; descricao: string | null
  valor: number; data_pagamento: string | null
  status: string; observacoes: string | null
}

interface Props {
  ativos: AtivoOpt[]
  cotas: CotaOpt[]
  trigger?: React.ReactNode
  editData?: CustoRow
  onSuccess?: () => void
}

const TIPOS = ['Taxa de Manutenção','Taxa de Administração','IPTU','Seguro','Reforma','Outros']

export function CustoModal({ ativos, cotas, trigger, editData, onSuccess }: Props) {
  const isEdit = !!editData
  const [open, setOpen]       = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function close() { setOpen(false); setError(null) }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const valor = parseFloat(String(fd.get('valor') ?? '0')) || 0
    if (valor <= 0) { setError('Informe um valor válido.'); return }

    setPending(true); setError(null)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { setError('Sessão expirada.'); return }

      const str = (k: string) => { const s = String(fd.get(k)??'').trim(); return s||null }

      const payload = {
        ativo_id:       str('ativo_id'),
        cota_id:        str('cota_id'),
        ano:            parseInt(String(fd.get('ano')??String(new Date().getFullYear()))),
        tipo:           String(fd.get('tipo')??''),
        descricao:      str('descricao'),
        valor,
        data_pagamento: str('data_pagamento'),
        status:         String(fd.get('status')??'Pendente'),
        observacoes:    str('observacoes'),
      }

      if (isEdit) {
        const { error: err } = await supabase.from('custos').update(payload).eq('id', editData.id)
        if (err) { setError(err.message); return }
      } else {
        const { error: err } = await supabase.from('custos').insert({ ...payload, user_id: session.user.id })
        if (err) { setError(err.message); return }
      }
      close(); onSuccess?.()
    } finally { setPending(false) }
  }

  const f = editData
  return (
    <>
      {trigger && <span onClick={() => setOpen(true)} className="cursor-pointer">{trigger}</span>}
      <Modal open={open} onClose={close} title={isEdit ? 'Editar Custo' : 'Novo Custo'} size="lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="lbl">Ativo</label>
              <select name="ativo_id" className="inp" defaultValue={f?.ativo_id ?? ''}>
                <option value="">Selecione…</option>
                {ativos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Cota (opcional)</label>
              <select name="cota_id" className="inp" defaultValue={f?.cota_id ?? ''}>
                <option value="">Nenhuma</option>
                {cotas.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Ano *</label>
              <input name="ano" type="number" min={2000} max={2100} className="inp"
                defaultValue={f?.ano ?? new Date().getFullYear()} required />
            </div>
            <div>
              <label className="lbl">Tipo *</label>
              <select name="tipo" className="inp" defaultValue={f?.tipo ?? 'Taxa de Manutenção'}>
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Valor (R$) *</label>
              <input name="valor" type="number" step="0.01" min={0.01} className="inp"
                placeholder="0,00" defaultValue={f?.valor ?? ''} required />
            </div>
            <div>
              <label className="lbl">Status</label>
              <select name="status" className="inp" defaultValue={f?.status ?? 'Pendente'}>
                <option>Pendente</option><option>Pago</option>
              </select>
            </div>
            <div>
              <label className="lbl">Data de pagamento</label>
              <input name="data_pagamento" type="date" className="inp" defaultValue={f?.data_pagamento ?? ''} />
            </div>
            <div>
              <label className="lbl">Descrição</label>
              <input name="descricao" className="inp" placeholder="Descrição do custo" defaultValue={f?.descricao ?? ''} />
            </div>
            <div className="col-span-2">
              <label className="lbl">Observações</label>
              <textarea name="observacoes" className="inp resize-none" rows={2} defaultValue={f?.observacoes ?? ''} />
            </div>
          </div>
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={close} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
              {pending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar custo'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
