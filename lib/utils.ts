// ── Currency ──────────────────────────────────────────────────
export function brl(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ── Dates ─────────────────────────────────────────────────────
export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export function fmtPeriod(inicio: string | null, fim: string | null): string {
  if (!inicio || !fim) return '—'
  const [, mi, di] = inicio.split('-')
  const [yf, mf, df] = fim.split('-')
  return `${di}/${mi} – ${df}/${mf}/${yf}`
}

// ── Badge colours ─────────────────────────────────────────────
export const SEMANA_STATUS_BADGE: Record<string, string> = {
  'Locada':     'bg-emerald-50 text-emerald-700',
  'Pool':       'bg-purple-50  text-purple-700',
  'Disponível': 'bg-blue-50    text-blue-700',
  'Reservada':  'bg-yellow-50  text-yellow-700',
  'RCI':        'bg-indigo-50  text-indigo-700',
  'Uso Próprio':'bg-orange-50  text-orange-700',
  'Perdida':    'bg-red-50     text-red-700',
  'Cancelada':  'bg-gray-100   text-gray-500',
}

export const CATEGORIA_BADGE: Record<string, string> = {
  'Super Alta': 'bg-red-50    text-red-700',
  'Alta':       'bg-orange-50 text-orange-700',
  'Média':      'bg-yellow-50 text-yellow-700',
  'Baixa':      'bg-green-50  text-green-700',
}

export const RECEITA_STATUS_BADGE: Record<string, string> = {
  'Recebido':  'bg-emerald-50 text-emerald-700',
  'Previsto':  'bg-blue-50    text-blue-700',
  'Parcial':   'bg-yellow-50  text-yellow-700',
  'Cancelado': 'bg-red-50     text-red-700',
}

export function badgeClass(map: Record<string, string>, key: string | null | undefined): string {
  return map[key ?? ''] ?? 'bg-gray-100 text-gray-500'
}

// ── Misc ──────────────────────────────────────────────────────
export function initials(nome: string): string {
  return nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export const CANAIS = ['Airbnb', 'Booking', 'Direto', 'Pool', 'RCI', 'Outro']
export const CATEGORIAS = ['Super Alta', 'Alta', 'Média', 'Baixa']
export const SEMANA_STATUSES = ['Disponível', 'Pool', 'Reservada', 'Locada', 'Uso Próprio', 'RCI', 'Perdida', 'Cancelada']
export const RECEITA_STATUSES = ['Previsto', 'Recebido', 'Parcial', 'Cancelado']
