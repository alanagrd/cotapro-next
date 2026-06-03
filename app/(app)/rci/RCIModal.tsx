'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'

type SemanaOpt = { id: string; label: string }
interface RCIRow { id:string; semana_id:string|null; data_troca:string; pontos_recebidos:number; pontos_utilizados:number; data_expiracao:string|null; destino:string|null; observacoes:string|null }

interface Props { semanas:SemanaOpt[]; trigger?:React.ReactNode; editData?:RCIRow; onSuccess?:()=>void }

export function RCIModal({ semanas, trigger, editData, onSuccess }: Props) {
  const isEdit = !!editData
  const [open,setOpen]=useState(false); const [error,setError]=useState<string|null>(null); const [pending,setPending]=useState(false)
  function close(){setOpen(false);setError(null)}

  async function handleSubmit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault(); const fd=new FormData(e.currentTarget)
    const rec=parseInt(String(fd.get('pontos_recebidos')??'0'))||0
    if(!rec){setError('Informe os pontos recebidos.');return}
    setPending(true);setError(null)
    try{
      const supabase=createClient()
      const {data:{session}}=await supabase.auth.getSession()
      if(!session?.user){setError('Sessão expirada.');return}
      const str=(k:string)=>{const s=String(fd.get(k)??'').trim();return s||null}
      const payload={semana_id:str('semana_id'),data_troca:str('data_troca')??new Date().toISOString().split('T')[0],pontos_recebidos:rec,pontos_utilizados:parseInt(String(fd.get('pontos_utilizados')??'0'))||0,data_expiracao:str('data_expiracao'),destino:str('destino'),observacoes:str('observacoes')}
      if(isEdit){const{error:err}=await (supabase as any).from('rci').update(payload).eq('id',editData.id);if(err){setError(err.message);return}}
      else{const{error:err}=await (supabase as any).from('rci').insert({...payload,user_id:session.user.id});if(err){setError(err.message);return}}
      close();onSuccess?.()
    }finally{setPending(false)}
  }
  const f=editData
  return(
    <>{trigger&&<span onClick={()=>setOpen(true)} className="cursor-pointer">{trigger}</span>}
    <Modal open={open} onClose={close} title={isEdit?'Editar Troca RCI':'Nova Troca RCI'} size="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="lbl">Semana vinculada</label><select name="semana_id" className="inp" defaultValue={f?.semana_id??''}><option value="">Nenhuma</option>{semanas.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
          <div><label className="lbl">Data da troca *</label><input name="data_troca" type="date" className="inp" defaultValue={f?.data_troca??''} required/></div>
          <div><label className="lbl">Pontos recebidos *</label><input name="pontos_recebidos" type="number" min={0} className="inp" placeholder="0" defaultValue={f?.pontos_recebidos??''} required/></div>
          <div><label className="lbl">Pontos utilizados</label><input name="pontos_utilizados" type="number" min={0} className="inp" placeholder="0" defaultValue={f?.pontos_utilizados??0}/></div>
          <div><label className="lbl">Data de expiração</label><input name="data_expiracao" type="date" className="inp" defaultValue={f?.data_expiracao??''}/></div>
          <div className="col-span-2"><label className="lbl">Destino utilizado</label><input name="destino" className="inp" placeholder="Ex.: Thermas dos Laranjais" defaultValue={f?.destino??''}/></div>
          <div className="col-span-2"><label className="lbl">Observações</label><textarea name="observacoes" className="inp resize-none" rows={2} defaultValue={f?.observacoes??''}/></div>
        </div>
        {error&&<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={close} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">{pending?'Salvando...':isEdit?'Salvar alterações':'Registrar troca'}</button>
        </div>
      </form>
    </Modal></>
  )
}
