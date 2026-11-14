#!/usr/bin/env python3
"""
P0.4: Care-gap routing engine
Maps care gaps to approved pathways using eligibility filters + vector similarity
"""

import json
import random
import re
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import uuid
import math

# Load pathways
with open('pathways.json', 'r') as f:
    PATHWAYS = json.load(f)

# Banned wording (from 00-data-protection-model.md section 8)
BANNED_WORDS = [
    'diagnosed', 'diagnosis', 'disorder', 'disease', 'condition',
    'detected', 'flagged', 'identified', 'abnormal', 'alert',
    'risk score', 'distress signature', 'acoustic pattern', 'voice analysis',
    'AI detected', 'algorithm found', 'system identified', 'automated screening'
]

def generate_embedding(text: str, dim: int = 384) -> List[float]:
    """
    Simulate embedding generation (in production: use all-MiniLM-L6-v2)
    For prototype: deterministic hash-based pseudo-embedding
    """
    # Hash text to seed (deterministic)
    hash_val = hash(text) % (2**32)
    random.seed(hash_val)
    
    # Generate normalized vector
    vec = [random.gauss(0, 1) for _ in range(dim)]
    norm = math.sqrt(sum(x*x for x in vec))
    return [x/norm for x in vec]

def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Compute cosine similarity between two vectors"""
    return sum(x*y for x, y in zip(a, b))

def check_eligibility(gap: Dict, pathway: Dict) -> Tuple[bool, Dict]:
    """
    Check if a care gap matches pathway eligibility criteria
    Returns: (is_eligible, filter_metadata)
    """
    eligibility = pathway['eligibility']
    indicator = gap['indicator_summary']
    filters = {}
    
    # Age band check
    if indicator['age_band'] not in eligibility['age_bands']:
        return False, {'age_band_match': False}
    filters['age_band_match'] = True
    
    # Indicator type check
    if 'indicator_types' in eligibility:
        if gap['gap_type'] not in eligibility['indicator_types']:
            return False, {**filters, 'indicator_type_match': False}
        filters['indicator_type_match'] = True
    
    # Screening type check (for overdue screenings)
    if 'screening_type' in eligibility:
        if indicator.get('screening_type') != eligibility['screening_type']:
            return False, {**filters, 'screening_type_match': False}
        filters['screening_type_match'] = True
    
    # Overdue window check
    if 'max_days_overdue' in eligibility and 'days_overdue' in indicator:
        if indicator['days_overdue'] > eligibility['max_days_overdue']:
            return False, {**filters, 'overdue_window_ok': False}
        filters['overdue_window_ok'] = True
    
    # Flag count check
    if 'min_flag_count' in eligibility and 'flag_count' in indicator:
        if indicator['flag_count'] < eligibility['min_flag_count']:
            return False, {**filters, 'flag_count_ok': False}
        filters['flag_count_ok'] = True
    
    # All filters passed
    return True, filters

def route_gap(gap: Dict, top_k: int = 3, similarity_threshold: float = 0.0) -> List[Dict]:
    """
    Route a care gap to top-k matching pathways
    Returns: List of {pathway, rank, similarity, filtered_by}
    """
    # Generate gap embedding (from indicator summary)
    gap_text = f"{gap['gap_type']} {json.dumps(gap['indicator_summary'])}"
    gap_embedding = generate_embedding(gap_text)
    
    # Filter eligible pathways and compute similarities
    candidates = []
    for pathway in PATHWAYS:
        is_eligible, filter_meta = check_eligibility(gap, pathway)
        if not is_eligible:
            continue
        
        # Compute similarity
        pathway_text = f"{pathway['title']} {pathway['description']}"
        pathway_embedding = generate_embedding(pathway_text)
        similarity = cosine_similarity(gap_embedding, pathway_embedding)
        
        if similarity >= similarity_threshold:
            candidates.append({
                'pathway': pathway,
                'similarity': similarity,
                'filtered_by': filter_meta
            })
    
    # Sort by similarity (descending) and return top-k
    candidates.sort(key=lambda x: x['similarity'], reverse=True)
    matches = []
    for rank, candidate in enumerate(candidates[:top_k], 1):
        matches.append({
            'pathway': candidate['pathway'],
            'rank': rank,
            'similarity': round(candidate['similarity'], 4),
            'filtered_by': candidate['filtered_by']
        })
    
    return matches

def generate_draft(gap: Dict, pathway: Dict) -> Dict:
    """
    Generate outreach draft from approved pathway wording
    Template-only (no LLM) for prototype
    """
    snippets = pathway['wording_snippets']
    indicator = gap['indicator_summary']
    
    # Fill template variables
    substitutions = {
        'guardian_name': indicator.get('guardian_name', 'Parent/Guardian'),
        'child_name': indicator.get('child_name', 'your child'),
        'member_name': indicator.get('member_name', 'Member'),
        'clinic_phone': '(555) 123-4567'  # Placeholder
    }
    
    # Build body
    body_parts = []
    if 'greeting' in snippets:
        body_parts.append(fill_template(snippets['greeting'], substitutions))
    if 'body' in snippets:
        body_parts.append(fill_template(snippets['body'], substitutions))
    if 'cta' in snippets:
        body_parts.append(fill_template(snippets['cta'], substitutions))
    if 'closing' in snippets:
        body_parts.append(fill_template(snippets['closing'], substitutions))
    
    body = '\n\n'.join(body_parts)
    
    # Determine reading level based on age band
    age_band = indicator['age_band']
    if age_band in ['0-5', '6-12']:
        reading_level = 'grade_5'
    elif age_band in ['13-18']:
        reading_level = 'grade_8'
    else:
        reading_level = 'adult'
    
    return {
        'id': str(uuid.uuid4()),
        'care_gap_id': gap['id'],
        'pathway_id': pathway.get('id', str(uuid.uuid4())),
        'body': body,
        'language': 'en',
        'reading_level': reading_level,
        'status': 'draft',
        'generated_by': 'template_only',
        'llm_model': None,
        'created_at': datetime.now().isoformat()
    }

def fill_template(template: str, substitutions: Dict) -> str:
    """Replace {{variable}} placeholders in template"""
    result = template
    for key, value in substitutions.items():
        result = result.replace(f'{{{{{key}}}}}', value)
    return result

def lint_banned_wording(text: str) -> List[str]:
    """
    Check for banned wording in draft
    Returns: List of violations (empty if clean)
    """
    violations = []
    text_lower = text.lower()
    for banned in BANNED_WORDS:
        if banned.lower() in text_lower:
            violations.append(banned)
    return violations

def validate_state_transition(from_status: str, to_status: str, reviewer_role: str) -> Tuple[bool, Optional[str]]:
    """
    Validate state machine transition
    Returns: (is_valid, error_message)
    """
    # Legal transitions
    legal = {
        'draft': ['in_review'],
        'in_review': ['approved', 'edited_approved', 'rejected'],
        'approved': ['closed'],
        'edited_approved': ['closed'],
        'rejected': ['closed', 'in_review'],  # Can re-review after edits
        'closed': []  # Terminal state
    }
    
    if to_status not in legal.get(from_status, []):
        return False, f"Illegal transition: {from_status} → {to_status}"
    
    # Role check: only Reviewer can approve/reject
    if to_status in ['approved', 'edited_approved', 'rejected']:
        if reviewer_role not in ['reviewer', 'clinical_supervisor']:
            return False, f"Only Reviewer role can approve/reject (got: {reviewer_role})"
    
    return True, None

def compute_review_hash(review: Dict, prev_hash: Optional[str]) -> str:
    """Compute hash for audit chain"""
    import hashlib
    
    canonical = (
        str(review['draft_id']) + '|' +
        str(review['reviewer_id']) + '|' +
        review['from_status'] + '|' +
        review['to_status'] + '|' +
        (review.get('reason') or '') + '|' +
        (review.get('edited_body') or '') + '|' +
        (prev_hash or '') + '|' +
        review['at']
    )
    
    return hashlib.sha256(canonical.encode()).hexdigest()

if __name__ == '__main__':
    # Test with sample gap
    sample_gap = {
        'id': str(uuid.uuid4()),
        'subject_id': str(uuid.uuid4()),
        'gap_type': 'overdue_screening',
        'due_date': (datetime.now() - timedelta(days=45)).strftime('%Y-%m-%d'),
        'indicator_summary': {
            'age_band': '0-5',
            'screening_type': 'well_child_18m',
            'days_overdue': 45,
            'guardian_name': 'Jane Doe',
            'child_name': 'Emma'
        },
        'created_at': datetime.now().isoformat()
    }
    
    print("Sample gap:", json.dumps(sample_gap, indent=2))
    print("\nRouting...")
    
    matches = route_gap(sample_gap, top_k=3)
    print(f"\nFound {len(matches)} matching pathways:")
    for match in matches:
        print(f"\n  Rank {match['rank']}: {match['pathway']['title']}")
        print(f"    Similarity: {match['similarity']:.4f}")
        print(f"    Filters: {match['filtered_by']}")
    
    if matches:
        print("\nGenerating draft from top match...")
        draft = generate_draft(sample_gap, matches[0]['pathway'])
        print(f"\nDraft ID: {draft['id']}")
        print(f"Status: {draft['status']}")
        print(f"Generated by: {draft['generated_by']}")
        print(f"Reading level: {draft['reading_level']}")
        print(f"\nBody:\n{draft['body']}")
        
        print("\nLinting for banned wording...")
        violations = lint_banned_wording(draft['body'])
        if violations:
            print(f"  ✗ VIOLATIONS FOUND: {violations}")
        else:
            print(f"  ✓ Clean (no banned words)")
