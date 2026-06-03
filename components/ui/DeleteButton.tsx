'use client'
import { useTransition } from 'react'

interface Props {
  id: string
  label?: string
  confirmMessage?: string
  action: (id: string) => Promise<{ error?: string }>
  onSuccess?: () => void   // ← optional refresh callback
}

export function DeleteButton({ id, label = 'Excluir', confirmMessage, action, onSuccess }: Props) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    const msg = confirmMessage ?? 'Deseja excluir este registro? Esta ação não pode ser desfeita.'
    if (!window.confirm(msg)) return
    startTransition(async () => {
      const result = await action(id)
      if (result?.error) {
        alert('Erro ao excluir: ' + result.error)
        return
      }
      onSuccess?.()
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
    >
      {pending ? '...' : label}
    </button>
  )
}
