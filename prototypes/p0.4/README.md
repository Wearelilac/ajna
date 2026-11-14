# P0.4: Care-Gap Routing & Outreach Drafts

**Purpose:** Prove that Ajna can map elevated risk or overdue screening to approved care pathways, generate tailored outreach drafts, and run through staff review with no automatic sending.

**Scope:**
1. Create 15-25 synthetic approved care pathways
2. Build risk-to-pathway mapping (eligibility filters + pgvector similarity)
3. Detect overdue Well-Child Visits and screenings
4. Generate outreach drafts (template-driven, approved snippets only)
5. Implement review state machine (draft → in_review → approved | rejected → closed)
6. Run banned-wording lint (no "diagnosed", "detected", "automatically")
7. Verify no code path sends messages
8. Verify draft requires staff approval to proceed

**Status:** Scaffold in place. Implementation starting.

## Files to Create

### Data
- `care_pathways.json` - 15-25 synthetic pathways with eligibility, snippets
- `eligible_subjects.sql` - Generate test subjects for each pathway

### Mapping
- `pathway_mapping.py` - Eligibility filters + pgvector top-k
- `test_mapping.py` - Evaluate on 200 labelled cases (top-1, top-3 accuracy)

### Overdue Detection
- `overdue_detection.sql` - Query due but not done screenings
- `test_overdue.py` - Verify counts on seeded data

### Draft Generation
- `draft_generator.py` - Template-driven generation from snippets
- `banned_words_lint.py` - Check for prohibited wording
- `test_drafts.py` - Generate 100 drafts, verify lint passes

### Review Workflow
- `review_state_machine.py` - State transitions + validation
- `test_state_machine.py` - All legal transitions pass, illegal ones fail

### Safety Checks
- `lint_no_messaging.sh` - Grep for SMS/email/send imports (should be zero)
- `test_no_auto_send.py` - Verify no draft proceeds without approval

### Documentation
- `findings/P0.4-findings.md` - Verdict + limits

## Acceptance Checks (9 total)

- [ ] 15-25 pathways entered with approved_by/approved_on
- [ ] Mapping evaluated on 200 labelled cases: top-1 accuracy, top-3 accuracy, no_suitable_pathway rate
- [ ] Eligibility filters verified (age band outside → never returned)
- [ ] Overdue detection: seeded vs found counts match
- [ ] 100 drafts generated, banned-wording lint passes (0 violations)
- [ ] State machine: all legal transitions pass, illegal ones fail (show matrix)
- [ ] Static check: grep finds zero messaging imports
- [ ] Draft generation time (median ms per draft)
- [ ] Verdict recorded (go/limited-go/no-go) with limits

## Estimated Time: 2-3 hours
