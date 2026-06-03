'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { fmtDate } from '@/lib/utils'

const CATEGORIAS = ['Compra','Bônus','Indicação','Utilização','Expiração','Ajuste']

export default function MovimentacoesPage() {
  const router = useRouter()
  const [movs, setMovs]       = useState<any[]>([])
  const [progs, setProgs]     = useState<any[]>([])
  const [saldos, setSaldos]   = useState<Record<string,number>>({})
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string|null>(null)
  const [modal, setModal]     = useState<{open:boolean;data?:any}>({open:false})
  const [pending, setPending] = useState(false)
  const [mError, setMError]   = useState<string|null>(null)
  const [fProg, setFProg]     = useState('')
  const [fTipo, setFTipo]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.replace('/login'); return }
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase.from('movimentacoes_pontos').select('*, programas_pontos(id,nome,saldo_inicial,emoji)').order('data', { ascending: false }),
      supabase.from('programas_pontos').select('id,nome,emoji,saldo_inicial').order('nome'),
    ])
    setMovs(m ?? [])
    setProgs(p ?? [])
    // Compute saldos
    const sd: Record<string,number> = {}
    ;(p??[]).forEach((prog:any)=>{ sd[prog.id]=prog.saldo_inicial??0 })
    ;(m??[]).forEach((mov:any)=>{
      if(sd[mov.programa_id]!==undefined)
        sd[mov.programa_id]+=mov.tipo==='Entrada'?mov.quantidade:-mov.quantidade
    })
    setSaldos(sd)
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const qtd = parseInt(String(fd.get('quantidade')??'0'))||0
    if(!qtd){setMError('Informe a quantidade de pontos.');return}
    setPending(true);setMError(null)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if(!session?.user){setMError('Sessão expirada.');setPending(false);return}
    const str=(k:string)=>{const s=String(fd.get(k)??'').trim();return s||null}
    const payload={programa_id:str('programa_id')??'',data:str('data')??new Date().toISOString().split('T')[0],tipo:str('tipo')??'Entrada',categoria:str('categoria'),quantidade:qtd,validade:str('validade'),descricao:str('descricao'),nome_indicado:str('nome_indicado')}
    let err:any
    if(modal.data){({error:err}=await (supabase as any).from('movimentacoes_pontos').update(payload).eq('id',modal.data.id))}
    else{({error:err}=await (supabase as any).from('movimentacoes_pontos').insert({...payload,user_id:session.user.id}))}
    setPending(false)
    if(err){setMError(err.message);return}
    setModal({open:false});load()
  }

  async function handleDelete(id:string){
    if(!window.confirm('Excluir esta movimentação?'))return
    setDeleting(id);await createClient().from('movimentacoes_pontos').delete().eq('id',id)
    setDeleting(null);setMovs(prev=>prev.filter(m=>m.id!==id))
  }

  const filtered = movs.filter(m=>{
    if(fProg&&m.programa_id!==fProg)return false
    if(fTipo&&m.tipo!==fTipo)return false
    return true
  })

  if(loading)return <div className="animate-pulse space-y-4"><div className="card h-24"/><div className="card h-48"/></div>

  const f=modal.data
  return(
    <div>
      <div className="flex items-start justify-between mb-6">
        <div><h2 className="text-xl font-bold text-gray-900">Movimentações de Pontos</h2><p className="text-sm text-gray-500 mt-0.5">Extrato de entradas e saídas por programa</p></div>
        <button className="btn-primary" onClick={()=>{setModal({open:true});setMError(null)}}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>Nova movimentação
        </button>
      </div>

      {/* Saldo cards */}
      {progs.length>0&&(
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          {progs.map(p=>(
            <button key={p.id} onClick={()=>setFProg(fProg===p.id?'':p.id)}
              className={`card p-4 text-left transition-all ${fProg===p.id?'ring-2 ring-indigo-500':''}`}>
              <div className="text-xl mb-2">{p.emoji??'⭐'}</div>
              <div className="text-xs font-medium text-gray-700 truncate">{p.nome}</div>
              <div className="text-lg font-extrabold text-indigo-600 mt-1">{(saldos[p.id]??0).toLocaleString('pt-BR')}</div>
              <div className="text-[10px] text-gray-400">pontos</div>
            </button>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="card p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide self-center">Filtros</span>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">Programa</label>
            <select className="inp py-1.5 text-xs" value={fProg} onChange={e=>setFProg(e.target.value)}>
              <option value="">Todos</option>{progs.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">Tipo</label>
            <select className="inp py-1.5 text-xs" value={fTipo} onChange={e=>setFTipo(e.target.value)}>
              <option value="">Todos</option><option>Entrada</option><option>Saída</option>
            </select>
          </div>
          {(fProg||fTipo)&&<button onClick={()=>{setFProg('');setFTipo('')}} className="text-xs text-gray-400 underline self-end pb-1.5">Limpar</button>}
          <div className="ml-auto self-end pb-1.5 text-xs text-gray-400"><strong className="text-indigo-600">{filtered.length}</strong> de {movs.length}</div>
        </div>
      </div>

      {movs.length===0?(
        <div className="card p-16 text-center"><div className="text-4xl mb-3">↕️</div><h3 className="font-semibold text-gray-900 mb-1">Nenhuma movimentação</h3><p className="text-sm text-gray-500 mb-4">Cadastre programas de pontos primeiro.</p></div>
      ):(
        <div className="card overflow-hidden">
          <table className="w-full border-collapse">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>{['Programa','Data','Tipo','Categoria','Pontos','Validade','Descrição',''].map(h=><th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(m=>(
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.programas_pontos?.nome??'—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(m.data)}</td>
                  <td className="px-4 py-3"><Badge label={m.tipo} colorClass={m.tipo==='Entrada'?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-700'}/></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{m.categoria??'—'}</td>
                  <td className="px-4 py-3 font-bold" style={{color:m.tipo==='Entrada'?'#10b981':'#ef4444'}}>{m.tipo==='Entrada'?'+':'-'} {(m.quantidade??0).toLocaleString('pt-BR')} pts</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(m.validade)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{m.descricao??'—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button className="btn-ghost text-xs py-1 px-2.5" onClick={()=>{setModal({open:true,data:m});setMError(null)}}>Editar</button>
                      <button onClick={()=>handleDelete(m.id)} disabled={deleting===m.id} className="inline-flex items-center px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50">{deleting===m.id?'...':'✕'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal.open} onClose={()=>setModal({open:false})} title={f?'Editar Movimentação':'Nova Movimentação'} size="lg">
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="lbl">Programa *</label><select name="programa_id" className="inp" defaultValue={f?.programa_id??''} required><option value="">Selecione…</option>{progs.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
            <div><label className="lbl">Data *</label><input name="data" type="date" className="inp" defaultValue={f?.data??new Date().toISOString().split('T')[0]} required/></div>
            <div><label className="lbl">Tipo *</label><select name="tipo" className="inp" defaultValue={f?.tipo??'Entrada'}><option>Entrada</option><option>Saída</option></select></div>
            <div><label className="lbl">Categoria</label><select name="categoria" className="inp" defaultValue={f?.categoria??''}><option value="">—</option>{CATEGORIAS.map(c=><option key={c}>{c}</option>)}</select></div>
            <div><label className="lbl">Quantidade (pts) *</label><input name="quantidade" type="number" min={1} className="inp" placeholder="0" defaultValue={f?.quantidade??''} required/></div>
            <div><label className="lbl">Validade</label><input name="validade" type="date" className="inp" defaultValue={f?.validade??''}/></div>
            <div className="col-span-2"><label className="lbl">Descrição</label><input name="descricao" className="inp" placeholder="Descreva a movimentação" defaultValue={f?.descricao??''}/></div>
            <div className="col-span-2"><label className="lbl">Nome do indicado (se indicação)</label><input name="nome_indicado" className="inp" placeholder="Opcional" defaultValue={f?.nome_indicado??''}/></div>
          </div>
          {mError&&<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{mError}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={()=>setModal({open:false})} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">{pending?'Salvando...':f?'Salvar alterações':'Registrar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
