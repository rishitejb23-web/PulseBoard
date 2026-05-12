// app/page.tsx
import { Suspense } from 'react'
import { getMetrics, getSLOStatus } from '@/lib/api'
import MetricCard from '@/components/MetricCard'
import SLOBurnChart from '@/components/SLOBurnChart'
import LatencyChart from '@/components/LatencyChart'
import LiveIndicator from '@/components/LiveIndicator'
import AlertPanel from '@/components/AlertPanel'

// SSR — initial data load for sub-150ms TTFB
export default async function DashboardPage() {
  const [metrics, sloStatus] = await Promise.all([
    getMetrics(),
    getSLOStatus()
  ])

  const alerts = sloStatus.filter(s => s.alert)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">PulseBoard</h1>
          <span className="text-xs text-gray-500 font-mono">distributed systems monitor</span>
        </div>
        <LiveIndicator />
      </header>

      <main className="px-6 py-6 space-y-6 max-w-7xl mx-auto">

        {/* Alerts */}
        {alerts.length > 0 && (
          <AlertPanel alerts={alerts} />
        )}

        {/* SLO Overview Cards */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
            Service Health
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map(m => (
              <MetricCard key={m.service} metric={m} />
            ))}
          </div>
        </section>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={<ChartSkeleton />}>
            <LatencyChart initialMetrics={metrics} />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <SLOBurnChart sloStatus={sloStatus} />
          </Suspense>
        </div>
      </main>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 h-72 animate-pulse" />
  )
}
