'use client'
import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { createAtivo, updateAtivo } from './actions'
import type { Database } from '@/types/database'

type Ativo = Database['public']['Tables']['ativos']['Row']

const TIPOS    = ['Multipropriedade', 'Programa de Pontos']
const STATUSES = ['Ativo', 'Inativo']
const ESTADOS_BR = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

interface Props {
  trigger?: React.ReactNode
  editData?: Ativo
  onSuccess?: () => void   // ← called after create/edit so page can re-fetch
}

export function AtivoModal({ trigger, editData, onSuccess }: Props) {
  const isEdit = !!editData
  const [open, setOpen]   = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function close() { setOpen(false); setError(null) }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    if (!String(formData.get('nome')).trim()) { setError('O nome é obrigatório.'); return }
    setError(null)
    startTransition(async () => {
      const result = isEdit
        ? await updateAtivo(editData.id, formData)
        : await createAtivo(formData)
      if (result?.error) { setError(result.error); return }
      close()
      onSuccess?.()   // ← trigger re-fetch in parent
    })
  }

  const f = editData

  return (
    <>
      {trigger && <span onClick={() => setOpen(true)} className="cursor-pointer">{trigger}</span>}
      <Modal open={open} onClose={close}
        title={isEdit ? `Editar: ${editData.nome}` : 'Novo Ativo'} size="lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="lbl">Nome do ativo *</label>
              <input name="nome" className="inp" placeholder="Ex.: Bella Gramado"
                defaultValue={f?.nome ?? ''} required />
            </div>
            <div>
              <label className="lbl">Tipo *</label>
              <select name="tipo" className="inp" defaultValue={f?.tipo ?? 'Multipropriedade'}>
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Status</label>
              <select name="status" className="inp" defaultValue={f?.status ?? 'Ativo'}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Localização</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="lbl">Cidade</label>
                <input name="cidade" className="inp" placeholder="Gramado" defaultValue={f?.cidade ?? ''} />
              </div>
              <div>
                <label className="lbl">Estado</label>
                <select name="estado" className="inp" defaultValue={f?.estado ?? ''}>
                  <option value="">—</option>
                  {ESTADOS_BR.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="lbl">País</label>
                <input name="pais" className="inp" defaultValue={f?.pais ?? 'Brasil'} />
              </div>
            </div>
          </div>

          <div>
            <label className="lbl">Portal do cliente (URL)</label>
            <input name="portal" type="url" className="inp" placeholder="https://..."
              defaultValue={f?.portal ?? ''} />
          </div>
          <div>
            <label className="lbl">Observações</label>
            <textarea name="observacoes" className="inp resize-none" rows={3}
              defaultValue={f?.observacoes ?? ''} />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={close} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
              {pending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar ativo'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
