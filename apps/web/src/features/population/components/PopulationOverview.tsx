/**
 * W4.1: Population Overview Cards
 */

import React from 'react';
import { PopulationOverview as PopulationOverviewType } from '../types';

interface Props {
  overview: PopulationOverviewType | null;
}

export function PopulationOverview({ overview }: Props) {
  if (!overview) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <MetricCard
        label="Total Communities"
        value={overview.totalCommunities}
        icon="🏘️"
      />
      <MetricCard
        label="Total Subjects"
        value={overview.totalSubjects.toLocaleString()}
        subtitle="K-anonymity enforced"
        icon="👥"
      />
      <MetricCard
        label="Total Flags (30d)"
        value={overview.totalFlags.toLocaleString()}
        icon="🚩"
      />
      <MetricCard
        label="Avg Resilience Score"
        value={Math.round(overview.avgPri)}
        subtitle="0-100 scale"
        icon="💪"
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  icon,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}
