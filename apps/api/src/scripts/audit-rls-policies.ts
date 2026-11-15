/**
 * B5.1: RLS Policy Audit Script
 * Verifies all tables have correct RLS policies for all roles
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface PolicyCheck {
  table: string;
  role: string;
  expected: string[];
  actual: string[];
  status: 'PASS' | 'FAIL';
}

const EXPECTED_POLICIES: Record<string, Record<string, string[]>> = {
  subjects: {
    app_user: ['SELECT (self)'],
    app_worker: ['SELECT', 'INSERT', 'UPDATE'],
    app_reviewer: ['NONE'],
    app_official: ['NONE'],
  },
  wearable_daily: {
    app_user: ['SELECT (self)'],
    app_worker: ['INSERT'],
    app_reviewer: ['NONE'],
    app_official: ['NONE'],
  },
  deviation_flags: {
    app_user: ['SELECT (self)'],
    app_worker: ['INSERT', 'UPDATE'],
    app_reviewer: ['NONE'],
    app_official: ['NONE'],
  },
  community_week_agg: {
    app_user: ['NONE'],
    app_worker: ['SELECT', 'INSERT', 'UPDATE'],
    app_reviewer: ['NONE'],
    app_official: ['SELECT'],
  },
  care_gaps: {
    app_user: ['NONE'],
    app_worker: ['SELECT', 'INSERT', 'UPDATE'],
    app_reviewer: ['SELECT'],
    app_official: ['NONE'],
  },
  outreach_drafts: {
    app_user: ['NONE'],
    app_worker: ['SELECT', 'INSERT', 'UPDATE'],
    app_reviewer: ['SELECT', 'UPDATE'],
    app_official: ['NONE'],
  },
};

async function auditRLSPolicies() {
  console.log('='.repeat(80));
  console.log('RLS POLICY AUDIT');
  console.log('='.repeat(80));

  const results: PolicyCheck[] = [];
  let passCount = 0;
  let failCount = 0;

  for (const [table, roleExpectations] of Object.entries(EXPECTED_POLICIES)) {
    console.log(`\n📋 Table: ${table}`);

    // Check if RLS is enabled
    const rlsCheck = await pool.query(`
      SELECT relrowsecurity
      FROM pg_class
      WHERE relname = $1
    `, [table]);

    if (rlsCheck.rows.length === 0) {
      console.log(`  ❌ Table not found`);
      continue;
    }

    const rlsEnabled = rlsCheck.rows[0].relrowsecurity;
    if (!rlsEnabled) {
      console.log(`  ❌ RLS NOT ENABLED`);
      failCount++;
      continue;
    }

    console.log(`  ✓ RLS enabled`);

    // Check policies for each role
    for (const [role, expected] of Object.entries(roleExpectations)) {
      const policies = await pool.query(`
        SELECT cmd, qual
        FROM pg_policies
        WHERE tablename = $1
          AND (policyname LIKE $2 OR roles @> ARRAY[$3::regrole])
      `, [table, `%${role}%`, role]);

      const actual = policies.rows.map(p => p.cmd);

      const status = arraysEqual(expected, actual) ? 'PASS' : 'FAIL';
      results.push({ table, role, expected, actual, status });

      if (status === 'PASS') {
        console.log(`  ✓ ${role}: ${expected.join(', ') || 'NONE'}`);
        passCount++;
      } else {
        console.log(`  ❌ ${role}: Expected [${expected.join(', ')}], Got [${actual.join(', ')}]`);
        failCount++;
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`RESULTS: ${passCount} passed, ${failCount} failed`);
  console.log('='.repeat(80));

  await pool.end();

  if (failCount > 0) {
    process.exit(1);
  }
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const aSorted = [...a].sort();
  const bSorted = [...b].sort();
  return aSorted.every((val, idx) => val === bSorted[idx]);
}

auditRLSPolicies().catch(console.error);
