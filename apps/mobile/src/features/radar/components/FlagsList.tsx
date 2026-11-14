import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';

interface DeviationFlag {
  id: string;
  date: string;
  metric: string;
  z: number;
  direction: 'high' | 'low';
  status: string;
  flagged_at: string;
}

interface FlagsListProps {
  flags: DeviationFlag[];
}

export function FlagsList({ flags }: FlagsListProps) {
  const [selectedFlag, setSelectedFlag] = useState<DeviationFlag | null>(null);

  // Format metric name for display
  const formatMetric = (metric: string): string => {
    const names: Record<string, string> = {
      hrv_rmssd_ms: 'Heart Rate Variability',
      resting_hr_bpm: 'Resting Heart Rate',
      sleep_total_min: 'Total Sleep',
      sleep_efficiency: 'Sleep Efficiency',
      activity_recovery_ratio: 'Activity Recovery',
    };
    return names[metric] || metric;
  };

  // Format date
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View>
      {flags.map((flag) => (
        <TouchableOpacity
          key={flag.id}
          onPress={() => setSelectedFlag(flag)}
          className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-2"
          accessibilityLabel={`${formatMetric(flag.metric)} flagged ${flag.direction} on ${formatDate(flag.date)}`}
          accessibilityHint="Tap for more details"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-900 dark:text-white">
                {formatMetric(flag.metric)}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {flag.direction === 'high' ? '↑' : '↓'} {Math.abs(flag.z).toFixed(1)}σ from baseline
              </Text>
            </View>
            <View>
              <Text className="text-xs text-gray-400 dark:text-gray-500">
                {formatDate(flag.date)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}

      {/* Flag Detail Modal */}
      <Modal
        visible={selectedFlag !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedFlag(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6">
            {selectedFlag && (
              <>
                {/* Header */}
                <View className="flex-row items-center justify-between mb-6">
                  <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatMetric(selectedFlag.metric)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelectedFlag(null)}
                    className="w-8 h-8 items-center justify-center"
                  >
                    <Text className="text-2xl text-gray-400">×</Text>
                  </TouchableOpacity>
                </View>

                {/* Details */}
                <View className="mb-6">
                  <View className="flex-row justify-between mb-3">
                    <Text className="text-gray-600 dark:text-gray-400">Date</Text>
                    <Text className="font-medium text-gray-900 dark:text-white">
                      {formatDate(selectedFlag.date)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-3">
                    <Text className="text-gray-600 dark:text-gray-400">Direction</Text>
                    <Text className="font-medium text-gray-900 dark:text-white">
                      {selectedFlag.direction === 'high' ? '↑ Above' : '↓ Below'} baseline
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-3">
                    <Text className="text-gray-600 dark:text-gray-400">Deviation</Text>
                    <Text className="font-medium text-gray-900 dark:text-white">
                      {Math.abs(selectedFlag.z).toFixed(2)}σ (standard deviations)
                    </Text>
                  </View>
                </View>

                {/* Advisory notice */}
                <View className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                  <Text className="text-sm font-medium text-indigo-900 dark:text-indigo-100 mb-2">
                    What this means
                  </Text>
                  <Text className="text-sm text-indigo-800 dark:text-indigo-200 leading-relaxed">
                    This is an advisory indicator for human review, not a diagnosis. It shows
                    your {formatMetric(selectedFlag.metric)} is{' '}
                    {selectedFlag.direction === 'high' ? 'above' : 'below'} your usual range.
                  </Text>
                  <Text className="text-sm text-indigo-800 dark:text-indigo-200 leading-relaxed mt-2">
                    Consider rest, hydration, and talking with your usual care provider if you
                    feel unwell.
                  </Text>
                </View>

                {/* Close button */}
                <TouchableOpacity
                  onPress={() => setSelectedFlag(null)}
                  className="bg-indigo-600 rounded-lg py-3 mt-6"
                >
                  <Text className="text-center text-white font-medium">Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
