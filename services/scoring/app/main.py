"""
Ajna Scoring Service — internal microservice
Receives wearable biometric windows from the API and returns
a Predictive Risk Index (PRI) score using the 30-day Gaussian
baseline model from prototypes/p0.1.

All computation is ephemeral: no raw values are logged or stored.
"""
from __future__ import annotations

import os
import math
import statistics
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel, Field

app = FastAPI(
    title="Ajna Scoring Service",
    description="Internal PRI scoring — not publicly routable",
    version="0.1.0",
    docs_url=None,  # disable public Swagger
    redoc_url=None,
)

SCORING_TOKEN = os.environ.get("AJNA_SCORING_TOKEN", "")


def _verify_token(authorization: Optional[str]) -> None:
    if not SCORING_TOKEN:
        return  # no token configured — dev mode
    if authorization != f"Bearer {SCORING_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

class MetricWindow(BaseModel):
    """30-day rolling window for a single biometric metric."""
    metric: str = Field(..., description="e.g. hrv_rmssd, resting_hr, skin_temp_dev")
    values: List[float] = Field(..., min_length=1)
    today: float = Field(..., description="Today's observed value")


class ScoringRequest(BaseModel):
    subject_id: str = Field(..., description="Pseudonymous subject ID (UUID)")
    date: str = Field(..., description="ISO date YYYY-MM-DD")
    windows: List[MetricWindow]


class MetricScore(BaseModel):
    metric: str
    z_score: float
    deviation_sd: float
    pri_contribution: float


class ScoringResponse(BaseModel):
    subject_id: str
    date: str
    pri: float = Field(..., ge=0.0, le=1.0, description="Predictive Risk Index [0–1]")
    flagged: bool
    metric_scores: List[MetricScore]
    model_version: str = "gaussian-v0.1"


# ---------------------------------------------------------------------------
# PRI computation (mirrors prototypes/p0.1/pri.py)
# ---------------------------------------------------------------------------

DEVIATION_THRESHOLD_SD = 3.0
FLAG_THRESHOLD_PRI = 0.65

# Per-metric sensitivity weights (higher = more predictive of acute crisis)
METRIC_WEIGHTS: dict[str, float] = {
    "hrv_rmssd": 0.35,
    "resting_hr": 0.30,
    "skin_temp_dev": 0.20,
    "sleep_deep_min": 0.10,
    "activity_recovery": 0.05,
}
DEFAULT_WEIGHT = 0.10


def _compute_pri(windows: List[MetricWindow]) -> ScoringResponse:
    metric_scores: List[MetricScore] = []
    weighted_sum = 0.0
    total_weight = 0.0

    for w in windows:
        if len(w.values) < 2:
            mean = w.values[0]
            sd = 0.0
        else:
            mean = statistics.mean(w.values)
            sd = statistics.stdev(w.values)

        z = (w.today - mean) / sd if sd > 0 else 0.0
        # Sigmoid transform: map z-score to [0,1] contribution
        contrib = 1.0 / (1.0 + math.exp(-0.5 * (abs(z) - DEVIATION_THRESHOLD_SD)))
        weight = METRIC_WEIGHTS.get(w.metric, DEFAULT_WEIGHT)

        metric_scores.append(MetricScore(
            metric=w.metric,
            z_score=round(z, 4),
            deviation_sd=round(abs(z), 4),
            pri_contribution=round(contrib, 4),
        ))
        weighted_sum += contrib * weight
        total_weight += weight

    pri = weighted_sum / total_weight if total_weight > 0 else 0.0
    pri = max(0.0, min(1.0, pri))
    return pri, metric_scores


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "service": "ajna-scoring"}


@app.post("/score", response_model=ScoringResponse)
def score(
    body: ScoringRequest,
    authorization: Optional[str] = Header(default=None),
):
    _verify_token(authorization)

    pri_value, metric_scores = _compute_pri(body.windows)

    return ScoringResponse(
        subject_id=body.subject_id,
        date=body.date,
        pri=round(pri_value, 4),
        flagged=pri_value >= FLAG_THRESHOLD_PRI,
        metric_scores=metric_scores,
    )
