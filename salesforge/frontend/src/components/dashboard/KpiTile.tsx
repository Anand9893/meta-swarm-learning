interface KpiTileProps {
  label: string
  value: number | string
  subtitle?: string
}

export default function KpiTile({ label, value, subtitle }: KpiTileProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6" data-testid="kpi-tile">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  )
}
