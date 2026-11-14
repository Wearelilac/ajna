"""
P0.1 Wearable Ingestion Simulator

Generates 60 days of synthetic wearable data for N subjects with:
- Personal means and SDs per metric
- Weekly rhythm
- ~5% missing days
- 0.1% sensor outliers
- Injected ground truth events (5% of subjects: HRV drop + RHR rise)

Usage:
    python simulator.py --subjects=1000 --days=60 --seed=42 --output=data/synthetic.csv
"""

import argparse
import csv
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd


class WearableSimulator:
    """Generates synthetic wearable data."""

    def __init__(self, seed: int = 42, subjects: int = 1000, days: int = 60):
        """
        Initialize simulator.

        Args:
            seed: Random seed for reproducibility
            subjects: Number of synthetic subjects
            days: Number of days to simulate
        """
        np.random.seed(seed)
        self.seed = seed
        self.subjects = subjects
        self.days = days
        self.start_date = datetime(2026, 9, 15)  # 60 days before mid-Nov
        self.data = []

        # Generate subject profiles
        self.subject_profiles = self._generate_subject_profiles()

    def _generate_subject_profiles(self) -> Dict[int, Dict]:
        """Generate personal baselines for each subject."""
        profiles = {}
        for subject_id in range(1, self.subjects + 1):
            # Inject event in 5% of subjects
            has_event = np.random.random() < 0.05
            event_start_day = np.random.randint(30, 55) if has_event else None

            profiles[subject_id] = {
                "hrv_mean": np.random.uniform(30, 70),
                "hrv_sd": np.random.uniform(5, 15),
                "resting_hr_mean": np.random.uniform(55, 75),
                "resting_hr_sd": np.random.uniform(3, 8),
                "sleep_total_mean": np.random.uniform(420, 520),
                "sleep_total_sd": np.random.uniform(30, 60),
                "sleep_deep_frac": np.random.uniform(0.15, 0.25),
                "sleep_rem_frac": np.random.uniform(0.20, 0.30),
                "skin_temp_dev_mean": 0.0,
                "skin_temp_dev_sd": np.random.uniform(0.2, 0.6),
                "activity_recovery_mean": 1.0,
                "activity_recovery_sd": np.random.uniform(0.1, 0.3),
                "event_start_day": event_start_day,
            }
        return profiles

    def generate(self) -> List[Dict]:
        """Generate synthetic data."""
        data = []

        for day_offset in range(self.days):
            current_date = self.start_date + timedelta(days=day_offset)

            for subject_id in range(1, self.subjects + 1):
                # ~5% missing days
                if np.random.random() < 0.05:
                    continue

                profile = self.subject_profiles[subject_id]

                # Weekly rhythm: higher mid-week, lower on weekends
                dow = current_date.weekday()  # 0=Mon, 6=Sun
                weekly_factor = 1.0 + 0.08 * np.sin(2 * np.pi * dow / 7)

                # Injected event: sustained HRV drop + RHR rise
                event_factor = 1.0
                if profile["event_start_day"] is not None:
                    days_into_event = day_offset - profile["event_start_day"]
                    if 0 <= days_into_event < 7:  # 7-day event
                        event_factor = 0.75  # HRV drops 25%
                        # RHR rises by ~5 bpm (additive, handled below)

                # Generate metrics
                hrv = (
                    profile["hrv_mean"] * weekly_factor * event_factor
                    + np.random.normal(0, profile["hrv_sd"])
                )
                hrv = np.clip(hrv, 1, 300)

                resting_hr = (
                    profile["resting_hr_mean"] * weekly_factor
                    + (5 if event_factor < 0.8 else 0)  # RHR rises during event
                    + np.random.normal(0, profile["resting_hr_sd"])
                )
                resting_hr = np.clip(resting_hr, 30, 120)

                sleep_total = (
                    profile["sleep_total_mean"]
                    + np.random.normal(0, profile["sleep_total_sd"])
                )
                sleep_total = np.clip(sleep_total, 0, 1440)

                sleep_deep = sleep_total * profile["sleep_deep_frac"]
                sleep_rem = sleep_total * profile["sleep_rem_frac"]
                sleep_light = (
                    sleep_total
                    - sleep_deep
                    - sleep_rem
                    - np.random.uniform(20, 60)
                )
                sleep_light = np.clip(sleep_light, 0, sleep_total)
                sleep_awake = sleep_total - sleep_deep - sleep_rem - sleep_light

                skin_temp_dev = (
                    profile["skin_temp_dev_mean"]
                    + np.random.normal(0, profile["skin_temp_dev_sd"])
                )
                skin_temp_dev = np.clip(skin_temp_dev, -10, 10)

                activity_recovery = (
                    profile["activity_recovery_mean"]
                    + np.random.normal(0, profile["activity_recovery_sd"])
                )
                activity_recovery = np.clip(activity_recovery, 0, 2)

                # 0.1% sensor outliers
                if np.random.random() < 0.001:
                    # Randomly corrupt one metric
                    corrupt_metric = np.random.choice(
                        ["hrv", "resting_hr", "sleep_total"]
                    )
                    if corrupt_metric == "hrv":
                        hrv = np.random.uniform(5, 300)
                    elif corrupt_metric == "resting_hr":
                        resting_hr = np.random.uniform(40, 110)
                    else:
                        sleep_total = np.random.uniform(60, 600)

                data.append(
                    {
                        "subject_id": subject_id,
                        "date": current_date.strftime("%Y-%m-%d"),
                        "source": "simulator",
                        "hrv_rmssd_ms": round(hrv, 2),
                        "skin_temp_dev_c": round(skin_temp_dev, 2),
                        "resting_hr_bpm": round(resting_hr, 1),
                        "sleep_total_min": int(sleep_total),
                        "sleep_deep_min": int(sleep_deep),
                        "sleep_rem_min": int(sleep_rem),
                        "sleep_light_min": int(sleep_light),
                        "sleep_awake_min": int(sleep_awake),
                        "sleep_efficiency": round(
                            sleep_total / 1440 if sleep_total > 0 else 0, 2
                        ),
                        "activity_recovery_ratio": round(activity_recovery, 2),
                        "has_injected_event": profile["event_start_day"]
                        is not None,
                    }
                )

        self.data = data
        return data

    def to_csv(self, path: str) -> None:
        """Export data to CSV."""
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        df = pd.DataFrame(self.data)
        df.to_csv(path, index=False)
        print(f"✓ Wrote {len(self.data)} rows to {path}")

    def to_jsonl(self, path: str) -> None:
        """Export data to JSONL."""
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            for row in self.data:
                f.write(json.dumps(row) + "\n")
        print(f"✓ Wrote {len(self.data)} rows to {path}")

    def stats(self) -> Dict:
        """Print statistics about the generated data."""
        df = pd.DataFrame(self.data)
        return {
            "total_rows": len(df),
            "subjects": df["subject_id"].nunique(),
            "days": df["date"].nunique(),
            "date_range": (df["date"].min(), df["date"].max()),
            "missing_days_pct": (
                (self.subjects * self.days - len(df)) / (self.subjects * self.days)
            )
            * 100,
            "injected_event_subjects": df["has_injected_event"].sum(),
            "hrv_mean": df["hrv_rmssd_ms"].mean(),
            "hrv_sd": df["hrv_rmssd_ms"].std(),
            "resting_hr_mean": df["resting_hr_bpm"].mean(),
            "resting_hr_sd": df["resting_hr_bpm"].std(),
        }


def main():
    parser = argparse.ArgumentParser(
        description="Generate synthetic wearable data for P0.1"
    )
    parser.add_argument(
        "--subjects", type=int, default=1000, help="Number of subjects"
    )
    parser.add_argument("--days", type=int, default=60, help="Number of days")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument(
        "--output", default="data/synthetic.csv", help="Output CSV path"
    )
    parser.add_argument(
        "--output-jsonl", help="Optional output JSONL path"
    )

    args = parser.parse_args()

    print(f"Generating {args.subjects} subjects × {args.days} days...")
    sim = WearableSimulator(seed=args.seed, subjects=args.subjects, days=args.days)
    sim.generate()

    sim.to_csv(args.output)
    if args.output_jsonl:
        sim.to_jsonl(args.output_jsonl)

    stats = sim.stats()
    print("\nStatistics:")
    for key, value in stats.items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    main()
