#!/usr/bin/env python3
"""
P0.3: Generate synthetic population for pgvector testing
Creates 100k subjects with flags, PRI, care history
"""

import json
import random
from datetime import datetime, timedelta
from typing import List, Dict
import uuid

# Configuration
NUM_SUBJECTS = 100_000
NUM_COMMUNITIES = 200
AGE_BANDS = ['0-5', '6-12', '13-18', '19-30', '31-50', '51-65', '66+']
REGIONS = ['US-CA', 'US-TX', 'US-NY', 'US-FL', 'US-IL', 'US-OH', 'US-PA', 'US-GA']
SIGNATURES = ['vocal_tension_spike', 'distress_signature', 'verbal_aggression_pattern', 'hesitation_cluster']

def generate_subjects(n: int) -> List[Dict]:
    """Generate synthetic subjects with demographics"""
    subjects = []
    for i in range(n):
        community_id = f"COMM_{random.randint(1, NUM_COMMUNITIES):04d}"
        subjects.append({
            'subject_id': str(uuid.uuid4()),
            'age_band': random.choice(AGE_BANDS),
            'region_code': random.choice(REGIONS),
            'community_id': community_id,
            'deprivation_index': random.uniform(0.1, 0.9),  # Higher = more deprived
        })
    return subjects

def generate_flags(subjects: List[Dict], weeks: int = 52) -> List[Dict]:
    """Generate de-identified flags"""
    flags = []
    for subject in subjects:
        # ~10% of subjects have flags
        if random.random() < 0.1:
            num_flags = random.randint(1, 5)
            for _ in range(num_flags):
                week_offset = random.randint(0, weeks - 1)
                time_bucket = datetime.now() - timedelta(weeks=week_offset)
                flags.append({
                    'id': str(uuid.uuid4()),
                    'subject_id': subject['subject_id'],
                    'signature': random.choice(SIGNATURES),
                    'confidence': round(random.uniform(0.5, 0.95), 2),
                    'time_bucket': time_bucket.strftime('%Y-%m-%d %H:00:00'),
                    'model_version': 'distress-1.0',
                    'session_id': str(uuid.uuid4()),
                })
    return flags

def generate_pri_daily(subjects: List[Dict], days: int = 90) -> List[Dict]:
    """Generate daily PRI scores"""
    pri_records = []
    for subject in subjects:
        # Generate 90 days of PRI
        base_pri = random.randint(40, 80)
        for day in range(days):
            date = datetime.now() - timedelta(days=day)
            # Add some variation
            pri = max(0, min(100, base_pri + random.randint(-10, 10)))
            deviation_count = random.randint(0, 3) if pri < 50 else 0
            
            pri_records.append({
                'subject_id': subject['subject_id'],
                'date': date.strftime('%Y-%m-%d'),
                'pri': pri,
                'deviation_count': deviation_count,
            })
    return pri_records

def save_json(data: List[Dict], filename: str):
    """Save data to JSON file"""
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Saved {len(data)} records to {filename}")

if __name__ == '__main__':
    print(f"Generating {NUM_SUBJECTS:,} subjects...")
    subjects = generate_subjects(NUM_SUBJECTS)
    save_json(subjects[:1000], 'subjects_1k.json')  # Sample for testing
    
    print(f"Generating flags...")
    flags = generate_flags(subjects)
    save_json(flags[:1000], 'flags_1k.json')  # Sample
    
    print(f"Generating PRI data...")
    pri_data = generate_pri_daily(subjects[:10000])  # 10k subjects for speed
    save_json(pri_data[:1000], 'pri_1k.json')  # Sample
    
    print(f"\n✓ Generation complete")
    print(f"  Subjects: {len(subjects):,}")
    print(f"  Flags: {len(flags):,}")
    print(f"  PRI records: {len(pri_data):,}")
    print(f"\nSample files created for testing:")
    print(f"  - subjects_1k.json")
    print(f"  - flags_1k.json")
    print(f"  - pri_1k.json")
