"""
P0.1 Personal Resilience Index (PRI) Draft

Computes a 0-100 score from weighted z-scores of baseline deviations.

PRI Formula (draft):
    PRI = 100 - 10 * sqrt(sum(weighted_z_scores^2))
    where weighted_z_scores = weight[metric] * z_score[metric]

Metrics and weights:
    - HRV (inverse): higher HRV = better resilience (weight 2.0)
    - Resting HR (inverse): lower RHR = better resilience (weight 1.5)
    - Sleep efficiency (direct): more sleep = better (weight 2.0)
    - Activity recovery ratio (direct): balanced activity/recovery = better (weight 1.0)

Clamped to [0, 100].

Usage:
    python pri.py --baselines=data/baselines.csv --data=data/synthetic.csv --output=data/pri.csv
"""

import argparse
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd


class PRIComputer:
    """Computes Personal Resilience Index."""

    # Metric weights (higher = more important for resilience)
    WEIGHTS = {
        "hrv_rmssd_ms": 2.0,  # Inverse: higher HRV is better
        "resting_hr_bpm": 1.5,  # Inverse: lower RHR is better
        "sleep_efficiency": 2.0,  # Direct: higher efficiency is better
        "activity_recovery_ratio": 1.0,  # Direct: closer to 1.0 is better
    }

    def __init__(self, baselines_path: str, data_path: str):
        """Load baseline and data."""
        self.baselines_df = pd.read_csv(baselines_path)
        self.baselines_df["date"] = pd.to_datetime(self.baselines_df["date"])
        self.data_df = pd.read_csv(data_path)
        self.data_df["date"] = pd.to_datetime(self.data_df["date"])
        self.pri_rows = []

    def compute(self) -> pd.DataFrame:
        """Compute PRI for each subject-date."""
        for _, baseline_row in self.baselines_df.iterrows():
            subject_id = baseline_row["subject_id"]
            date = baseline_row["date"]

            # Get current day data
            current_data = self.data_df[
                (self.data_df["subject_id"] == subject_id)
                & (self.data_df["date"] == date)
            ]

            if current_data.empty:
                continue

            weighted_z_scores = []

            # HRV (inverse)
            if (
                pd.notna(baseline_row["hrv_rmssd_ms_mean"])
                and baseline_row["hrv_rmssd_ms_sd"] > 0.001
            ):
                hrv_current = current_data["hrv_rmssd_ms"].iloc[0]
                if pd.notna(hrv_current):
                    z = (hrv_current - baseline_row["hrv_rmssd_ms_mean"]) / baseline_row[
                        "hrv_rmssd_ms_sd"
                    ]
                    # Inverse: higher HRV is better, so negate
                    weighted_z = -z * self.WEIGHTS["hrv_rmssd_ms"]
                    weighted_z_scores.append(weighted_z)

            # Resting HR (inverse)
            if (
                pd.notna(baseline_row["resting_hr_bpm_mean"])
                and baseline_row["resting_hr_bpm_sd"] > 0.001
            ):
                rhr_current = current_data["resting_hr_bpm"].iloc[0]
                if pd.notna(rhr_current):
                    z = (rhr_current - baseline_row["resting_hr_bpm_mean"]) / baseline_row[
                        "resting_hr_bpm_sd"
                    ]
                    # Inverse: lower RHR is better, so negate
                    weighted_z = -z * self.WEIGHTS["resting_hr_bpm"]
                    weighted_z_scores.append(weighted_z)

            # Sleep efficiency (direct)
            if (
                pd.notna(baseline_row["sleep_efficiency_mean"])
                and baseline_row["sleep_efficiency_sd"] > 0.001
            ):
                sleep_eff_current = current_data["sleep_efficiency"].iloc[0]
                if pd.notna(sleep_eff_current):
                    z = (sleep_eff_current - baseline_row["sleep_efficiency_mean"]) / baseline_row[
                        "sleep_efficiency_sd"
                    ]
                    # Direct: higher efficiency is better
                    weighted_z = z * self.WEIGHTS["sleep_efficiency"]
                    weighted_z_scores.append(weighted_z)

            # Activity recovery ratio (direct)
            if (
                pd.notna(baseline_row["activity_recovery_ratio_mean"])
                and baseline_row["activity_recovery_ratio_sd"] > 0.001
            ):
                arr_current = current_data["activity_recovery_ratio"].iloc[0]
                if pd.notna(arr_current):
                    # For ARR, center around 1.0 (balanced is best)
                    z = (arr_current - baseline_row["activity_recovery_ratio_mean"]) / baseline_row[
                        "activity_recovery_ratio_sd"
                    ]
                    # Direct but centered: |z| below some threshold is good
                    weighted_z = -abs(z) * self.WEIGHTS["activity_recovery_ratio"]
                    weighted_z_scores.append(weighted_z)

            if not weighted_z_scores:
                pri = 50  # Neutral if insufficient data
            else:
                # PRI = 100 - 10 * sqrt(sum(weighted_z^2))
                sum_sq = sum(z**2 for z in weighted_z_scores)
                pri = 100 - 10 * np.sqrt(sum_sq)
                pri = np.clip(pri, 0, 100)

            self.pri_rows.append(
                {
                    "subject_id": subject_id,
                    "date": date,
                    "pri": round(pri, 1),
                    "resilience_level": self._classify_pri(pri),
                }
            )

        return pd.DataFrame(self.pri_rows)

    @staticmethod
    def _classify_pri(pri: float) -> str:
        """Classify PRI level."""
        if pri >= 80:
            return "excellent"
        elif pri >= 60:
            return "good"
        elif pri >= 40:
            return "fair"
        else:
            return "low"

    def to_csv(self, path: str) -> None:
        """Export to CSV."""
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        df = pd.DataFrame(self.pri_rows)
        df.to_csv(path, index=False)
        print(f"✓ Wrote {len(df)} PRI rows to {path}")

    def stats(self) -> dict:
        """Return statistics."""
        df = pd.DataFrame(self.pri_rows)
        if df.empty:
            return {"total_pri_computed": 0}
        return {
            "total_pri_computed": len(df),
            "pri_mean": round(df["pri"].mean(), 1),
            "pri_sd": round(df["pri"].std(), 1),
            "pri_min": round(df["pri"].min(), 1),
            "pri_max": round(df["pri"].max(), 1),
        }


def main():
    parser = argparse.ArgumentParser(description="Compute Personal Resilience Index")
    parser.add_argument("--baselines", required=True, help="Baselines CSV")
    parser.add_argument("--data", required=True, help="Synthetic data CSV")
    parser.add_argument(
        "--output", default="data/pri.csv", help="Output PRI CSV"
    )

    args = parser.parse_args()

    print(f"Reading {args.baselines} and {args.data}...")
    computer = PRIComputer(args.baselines, args.data)

    print("Computing PRI...")
    computer.compute()

    computer.to_csv(args.output)

    stats = computer.stats()
    print("\nStatistics:")
    for key, value in stats.items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    main()
