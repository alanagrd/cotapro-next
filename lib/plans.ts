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

export const PLAN_PRICE: Record<PlanId, string> = {
  free:  'Gratuito',
  basic: 'R$19,90/mês',
  plus:  'R$39,90/mês',
}

export const PLAN_ORDER: Record<PlanId, number> = { free: 0, basic: 1, plus: 2 }

// Plano mínimo necessário para cada rota (ausente = livre)
export const MODULE_MIN_PLAN: Partial<Record<string, PlanId>> = {
  '/receitas':      'basic',
  '/custos':        'basic',
  '/relatorios':    'basic',
  '/rci':           'plus',
  '/programas':     'plus',
  '/movimentacoes': 'plus',
  '/reservas':      'plus',
}

export function isPlanId(v: unknown): v is PlanId {
  return v === 'free' || v === 'basic' || v === 'plus'
}

export function getPlanLimits(plano: string | null | undefined) {
  const id = isPlanId(plano) ? plano : 'free'
  return { id, name: PLAN_NAMES[id], ...PLAN_LIMITS[id] }
}

export function canAccessRoute(plano: string | null | undefined, route: string): boolean {
  const userPlanId = isPlanId(plano) ? plano : 'free'
  const required = MODULE_MIN_PLAN[route]
  if (!required) return true
  return PLAN_ORDER[userPlanId] >= PLAN_ORDER[required]
}
