/**
 * W1.1: Home Page (Dashboard Overview)
 */

import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Ajna Platform Dashboard
        </h1>
        <p className="text-lg text-gray-600">
          Privacy-first population health monitoring and crisis review
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard
          title="Population Health"
          description="Community-level risk aggregates with K-anonymity enforcement (K≥10)"
          href="/population"
          icon="📊"
        />
        
        <DashboardCard
          title="Crisis Reviews"
          description="Human workflow for flagged advisory signals"
          href="/crisis-reviews"
          icon="🚨"
        />
        
        <DashboardCard
          title="Care-Gap Review"
          description="Outreach draft approval workflow"
          href="/caregap-review"
          icon="💬"
        />
      </div>

      <div className="mt-12 bg-blue-50 border-l-4 border-blue-400 p-6 rounded">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          Privacy Guarantees
        </h3>
        <ul className="text-blue-800 space-y-2">
          <li>✓ K-anonymity enforced (minimum 10 subjects per group)</li>
          <li>✓ Ephemeral audio (never persisted)</li>
          <li>✓ Human review required (no automatic actions)</li>
          <li>✓ Consent-gated (granular per-feature consent)</li>
          <li>✓ Audit trails (hash-chained, append-only)</li>
        </ul>
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </Link>
  );
}
