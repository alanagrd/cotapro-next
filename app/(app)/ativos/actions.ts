'use server'
import { revalidatePath } from 'next/cache'
import { getActionUser } from '@/lib/supabase/action-client'
import { getPlanLimits } from '@/lib/plans'

type ActionResult = { error?: string }

export async function createAtivo(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, userId, error: authError } = await getActionUser()
    if (authError) return { error: authError }

    const { data: profile } = await supabase
      .from('profiles').select('plano').eq('id', userId).single()
    const limits = getPlanLimits(profile?.plano)

    if (limits.ativos !== Infinity) {
      const { count } = await supabase
        .from('ativos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      if ((count ?? 0) >= limits.ativos) {
        return { error: `Seu plano ${limits.name} permite até ${limits.ativos} ativo(s). Faça upgrade para adicionar mais.` }
      }
    }

    const { error } = await supabase.from('ativos').insert({
      user_id:     userId,
      nome:        String(formData.get('nome') ?? '').trim(),
      tipo:        String(formData.get('tipo') ?? ''),
      cidade:      String(formData.get('cidade') ?? '').trim() || null,
      estado:      String(formData.get('estado') ?? '').trim() || null,
      pais:        String(formData.get('pais') ?? 'Brasil').trim() || 'Brasil',
      portal:      String(formData.get('portal') ?? '').trim() || null,
      observacoes: String(formData.get('observacoes') ?? '').trim() || null,
      status:      String(formData.get('status') ?? 'Ativo'),
    })
    if (error) return { error: error.message }
    revalidatePath('/ativos')
    revalidatePath('/dashboard')
    return {}
  } catch (e: any) { return { error: e.message } }
}

export async function updateAtivo(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, userId, error: authError } = await getActionUser()
    if (authError) return { error: authError }

    const { error } = await supabase.from('ativos')
      .update({
        nome:        String(formData.get('nome') ?? '').trim(),
        tipo:        String(formData.get('tipo') ?? ''),
        cidade:      String(formData.get('cidade') ?? '').trim() || null,
        estado:      String(formData.get('estado') ?? '').trim() || null,
        pais:        String(formData.get('pais') ?? 'Brasil').trim() || 'Brasil',
        portal:      String(formData.get('portal') ?? '').trim() || null,
        observacoes: String(formData.get('observacoes') ?? '').trim() || null,
        status:      String(formData.get('status') ?? 'Ativo'),
      })
      .eq('id', id)
      .eq('user_id', userId)
    if (error) return { error: error.message }
    revalidatePath('/ativos')
    revalidatePath('/dashboard')
    return {}
  } catch (e: any) { return { error: e.message } }
}

export async function deleteAtivo(id: string): Promise<ActionResult> {
  try {
    const { supabase, userId, error: authError } = await getActionUser()
    if (authError) return { error: authError }

    const { error } = await supabase.from('ativos')
      .delete().eq('id', id).eq('user_id', userId)
    if (error) return { error: error.message }
    revalidatePath('/ativos')
    revalidatePath('/cotas')
    revalidatePath('/semanas')
    revalidatePath('/dashboard')
    return {}
  } catch (e: any) { return { error: e.message } }
}
