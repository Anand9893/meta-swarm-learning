import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { PipelineStage } from '../../types/dashboard'

const ALL_STAGES = ['prospect', 'proposal', 'negotiation', 'won', 'lost']

interface PipelineChartProps {
  data: PipelineStage[]
}

export default function PipelineChart({ data }: PipelineChartProps) {
  const chartData = ALL_STAGES.map(stage => {
    const found = data.find(d => d.stage === stage)
    return {
      stage: stage.charAt(0).toUpperCase() + stage.slice(1),
      count: found?.count ?? 0,
      total_value: found?.total_value ?? 0,
    }
  })

  return (
    <div data-testid="pipeline-chart">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="count" name="Deals" fill="#3b82f6" />
          <Bar yAxisId="right" dataKey="total_value" name="Value ($)" fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
