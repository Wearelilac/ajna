/**
 * W4.1: Cluster View (Underserved Communities)
 */

import React from 'react';
import { Cluster } from '../types';

interface Props {
  clusters: Cluster[];
}

export function ClusterView({ clusters }: Props) {
  if (clusters.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No clusters found. Run the clustering job to populate data.
      </div>
    );
  }

  // Group clusters by score range
  const highPriority = clusters.filter((c) => c.score > 70);
  const mediumPriority = clusters.filter((c) => c.score >= 40 && c.score <= 70);
  const lowPriority = clusters.filter((c) => c.score < 40);

  return (
    <div className="space-y-6">
      {highPriority.length > 0 && (
        <ClusterSection title="High Priority (Score > 70)" clusters={highPriority} />
      )}
      {mediumPriority.length > 0 && (
        <ClusterSection title="Medium Priority (Score 40-70)" clusters={mediumPriority} />
      )}
      {lowPriority.length > 0 && (
        <ClusterSection title="Low Priority (Score < 40)" clusters={lowPriority} />
      )}
    </div>
  );
}

function ClusterSection({ title, clusters }: { title: string; clusters: Cluster[] }) {
  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <div className="space-y-4">
        {clusters.map((cluster) => (
          <ClusterCard key={cluster.clusterId} cluster={cluster} />
        ))}
      </div>
    </div>
  );
}

function ClusterCard({ cluster }: { cluster: Cluster }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h4 className="text-xl font-semibold text-gray-900">
              Cluster {cluster.clusterId}
            </h4>
            <ScoreBadge score={cluster.score} />
          </div>
          <p className="mt-2 text-gray-700">{cluster.label}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <ScoreBreakdownItem
          label="Deprivation"
          value={cluster.scoreBreakdown.deprivation}
          suffix="%"
        />
        <ScoreBreakdownItem
          label="Avg PRI"
          value={cluster.scoreBreakdown.pri}
          suffix=""
        />
        <ScoreBreakdownItem
          label="Deviation"
          value={cluster.scoreBreakdown.deviation_share}
          suffix="%"
        />
        <ScoreBreakdownItem
          label="Flag Rate"
          value={cluster.scoreBreakdown.flag_rate}
          suffix=""
        />
      </div>

      <div className="pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          <span className="font-medium">{cluster.communities.length}</span> communities in this
          cluster
        </p>
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const rounded = Math.round(score);
  const className =
    rounded > 70
      ? 'bg-red-100 text-red-800'
      : rounded >= 40
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-green-100 text-green-800';

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${className}`}
    >
      Score: {rounded}
    </span>
  );
}

function ScoreBreakdownItem({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix: string;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900">
        {Math.round(value)}
        {suffix}
      </p>
    </div>
  );
}
