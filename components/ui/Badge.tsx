interface Props {
  label: string | null | undefined
  colorClass?: string
}

export function Badge({ label, colorClass = 'bg-gray-100 text-gray-500' }: Props) {
  if (!label) return null
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  )
}
