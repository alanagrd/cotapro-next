export type PlanId = 'free' | 'basic' | 'plus'

export const PLAN_LIMITS: Record<PlanId, { ativos: number; cotas: number; semanas: number }> = {
  free:  { ativos: 1,        cotas: 1,        semanas: 4        },
  basic: { ativos: 3,        cotas: 5,        semanas: Infinity },
  plus:  { ativos: Infinity, cotas: Infinity, semanas: Infinity },
}

export const PLAN_NAMES: Record<PlanId, string> = {
  free:  'Free',
  basic: 'Basic',
  plus:  'Plus',
}

function isPlanId(v: unknown): v is PlanId {
  return v === 'free' || v === 'basic' || v === 'plus'
}

export function getPlanLimits(plano: string | null | undefined) {
  const id = isPlanId(plano) ? plano : 'free'
  return { id, name: PLAN_NAMES[id], ...PLAN_LIMITS[id] }
}
