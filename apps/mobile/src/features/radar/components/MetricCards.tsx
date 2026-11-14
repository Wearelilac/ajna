import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { wearableApi } from '../../../api/wearable';
import { radarApi } from '../../../api/radar';

export function MetricCards() {
  // Get last 7 days of wearable data
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: wearableData } = useQuery({
    queryKey: ['wearable', 'daily', sevenDaysAgo, today],
    queryFn: () => wearableApi.getDaily(sevenDaysAgo, today),
  });

  const { data: deviations } = useQuery({
    queryKey: ['radar', 'deviations', sevenDaysAgo, today],
    queryFn: () => radarApi.getDeviations(sevenDaysAgo, today),
  });

  if (!wearableData || wearableData.length === 0) {
    return null;
  }

  // Get latest metrics
  const latest = wearableData[0];
  const metrics = latest.metrics;

  // Check if any metric has a deviation
  const hasDeviation = (metric: string) => {
    return deviations?.some(
      (d) => d.metric === metric && d.date === latest.date,
    );
  };

  const metricCards = [
    {
      label: 'Heart Rate Variability',
      value: metrics.hrv_rmssd_ms,
      unit: 'ms',
      metric: 'hrv_rmssd_ms',
      description: 'Higher is generally better',
    },
    {
      label: 'Resting Heart Rate',
      value: metrics.resting_hr_bpm,
      unit: 'bpm',
      metric: 'resting_hr_bpm',
      description: 'Lower is generally better',
    },
    {
      label: 'Sleep Efficiency',
      value: metrics.sleep_efficiency ? (metrics.sleep_efficiency * 100).toFixed(0) : null,
      unit: '%',
      metric: 'sleep_efficiency',
      description: 'Higher is better',
    },
    {
      label: 'Total Sleep',
      value: metrics.sleep_total_min ? (metrics.sleep_total_min / 60).toFixed(1) : null,
      unit: 'hrs',
      metric: 'sleep_total_min',
      description: '7-9 hours is typical',
    },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6">
      <View className="flex-row">
        {metricCards.map((card, index) => (
          <View
            key={index}
            className={`mr-4 w-48 rounded-xl p-4 ${
              hasDeviation(card.metric)
                ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                : 'bg-gray-50 dark:bg-gray-800'
            }`}
          >
            {/* Label */}
            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {card.label}
            </Text>

            {/* Value */}
            {card.value !== null && card.value !== undefined ? (
              <View className="flex-row items-baseline mb-2">
                <Text className="text-3xl font-bold text-gray-900 dark:text-white">
                  {card.value}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                  {card.unit}
                </Text>
              </View>
            ) : (
              <Text className="text-2xl text-gray-400 dark:text-gray-500 mb-2">—</Text>
            )}

            {/* Description */}
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {card.description}
            </Text>

            {/* Deviation indicator */}
            {hasDeviation(card.metric) && (
              <View className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                <Text className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                  ⚠️ Flagged for review
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
