from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import json

from app.kafka_consumer import TelemetryConsumer
from app.metrics_store import MetricsStore
from app.models import ServiceMetrics, SLOStatus
from app.connection_manager import ConnectionManager

store = MetricsStore()
manager = ConnectionManager()
consumer = TelemetryConsumer(store, manager)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start Kafka consumer on startup
    task = asyncio.create_task(consumer.start())
    yield
    task.cancel()


app = FastAPI(title="PulseBoard API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/metrics", response_model=list[ServiceMetrics])
async def get_metrics():
    """Return latest snapshot of all service metrics."""
    return store.get_all()


@app.get("/api/metrics/{service_name}", response_model=ServiceMetrics)
async def get_service_metrics(service_name: str):
    """Return metrics for a specific service."""
    return store.get(service_name)


@app.get("/api/slo", response_model=list[SLOStatus])
async def get_slo_status():
    """Return SLO burn rates for all services."""
    return store.get_slo_status()


@app.websocket("/ws/metrics")
async def metrics_websocket(websocket: WebSocket):
    """
    Live WebSocket stream — pushes metric updates to connected dashboards.
    Frontend subscribes and receives real-time latency, error rate, throughput.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, data is pushed from Kafka consumer
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
