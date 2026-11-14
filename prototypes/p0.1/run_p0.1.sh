#!/bin/bash
#
# P0.1 Complete Experimental Run
# Generates synthetic data, computes baselines, detects deviations, computes PRI
#

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Create output directory
mkdir -p data results

# Configuration
SUBJECTS=1000
DAYS=60
SEED=42

echo "=========================================="
echo "P0.1: Wearable Ingestion Simulator"
echo "=========================================="
echo "Subjects: $SUBJECTS"
echo "Days: $DAYS"
echo "Seed: $SEED"
echo

# Step 1: Generate synthetic data
echo "[1/5] Generating synthetic data..."
time python simulator.py \
  --subjects=$SUBJECTS \
  --days=$DAYS \
  --seed=$SEED \
  --output=data/synthetic.csv \
  --output-jsonl=data/synthetic.jsonl

echo

# Step 2: Compute baselines
echo "[2/5] Computing baselines and deviation flags..."
time python baseline.py \
  --data=data/synthetic.csv \
  --baselines=data/baselines.csv \
  --flags=data/deviation_flags.csv

echo

# Step 3: Compute PRI
echo "[3/5] Computing Personal Resilience Index..."
time python pri.py \
  --data=data/synthetic.csv \
  --baselines=data/baselines.csv \
  --output=data/pri.csv

echo

# Step 4: Generate statistics
echo "[4/5] Generating summary statistics..."
python -c "
import pandas as pd

print('Data Summary:')
df = pd.read_csv('data/synthetic.csv')
print(f'  Total rows: {len(df)}')
print(f'  Subjects: {df[\"subject_id\"].nunique()}')
print(f'  Days: {df[\"date\"].nunique()}')

baselines = pd.read_csv('data/baselines.csv')
print(f'\nBaselines computed: {len(baselines)}')

flags = pd.read_csv('data/deviation_flags.csv')
print(f'Deviation flags: {len(flags)}')
print(f'  Avg per subject-month: {len(flags) / (SUBJECTS * 2):.2f}')

pri = pd.read_csv('data/pri.csv')
print(f'\nPRI values computed: {len(pri)}')
print(f'  Mean: {pri[\"pri\"].mean():.1f}')
print(f'  SD: {pri[\"pri\"].std():.1f}')
"

echo

# Step 5: List output files
echo "[5/5] Output files:"
ls -lh data/

echo
echo "✓ P0.1 experimental run complete"
echo "  Review data/* for results"
echo "  Next: Generate findings/P0.1-findings.md"
