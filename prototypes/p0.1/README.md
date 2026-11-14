# P0.1: Wearable Ingestion Simulator

**Purpose:** Prototype and prove feasibility of wearable payload ingestion, 30-day baseline computation, and >3 SD deviation detection on BullMQ/Upstash free tiers.

**Output:** `findings/P0.1-findings.md` with verdict (go/limited-go/no-go) and production limits.

## Experiments

### 1. Payload Shapes

Define canonical payload shape and mappings from vendor formats:

- **Oura-style:** HRV (RMSSD ms), skin temp deviation (°C), resting HR (bpm), sleep architecture (deep/REM/light/awake min), activity recovery ratio
- **Generic:** Same fields, possibly different naming
- **Minimal:** Subset of above

**Deliverable:** `payloads/canonical.schema.json` and mappers.

### 2. Simulator

Generate 60 days of synthetic data for 1,000 subjects:

- Personal means and SDs per metric
- Weekly rhythm (HRV/HR higher mid-week, lower weekends)
- ~5% missing days
- Sensor outliers (0.1%)
- Injected ground truth events (5% of subjects: sustained HRV drop + resting HR rise)

**Deliverable:** `simulator.py` producing deterministic test data.

### 3. Baseline Computation

30-day trailing baseline (excluding current day):

- Mean/SD variant
- Median/MAD (robust) variant
- Rule: ≥14 valid days before any flag
- SD floor: below epsilon, z-score undefined

**Deliverable:** `baseline.py` with numpy/scipy, tested against reference.

### 4. Deviation Detection

Flag |z| > 3 per metric:

- Single-metric rule
- Multi-metric rule (2+ metrics >2 SD same direction)
- Measure on injected events: detection rate, false-flags per subject-month, days-to-detection

**Deliverable:** `detection.py`, results table.

### 5. Personal Resilience Index (Draft)

0-100 score from weighted z-scores, tested on injected events for sensible behavior.

**Deliverable:** `pri.py` with formula and validation.

### 6. BullMQ Throughput

NestJS harness + Upstash Redis:

- Enqueue baseline jobs for 1,000 subjects
- Record: jobs/sec, p95 latency, Upstash command count vs free-tier limit
- Note any cold-start delays

**Deliverable:** `benchmarks/` results and recommendations for `common/limits.ts`.

## Running P0.1

```bash
cd prototypes/p0.1

# Install dependencies
pip install -r requirements.txt
npm install

# Run simulator
python simulator.py --subjects=1000 --days=60 --output=data/synthetic.csv

# Run baseline computation
python baseline.py --data=data/synthetic.csv --output=data/baselines.csv

# Run deviation detection
python detection.py --data=data/synthetic.csv --baselines=data/baselines.csv --output=data/flags.csv

# Run BullMQ benchmark
npm run benchmark:queue

# Generate findings note
npm run findings:generate
```

## Acceptance Criteria

- [ ] Simulator reproducible (same seed → same data)
- [ ] Baseline computed for 1,000 × 60 days in <X seconds
- [ ] Detection on injected events: detection rate Y%, false flags Z per subject-month
- [ ] Draft PRI formula behaves sensibly
- [ ] BullMQ: X jobs/sec, p95 Y ms on free tier
- [ ] Findings note complete with limits → common/limits.ts

## Files

- `payloads/` - Vendor payload examples and canonical schema
- `simulator.py` - Synthetic data generator
- `baseline.py` - 30-day baseline computation
- `detection.py` - Deviation flagging
- `pri.py` - PRI formula
- `benchmarks/` - Queue throughput testing
- `findings_template.md` - Template for findings note

## Next

→ `findings/P0.1-findings.md` gates production B2.1 and B2.2.
