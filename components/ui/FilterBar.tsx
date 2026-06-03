'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export interface FilterOption { value: string; label: string }

export interface FilterField {
  key: string
  label: string
  options: FilterOption[]
  placeholder?: string
}

interface Props {
  fields: FilterField[]
  total: number
  filtered: number
}

export function FilterBar({ fields, total, filtered }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [router, pathname, searchParams])

  const hasFilters = fields.some(f => searchParams.get(f.key))

  return (
    <div className="card p-4 mb-4">
      <div className="flex flex-wrap items-end gap-3">
        {/* Filter icon */}
        <div className="flex items-center gap-1.5 self-center">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filtros</span>
        </div>

        {fields.map(f => (
          <div key={f.key}>
            <label className="block text-[10px] font-medium text-gray-400 mb-1">{f.label}</label>
            <select
              className="inp py-1.5 text-xs w-auto"
              value={searchParams.get(f.key) ?? ''}
              onChange={e => update(f.key, e.target.value)}
            >
              <option value="">{f.placeholder ?? `Todos`}</option>
              {f.options.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        ))}

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams()
              router.replace(pathname, { scroll: false })
            }}
            className="text-xs text-gray-400 hover:text-gray-700 underline self-end pb-1.5"
          >
            Limpar
          </button>
        )}

        <div className="ml-auto self-end pb-1.5 text-xs text-gray-400">
          {filtered === total
            ? <span>{total} registro(s)</span>
            : <span><strong className="text-indigo-600">{filtered}</strong> de {total}</span>
          }
        </div>
      </div>
    </div>
  )
}
