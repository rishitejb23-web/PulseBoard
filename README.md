# PulseBoard — Real-Time Distributed Systems Dashboard

A production-grade monitoring dashboard ingesting 500K+ telemetry events/minute
via Kafka, with live WebSocket streaming to a Next.js SSR frontend.

## Stack
- **Backend**: Python 3.12, FastAPI, aiokafka, OpenTelemetry
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, Recharts
- **Infra**: Azure AKS, Kafka, gRPC, OpenTelemetry, GitHub Actions

## Features
- Real-time metric streaming via WebSocket (latency, error rate, throughput per service)
- SLO burn rate tracking with alert thresholds
- p50/p95/p99 latency percentile tracking
- Live-updating MetricCard components with flash on update
- Sub-150ms TTFB via SSR + edge caching
- Full DRI runbook in `/runbook/`

## Architecture
```
Kafka Topic: service-telemetry (500K+ events/min)
    │
    ▼
Python FastAPI + aiokafka consumer
    ├── Batch aggregation every 200ms
    ├── p50/p95/p99 computation
    └── SLO burn rate calculation
    │
    ▼
WebSocket broadcast → React clients
    │
    ▼
Next.js SSR initial load + live updates via useMetricsSocket hook
```

## Running locally
```bash
# Start Kafka
docker-compose up kafka

# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install && npm run dev
```

## DRI Runbook
See `/runbook/README.md` for incident response procedures,
escalation paths, and rollback instructions.
