import { createClient } from '@/lib/supabase/server'
import { getPlanLimits, PLAN_ORDER, type PlanId } from '@/lib/plans'
import { UpgradeRequired } from './UpgradeRequired'

interface Props {
  children: React.ReactNode
  requiredPlan: PlanId
}

export default async function PlanGuard({ children, requiredPlan }: Props) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null

  const { data: profile } = await (supabase as any)
    .from('profiles').select('plano').eq('id', session.user.id).single()

  const plan = getPlanLimits((profile as { plano: string } | null)?.plano)
  const userLevel    = PLAN_ORDER[plan.id as PlanId] ?? 0
  const requiredLevel = PLAN_ORDER[requiredPlan]

  if (userLevel < requiredLevel) {
    return <UpgradeRequired requiredPlan={requiredPlan} currentPlan={plan.id as PlanId} />
  }

  return <>{children}</>
}
