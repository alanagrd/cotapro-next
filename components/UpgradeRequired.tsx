import Link from 'next/link'
import { PLAN_NAMES, PLAN_PRICE, type PlanId } from '@/lib/plans'

interface Props {
  requiredPlan: PlanId
  currentPlan: PlanId
}

export function UpgradeRequired({ requiredPlan, currentPlan }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-5">
        <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Recurso disponível no plano {PLAN_NAMES[requiredPlan]}
      </h2>
      <p className="text-sm text-gray-500 max-w-sm mb-1">
        Você está no plano <strong className="text-gray-700">{PLAN_NAMES[currentPlan]}</strong>.
        Faça upgrade para o plano{' '}
        <strong className="text-indigo-600">{PLAN_NAMES[requiredPlan]}</strong> e desbloqueie
        este módulo.
      </p>
      <p className="text-xs text-gray-400 mb-8">{PLAN_PRICE[requiredPlan]}</p>

      <Link
        href="/configuracoes"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        Ver planos e fazer upgrade
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  )
}
