'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { brl, fmtDate } from '@/lib/utils'

export default function ReservasPage() {
  const router = useRouter()
  const [reservas, setReservas] = useState<any[]>([])
  const [progs, setProgs]       = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [deleting, setDeleting] = useState<string|null>(null)
  const [modal, setModal]       = useState<{open:boolean;data?:any}>({open:false})
  const [pending, setPending]   = useState(false)
  const [mError, setMError]     = useState<string|null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.replace('/login'); return }
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from('reservas_pontos').select('*, programas_pontos(id,nome,emoji)').order('data_checkin', { ascending: false }),
      supabase.from('programas_pontos').select('id,nome,emoji').order('nome'),
    ])
    setReservas(r ?? []); setProgs(p ?? []); setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const hotel = String(fd.get('hotel')??'').trim()
    if(!hotel){setMError('Informe o hotel/destino.');return}
    setPending(true);setMError(null)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if(!session?.user){setMError('Sessão expirada.');setPending(false);return}
    const str=(k:string)=>{const s=String(fd.get(k)??'').trim();return s||null}
    const payload={programa_id:str('programa_id')??'',hotel,cidade:str('cidade'),data_checkin:str('data_checkin'),data_checkout:str('data_checkout'),pontos_utilizados:parseInt(String(fd.get('pontos_utilizados')??'0'))||0,valor_estimado:parseFloat(String(fd.get('valor_estimado')??'0'))||0,observacoes:str('observacoes')}
    let err:any
    if(modal.data){({error:err}=await supabase.from('reservas_pontos').update(payload).eq('id',modal.data.id))}
    else{({error:err}=await supabase.from('reservas_pontos').insert({...payload,user_id:session.user.id}))}
    setPending(false);if(err){setMError(err.message);return}
    setModal({open:false});load()
  }

  async function handleDelete(id:string,hotel:string){
    if(!window.confirm(`Excluir a reserva em "${hotel}"?`))return
    setDeleting(id);await createClient().from('reservas_pontos').delete().eq('id',id)
    setDeleting(null);setReservas(prev=>prev.filter(r=>r.id!==id))
  }

  const today=new Date();today.setHours(0,0,0,0)
  const stBadge=(r:any)=>{
    if(!r.data_checkin)return{l:'Sem data',c:'bg-gray-100 text-gray-500'}
    const ci=new Date(r.data_checkin)
    if(ci<today&&r.data_checkout&&new Date(r.data_checkout)<today)return{l:'Concluída',c:'bg-gray-100 text-gray-500'}
    if(ci<=new Date(today.getTime()+7*86400000))return{l:'Próxima',c:'bg-orange-50 text-orange-700'}
    return{l:'Confirmada',c:'bg-emerald-50 text-emerald-700'}
  }

  if(loading)return <div className="animate-pulse space-y-4"><div className="card h-24"/><div className="grid grid-cols-3 gap-4">{[0,1,2].map(i=><div key={i} className="card h-40"/>)}</div></div>

  const f=modal.data
  return(
    <div>
      <div className="flex items-start justify-between mb-6">
        <div><h2 className="text-xl font-bold text-gray-900">Reservas com Pontos</h2><p className="text-sm text-gray-500 mt-0.5">Hospedagens resgatadas com pontos</p></div>
        <button className="btn-primary" onClick={()=>{setModal({open:true});setMError(null)}}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>Nova reserva
        </button>
      </div>

      {reservas.length===0?(
        <div className="card p-16 text-center"><div className="text-4xl mb-3">🏨</div><h3 className="font-semibold text-gray-900 mb-1">Nenhuma reserva cadastrada</h3><p className="text-sm text-gray-500 mb-4">Registre hospedagens pagas com pontos.</p><button className="btn-primary mt-2 mx-auto" onClick={()=>setModal({open:true})}>+ Nova reserva</button></div>
      ):(
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {reservas.map(r=>{
            const st=stBadge(r)
            return(
              <div key={r.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{r.programas_pontos?.emoji??'🏨'}</span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.c}`}>{st.l}</span>
                </div>
                <div className="font-bold text-gray-900 mb-0.5">{r.hotel}</div>
                <div className="text-xs text-gray-400 mb-4">{r.cidade??'—'}</div>
                <div className="border-t border-gray-100 pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-gray-400">Programa</span><span className="font-medium">{r.programas_pontos?.nome??'—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Check-in</span><span>{fmtDate(r.data_checkin)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Check-out</span><span>{fmtDate(r.data_checkout)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Pontos</span><span className="font-bold text-indigo-600">{(r.pontos_utilizados??0).toLocaleString('pt-BR')} pts</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Valor est.</span><span className="font-bold text-emerald-600">{brl(r.valor_estimado)}</span></div>
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                  <button className="btn-secondary flex-1 justify-center text-xs py-1.5" onClick={()=>{setModal({open:true,data:r});setMError(null)}}>✏️ Editar</button>
                  <button onClick={()=>handleDelete(r.id,r.hotel)} disabled={deleting===r.id} className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50">{deleting===r.id?'...':'🗑'}</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modal.open} onClose={()=>setModal({open:false})} title={f?`Editar: ${f.hotel}`:'Nova Reserva com Pontos'} size="lg">
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="lbl">Programa *</label><select name="programa_id" className="inp" defaultValue={f?.programa_id??''} required><option value="">Selecione…</option>{progs.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
            <div><label className="lbl">Hotel / Destino *</label><input name="hotel" className="inp" placeholder="Ex.: Novotel São Paulo" defaultValue={f?.hotel??''} required/></div>
            <div><label className="lbl">Cidade</label><input name="cidade" className="inp" placeholder="São Paulo, SP" defaultValue={f?.cidade??''}/></div>
            <div><label className="lbl">Pontos utilizados</label><input name="pontos_utilizados" type="number" min={0} className="inp" placeholder="0" defaultValue={f?.pontos_utilizados??0}/></div>
            <div><label className="lbl">Check-in</label><input name="data_checkin" type="date" className="inp" defaultValue={f?.data_checkin??''}/></div>
            <div><label className="lbl">Check-out</label><input name="data_checkout" type="date" className="inp" defaultValue={f?.data_checkout??''}/></div>
            <div><label className="lbl">Valor estimado (R$)</label><input name="valor_estimado" type="number" step="0.01" min={0} className="inp" placeholder="0,00" defaultValue={f?.valor_estimado??0}/></div>
            <div className="col-span-2"><label className="lbl">Observações</label><textarea name="observacoes" className="inp resize-none" rows={2} defaultValue={f?.observacoes??''}/></div>
          </div>
          {mError&&<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{mError}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={()=>setModal({open:false})} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">{pending?'Salvando...':f?'Salvar alterações':'Criar reserva'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
