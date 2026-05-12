from pydantic import BaseModel
from datetime import datetime


class TelemetryEvent(BaseModel):
    service: str
    latency_ms: float
    status_code: int
    endpoint: str
    timestamp: datetime
    region: str = "us-west-2"


class ServiceMetrics(BaseModel):
    service: str
    p50_ms: float
    p95_ms: float
    p99_ms: float
    error_rate: float        # 0.0 - 1.0
    throughput_rps: float
    slo_budget_remaining: float  # % of error budget remaining
    updated_at: datetime


class SLOStatus(BaseModel):
    service: str
    slo_target: float        # e.g. 0.999 = 99.9%
    current_availability: float
    burn_rate: float         # >1.0 means burning budget faster than allowed
    budget_remaining_pct: float
    alert: bool              # True if burn_rate > threshold
