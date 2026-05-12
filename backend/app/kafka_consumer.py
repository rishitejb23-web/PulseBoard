from aiokafka import AIOKafkaConsumer
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
import json
import logging
import asyncio

from app.models import TelemetryEvent
from app.metrics_store import MetricsStore
from app.connection_manager import ConnectionManager

logger = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)


class TelemetryConsumer:
    """
    Kafka consumer ingesting 500K+ telemetry events/minute.
    Processes latency, error rate, and throughput metrics per service
    and broadcasts updates to connected WebSocket clients.
    """

    TOPIC = "service-telemetry"
    BATCH_SIZE = 500  # Process in batches for throughput
    FLUSH_INTERVAL_MS = 200  # Aggregate and flush every 200ms

    def __init__(self, store: MetricsStore, manager: ConnectionManager):
        self.store = store
        self.manager = manager
        self._batch: list[TelemetryEvent] = []
        self._last_flush = asyncio.get_event_loop().time()

    async def start(self):
        consumer = AIOKafkaConsumer(
            self.TOPIC,
            bootstrap_servers="kafka:9092",
            group_id="pulseboard-consumer",
            value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            max_poll_records=self.BATCH_SIZE,
            fetch_max_wait_ms=self.FLUSH_INTERVAL_MS,
        )

        await consumer.start()
        logger.info("Kafka consumer started on topic: %s", self.TOPIC)

        try:
            async for msg in consumer:
                with tracer.start_as_current_span("process_telemetry_event"):
                    event = TelemetryEvent(**msg.value)
                    self._batch.append(event)

                    now = asyncio.get_event_loop().time()
                    if (len(self._batch) >= self.BATCH_SIZE or
                            (now - self._last_flush) * 1000 >= self.FLUSH_INTERVAL_MS):
                        await self._flush()
        finally:
            await consumer.stop()

    async def _flush(self):
        if not self._batch:
            return

        # Aggregate metrics per service
        by_service: dict[str, list[TelemetryEvent]] = {}
        for event in self._batch:
            by_service.setdefault(event.service, []).append(event)

        updates = []
        for service, events in by_service.items():
            latencies = sorted(e.latency_ms for e in events)
            errors = sum(1 for e in events if e.status_code >= 500)

            metrics = self.store.update(
                service=service,
                p50=latencies[len(latencies) // 2],
                p95=latencies[int(len(latencies) * 0.95)],
                p99=latencies[int(len(latencies) * 0.99)],
                error_rate=errors / len(events),
                throughput_rps=len(events) / (self.FLUSH_INTERVAL_MS / 1000),
            )
            updates.append(metrics.model_dump())

        # Broadcast to all connected WebSocket clients
        await self.manager.broadcast(json.dumps({"type": "metrics_update", "data": updates}))

        self._batch.clear()
        self._last_flush = asyncio.get_event_loop().time()
