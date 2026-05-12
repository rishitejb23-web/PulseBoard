// hooks/useMetricsSocket.ts
'use client'

import { useEffect, useRef } from 'react'
import { ServiceMetrics } from '@/types'

/**
 * Subscribes to live metric updates for a specific service
 * via the shared WebSocket connection to PulseBoard backend.
 */
export function useMetricsSocket(
  serviceName: string,
  onUpdate: (metrics: ServiceMetrics) => void
) {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    const ws = new WebSocket(
      process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000/ws/metrics'
    )

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type !== 'metrics_update') return

        const update = (msg.data as ServiceMetrics[])
          .find(m => m.service === serviceName)

        if (update) onUpdateRef.current(update)
      } catch {
        // ignore malformed messages
      }
    }

    ws.onerror = (err) => console.warn('PulseBoard WS error:', err)

    return () => ws.close()
  }, [serviceName])
}
