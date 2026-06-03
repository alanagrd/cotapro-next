'use client'
import { usePathname } from 'next/navigation'

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard', '/ativos': 'Ativos', '/cotas': 'Cotas',
  '/semanas': 'Semanas', '/receitas': 'Receitas', '/custos': 'Custos',
  '/rci': 'RCI', '/programas': 'Programas de Pontos',
  '/movimentacoes': 'Movimentações de Pontos', '/reservas': 'Reservas com Pontos',
  '/relatorios': 'Relatórios', '/configuracoes': 'Configurações',
}

interface Props {
  profile: { nome: string; email: string } | null
}

export default function Topbar({ profile }: Props) {
  const pathname = usePathname()
  const title = Object.entries(TITLES).find(([k]) => pathname.startsWith(k))?.[1] ?? 'CotaPro'
  const initials = profile?.nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'

  return (
    <header className="h-14 bg-white border-b border-gray-100 px-6 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-400">CotaPro</span>
        <span className="text-gray-300">/</span>
        <span className="font-semibold text-gray-900">{title}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-xs font-semibold text-gray-900">{profile?.nome}</div>
          <div className="text-[10px] text-gray-400">{profile?.email}</div>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {initials}
        </div>
      </div>
    </header>
  )
}
