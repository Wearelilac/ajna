"""
P0.1 Baseline Computation

Computes 30-day rolling baseline (mean/SD and median/MAD) and z-scores.

Usage:
    python baseline.py --data=data/synthetic.csv --output=data/baselines.csv
"""

import argparse
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd


class BaselineComputer:
    """Computes 30-day baseline and z-scores."""

    METRICS = [
        "hrv_rmssd_ms",
        "skin_temp_dev_c",
        "resting_hr_bpm",
        "sleep_total_min",
        "sleep_deep_min",
        "sleep_rem_min",
        "sleep_light_min",
        "sleep_awake_min",
        "sleep_efficiency",
        "activity_recovery_ratio",
    ]

    MIN_VALID_DAYS = 14
    Z_THRESHOLD = 3
    SD_FLOOR = 0.001

    def __init__(self, data_path: str):
        """Load data."""
        self.df = pd.read_csv(data_path)
        self.df["date"] = pd.to_datetime(self.df["date"])
        self.baselines = []
        self.flags = []

    def compute(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """Compute baselines and deviation flags."""
        subjects = self.df["subject_id"].unique()
        dates = sorted(self.df["date"].unique())

        for subject_id in subjects:
            subject_data = self.df[self.df["subject_id"] == subject_id].sort_values(
                "date"
            )

            for date in dates:
                # Trailing 30 days excluding current date
                window_start = date - timedelta(days=30)
                window_data = subject_data[
                    (subject_data["date"] > window_start) & (subject_data["date"] < date)
                ]

                if len(window_data) < self.MIN_VALID_DAYS:
                    continue

                # Compute baseline
                baseline_row = {
                    "subject_id": subject_id,
                    "date": date,
                    "valid_days": len(window_data),
                }

                for metric in self.METRICS:
                    values = window_data[metric].dropna()

                    if len(values) == 0:
                        baseline_row[f"{metric}_mean"] = None
                        baseline_row[f"{metric}_sd"] = None
                        baseline_row[f"{metric}_median"] = None
                        baseline_row[f"{metric}_mad"] = None
                        continue

                    # Mean and SD
                    mean_val = values.mean()
                    sd_val = values.std()
                    baseline_row[f"{metric}_mean"] = round(mean_val, 4)
                    baseline_row[f"{metric}_sd"] = round(sd_val, 4)

                    # Median and MAD
                    median_val = values.median()
                    mad_val = np.median(np.abs(values - median_val))
                    baseline_row[f"{metric}_median"] = round(median_val, 4)
                    baseline_row[f"{metric}_mad"] = round(mad_val, 4)

                    # Check for deviation flags on current day
                    current_day = subject_data[subject_data["date"] == date]
                    if not current_day.empty:
                        current_val = current_day[metric].iloc[0]

                        if (
                            pd.notna(current_val)
                            and pd.notna(mean_val)
                            and sd_val > self.SD_FLOOR
                        ):
                            z_score = (current_val - mean_val) / sd_val

                            # Flag if |z| > threshold
                            if abs(z_score) > self.Z_THRESHOLD:
                                direction = "high" if z_score > 0 else "low"
                                self.flags.append(
                                    {
                                        "subject_id": subject_id,
                                        "date": date,
                                        "metric": metric,
                                        "z_score": round(z_score, 2),
                                        "direction": direction,
                                        "current_value": round(current_val, 4),
                                        "baseline_mean": round(mean_val, 4),
                                        "baseline_sd": round(sd_val, 4),
                                    }
                                )

                self.baselines.append(baseline_row)

        baselines_df = pd.DataFrame(self.baselines)
        flags_df = pd.DataFrame(self.flags)

        return baselines_df, flags_df

    def to_csv(self, baselines_path: str, flags_path: str) -> None:
        """Export to CSV."""
        Path(baselines_path).parent.mkdir(parents=True, exist_ok=True)
        Path(flags_path).parent.mkdir(parents=True, exist_ok=True)

        baselines_df = pd.DataFrame(self.baselines)
        flags_df = pd.DataFrame(self.flags)

        baselines_df.to_csv(baselines_path, index=False)
        flags_df.to_csv(flags_path, index=False)

        print(f"✓ Wrote {len(baselines_df)} baseline rows to {baselines_path}")
        print(f"✓ Wrote {len(flags_df)} flag rows to {flags_path}")

    def stats(self) -> Dict:
        """Return statistics."""
        flags_df = pd.DataFrame(self.flags)
        if flags_df.empty:
            return {"total_flags": 0, "flags_per_subject_month": 0}

        # Subjects with injected events
        subjects_with_events = self.df[
            self.df["has_injected_event"] == True
        ]["subject_id"].unique()
        event_flags = flags_df[flags_df["subject_id"].isin(subjects_with_events)]

        return {
            "total_baselines_computed": len(self.baselines),
            "total_flags": len(flags_df),
            "subjects_with_events": len(subjects_with_events),
            "event_detection_rate": (
                len(event_flags) / len(subjects_with_events)
                if len(subjects_with_events) > 0
                else 0
            ),
            "flags_per_subject_month": (
                len(flags_df) / (len(self.df["subject_id"].unique()) * 2)
                if len(self.df) > 0
                else 0
            ),  # Approx ~60 days = 2 months
        }


def main():
    parser = argparse.ArgumentParser(
        description="Compute baselines and deviation flags"
    )
    parser.add_argument("--data", required=True, help="Input data CSV")
    parser.add_argument(
        "--baselines", default="data/baselines.csv", help="Output baselines CSV"
    )
    parser.add_argument(
        "--flags", default="data/deviation_flags.csv", help="Output flags CSV"
    )

    args = parser.parse_args()

    print(f"Reading {args.data}...")
    computer = BaselineComputer(args.data)

    print("Computing baselines and flags...")
    computer.compute()

    computer.to_csv(args.baselines, args.flags)

    stats = computer.stats()
    print("\nStatistics:")
    for key, value in stats.items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    main()
