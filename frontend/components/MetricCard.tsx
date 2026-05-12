'use client'

import { useEffect, useState } from 'react'
import { ServiceMetrics } from '@/types'
import { useMetricsSocket } from '@/hooks/useMetricsSocket'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  metric: ServiceMetrics
}

export default function MetricCard({ metric: initial }: MetricCardProps) {
  const [metric, setMetric] = useState(initial)
  const [flash, setFlash] = useState(false)

  // Subscribe to live WebSocket updates for this service
  useMetricsSocket(initial.service, (updated) => {
    setMetric(updated)
    setFlash(true)
    setTimeout(() => setFlash(false), 400)
  })

  const errorPct = (metric.error_rate * 100).toFixed(2)
  const isHealthy = metric.error_rate < 0.01 && metric.p99_ms < 500
  const isDegraded = !isHealthy && metric.error_rate < 0.05

  return (
    <div className={cn(
      "rounded-2xl border p-5 transition-all duration-300",
      "bg-gray-900 border-gray-800",
      flash && "border-blue-500/50 bg-gray-800",
      !isHealthy && !isDegraded && "border-red-500/40"
    )}>
      {/* Service name + status dot */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-200 truncate">{metric.service}</span>
        <span className={cn(
          "w-2 h-2 rounded-full flex-shrink-0",
          isHealthy ? "bg-green-400" : isDegraded ? "bg-yellow-400" : "bg-red-400"
        )} />
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <Stat label="p99" value={`${metric.p99_ms.toFixed(0)}ms`}
          warn={metric.p99_ms > 300} />
        <Stat label="p95" value={`${metric.p95_ms.toFixed(0)}ms`} />
        <Stat label="Error rate" value={`${errorPct}%`}
          warn={metric.error_rate > 0.01} />
        <Stat label="RPS" value={metric.throughput_rps.toFixed(0)} />
      </div>

      {/* SLO budget bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>SLO budget</span>
          <span>{metric.slo_budget_remaining.toFixed(1)}% remaining</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              metric.slo_budget_remaining > 50 ? "bg-green-500" :
              metric.slo_budget_remaining > 20 ? "bg-yellow-400" : "bg-red-500"
            )}
            style={{ width: `${metric.slo_budget_remaining}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={cn("text-sm font-semibold mt-0.5", warn ? "text-red-400" : "text-white")}>
        {value}
      </p>
    </div>
  )
}
