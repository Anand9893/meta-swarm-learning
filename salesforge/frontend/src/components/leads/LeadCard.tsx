import { Link } from 'react-router-dom'
import type { Lead, LeadStatus } from '../../types/lead'

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-green-100 text-green-800',
  converted: 'bg-purple-100 text-purple-800',
  lost: 'bg-gray-100 text-gray-800',
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  converted: 'Converted',
  lost: 'Lost',
}

interface LeadCardProps {
  lead: Lead
}

export default function LeadCard({ lead }: LeadCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:border-gray-300 transition-colors">
      <div className="min-w-0">
        <Link
          to={`/leads/${lead.id}`}
          className="text-sm font-semibold text-gray-900 hover:text-blue-600"
        >
          {lead.first_name} {lead.last_name}
        </Link>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
          {lead.company_name && <span>{lead.company_name}</span>}
          {lead.source && (
            <span className="text-gray-400">via {lead.source}</span>
          )}
          {lead.email && <span className="truncate">{lead.email}</span>}
        </div>
      </div>
      <span
        className={`ml-4 shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[lead.status]}`}
      >
        {STATUS_LABELS[lead.status]}
      </span>
    </div>
  )
}
