'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { brl } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'

function BRLTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-2 text-sm">
      <p className="font-semibold text-gray-700 mb-0.5">{label}</p>
      <p className="text-indigo-600 font-bold">{brl(payload[0].value)}</p>
    </div>
  )
}

const STATUS_C: Record<string,string> = {
  Locada:'#10b981',Pool:'#a855f7','Disponível':'#3b82f6',Reservada:'#f59e0b',RCI:'#6366f1','Uso Próprio':'#f97316',Perdida:'#ef4444',Cancelada:'#9ca3af',
}
const CANAL_C = ['#4f46e5','#6366f1','#818cf8','#a5b4fc','#c7d2fe','#e0e7ff']

export default function RelatoriosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [fAno, setFAno]       = useState('')

  // Datasets
  const [recPorAno, setRecPorAno]     = useState<any[]>([])
  const [recPorAtivo, setRecPorAtivo] = useState<any[]>([])
  const [recPorCanal, setRecPorCanal] = useState<any[]>([])
  const [statusPie, setStatusPie]     = useState<any[]>([])
  const [resumoAtivos, setResumoAtivos] = useState<any[]>([])
  const [anos, setAnos]               = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.replace('/login'); return }

    const [{ data: semanas }, { data: custos }, { data: cotasNomes }] = await Promise.all([
      (supabase as any).from('semanas').select('id, status, cota_id, data_inicio, data_recebimento, canal, valor_recebido, valor_previsto, taxa_comissao'),
      (supabase as any).from('custos').select('ativo_id, valor, status, ano'),
      (supabase as any).from('cotas').select('id, ativo_id, ativos(id, nome)'),
    ])

    // cota → ativo lookup
    const cotaToAtivo: Record<string,{id:string;nome:string}> = {}
    ;(cotasNomes??[]).forEach((c:any) => { cotaToAtivo[c.id] = { id:c.ativos?.id??'', nome:c.ativos?.nome??'—' } })

    const allSems = semanas ?? []
    const semsRec = allSems.filter(s => (s.valor_recebido??0) > 0)
    const semsAnos = [...new Set(semsRec.map(s=>(s.data_recebimento??s.data_inicio)?.substring(0,4)).filter(Boolean))].sort()
    setAnos(semsAnos as string[])

    const filtered = fAno ? semsRec.filter(s=>(s.data_recebimento??s.data_inicio)?.startsWith(fAno)) : semsRec

    // Chart 1: Receita por ano (line + bar)
    const byYr: Record<string,number> = {}
    semsRec.forEach(s=>{
      const yr=(s.data_recebimento??s.data_inicio)?.substring(0,4)??'?'
      byYr[yr]=(byYr[yr]??0)+(s.valor_recebido??0)
    })
    setRecPorAno(Object.keys(byYr).sort().map(a=>({ ano:a, receita:Math.round(byYr[a]) })))

    // Chart 2: Receita por ativo
    // receita     = valor bruto recebido nas semanas
    // comissoes   = taxa_comissao das semanas (ex: 15% Airbnb)
    // custos_fixos= tabela custos (manutencao anual, etc)
    // liq_semana  = receita - comissoes
    // resultado   = liq_semana - custos_fixos
    const byAtivo: Record<string,{receita:number;comissoes:number;custos_fixos:number}> = {}

    filtered.forEach(s=>{
      const at=cotaToAtivo[s.cota_id]?.nome??'—'
      if(!byAtivo[at]) byAtivo[at]={receita:0,comissoes:0,custos_fixos:0}
      const bruto=s.valor_recebido??0
      const com=Math.round(bruto*((s.taxa_comissao??0)/100)*100)/100
      byAtivo[at].receita+=bruto
      byAtivo[at].comissoes+=com
    })

    ;(custos??[]).filter(c=>!fAno||String(c.ano)===fAno).forEach(c=>{
      const nome=(c.ativo_id&&cotasNomes)?cotasNomes.find((x:any)=>x.ativos?.id===c.ativo_id)?.ativos?.nome??'—':'—'
      if(!byAtivo[nome])byAtivo[nome]={receita:0,comissoes:0,custos_fixos:0}
      byAtivo[nome].custos_fixos+=(c.valor??0)
    })

    const rpat=Object.entries(byAtivo).sort(([,a],[,b])=>b.receita-a.receita).slice(0,8)
      .map(([nome,v])=>{
        const liquido=Math.round(v.receita-v.comissoes)
        const resultado=Math.round(liquido-v.custos_fixos)
        return { nome:nome.length>16?nome.substring(0,14)+'…':nome, receita:Math.round(v.receita), comissoes:Math.round(v.comissoes), custos:Math.round(v.custos_fixos), liquido, resultado }
      })
    setRecPorAtivo(rpat)

    // Chart 3: Receita por Canal
    const byCanal: Record<string,number> = {}
    filtered.forEach(s=>{
      const c=s.canal??'Sem canal'
      byCanal[c]=(byCanal[c]??0)+(s.valor_recebido??0)
    })
    setRecPorCanal(Object.entries(byCanal).sort(([,a],[,b])=>b-a).map(([nome,value])=>({ nome, value:Math.round(value) })))

    // Chart 4: Status das semanas (pie)
    const bySt: Record<string,number> = {}
    allSems.forEach(s=>{ bySt[s.status]=(bySt[s.status]??0)+1 })
    setStatusPie(Object.entries(bySt).sort(([,a],[,b])=>b-a).map(([name,value])=>({ name, value, fill:STATUS_C[name]??'#c7d2fe' })))

    // Table: Resumo por ativo
    setResumoAtivos(rpat)
    setLoading(false)
  }, [router, fAno])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 bg-gray-200 rounded"/>
      <div className="grid grid-cols-2 gap-4">{[0,1,2,3].map(i=><div key={i} className="card h-56"/>)}</div>
    </div>
  )

  const totRec  = recPorAtivo.reduce((s,r)=>s+r.receita,0)
  const totCom  = recPorAtivo.reduce((s,r)=>s+(r.comissoes??0),0)
  const totCus  = recPorAtivo.reduce((s,r)=>s+r.custos,0)
  const totLiq  = recPorAtivo.reduce((s,r)=>s+(r.liquido??0),0)
  const totRes  = recPorAtivo.reduce((s,r)=>s+(r.resultado??0),0)

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Relatórios &amp; Análises</h2>
          <p className="text-sm text-gray-500 mt-0.5">Visão consolidada da carteira</p>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">Filtrar por ano</label>
            <select className="inp py-1.5 text-xs" value={fAno} onChange={e=>setFAno(e.target.value)}>
              <option value="">Todos os anos</option>
              {anos.map(a=><option key={a}>{a}</option>)}
            </select>
          </div>
          <button onClick={load} className="btn-ghost text-xs mt-3">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Atualizar
          </button>
        </div>
      </div>

      {/* KPIs de resumo */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[{l:'Receita Bruta',v:brl(totRec),c:'text-emerald-600'},{l:'Comissões/Taxas',v:brl(totCom),c:'text-orange-500'},{l:'Receita Líquida',v:brl(totLiq),c:'text-indigo-600'},{l:'Custos Fixos',v:brl(totCus),c:'text-red-500'},{l:'Resultado Final',v:brl(totRes),c:totRes>=0?'text-emerald-700':'text-red-600'}].map(k=>(
          <div key={k.l} className="card p-4"><div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{k.l}</div><div className={`text-2xl font-extrabold ${k.c}`}>{k.v}</div></div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card p-5">
          <div className="text-sm font-semibold text-gray-900 mb-1">Evolução da receita por ano</div>
          <div className="text-xs text-gray-400 mb-4">Valor recebido nas semanas</div>
          {recPorAno.length===0?(
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">Sem dados de receita ainda</div>
          ):(
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={recPorAno} margin={{top:4,right:8,left:8,bottom:0}}>
                <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false}/>
                <XAxis dataKey="ano" tick={{fontSize:12,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`R$${(v/1000).toFixed(0)}k`:`R$${v}`}/>
                <Tooltip content={<BRLTip/>}/>
                <Bar dataKey="receita" radius={[6,6,0,0]}>
                  {recPorAno.map((_,i)=><Cell key={i} fill={i===recPorAno.length-1?'rgba(99,102,241,0.45)':'#4f46e5'}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <div className="text-sm font-semibold text-gray-900 mb-1">Receita por canal</div>
          <div className="text-xs text-gray-400 mb-4">Distribuição por canal de venda</div>
          {recPorCanal.length===0?(
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">Sem dados de canal ainda</div>
          ):(
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={recPorCanal} cx="50%" cy="44%" innerRadius={50} outerRadius={72} paddingAngle={2} dataKey="value">
                  {recPorCanal.map((_,i)=><Cell key={i} fill={CANAL_C[i%CANAL_C.length]}/>)}
                </Pie>
                <Tooltip formatter={(v:any)=>[brl(v),'Receita']}/>
                <Legend iconType="circle" iconSize={8} formatter={(v)=><span style={{fontSize:11,color:'#374151'}}>{v}</span>}/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart: Receita vs Custos por ativo */}
      {recPorAtivo.length > 0 && (
        <div className="card p-5 mb-4">
          <div className="text-sm font-semibold text-gray-900 mb-1">Receita vs Custos por ativo</div>
          <div className="text-xs text-gray-400 mb-4">Comparativo financeiro por empreendimento</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={recPorAtivo} layout="vertical" margin={{top:0,right:60,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" horizontal={false}/>
              <XAxis type="number" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`R$${(v/1000).toFixed(0)}k`:`R$${v}`}/>
              <YAxis type="category" dataKey="nome" width={110} tick={{fontSize:12,fill:'#374151'}} axisLine={false} tickLine={false}/>
              <Tooltip formatter={(v:any,n:any)=>[brl(v),n==='receita'?'Receita':n==='custos'?'Custos':'Líquido']}/>
              <Legend formatter={(v)=><span style={{fontSize:10}}>{v==='receita'?'Bruto':v==='comissoes'?'Comissões':v==='custos'?'Custos fixos':'Líq. final'}</span>}/>
              <Bar dataKey="receita"   fill="#6366f1" radius={[0,4,4,0]} name="receita"/>
              <Bar dataKey="comissoes" fill="#f97316" radius={[0,4,4,0]} name="comissoes"/>
              <Bar dataKey="custos"    fill="#f87171" radius={[0,4,4,0]} name="custos"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Status das semanas pie */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card p-5">
          <div className="text-sm font-semibold text-gray-900 mb-4">Status das semanas</div>
          {statusPie.length===0?(
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">Sem semanas cadastradas</div>
          ):(
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusPie} cx="50%" cy="44%" innerRadius={50} outerRadius={72} paddingAngle={2} dataKey="value">
                  {statusPie.map((e,i)=><Cell key={i} fill={e.fill}/>)}
                </Pie>
                <Tooltip formatter={(v:any)=>[`${v} semana(s)`]}/>
                <Legend iconType="circle" iconSize={8} formatter={(v)=><span style={{fontSize:11,color:'#374151'}}>{v}</span>}/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tabela resumo */}
        <div className="card p-5">
          <div className="text-sm font-semibold text-gray-900 mb-4">Resumo financeiro por ativo</div>
          {resumoAtivos.length===0?(
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">Sem dados ainda</div>
          ):(
            <div className="overflow-auto max-h-48">
              <table className="w-full border-collapse text-xs">
                <thead><tr>{['Ativo','Rec. Bruta','Comiss.','Rec. Líq.','Custos Fixos','Resultado'].map(h=><th key={h} className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-2">{h}</th>)}</tr></thead>
                <tbody>
                  {resumoAtivos.map(r=>(
                    <tr key={r.nome} className="border-t border-gray-50">
                      <td className="py-2 pr-2 font-medium text-gray-800">{r.nome}</td>
                        <td className="py-2 pr-2 text-gray-700">{brl(r.receita)}</td>
                        <td className="py-2 pr-2 text-orange-500">{(r.comissoes??0)>0?`− ${brl(r.comissoes)}`:'—'}</td>
                        <td className="py-2 pr-2 text-emerald-600 font-semibold">{brl(r.liquido)}</td>
                        <td className="py-2 pr-2 text-red-500">{(r.custos??0)>0?`− ${brl(r.custos)}`:'—'}</td>
                        <td className={`py-2 font-bold ${(r.resultado??0)>=0?'text-indigo-600':'text-red-600'}`}>{brl(r.resultado??0)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-200 font-bold text-xs">
                    <td className="pt-2 text-gray-900">Total</td>
                    <td className="pt-2 text-gray-700">{brl(totRec)}</td>
                    <td className="pt-2 text-orange-500">{totCom>0?`− ${brl(totCom)}`:'—'}</td>
                    <td className="pt-2 text-emerald-700">{brl(totLiq)}</td>
                    <td className="pt-2 text-red-600">{totCus>0?`− ${brl(totCus)}`:'—'}</td>
                    <td className={`pt-2 ${totRes>=0?'text-indigo-700':'text-red-700'}`}>{brl(totRes)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
