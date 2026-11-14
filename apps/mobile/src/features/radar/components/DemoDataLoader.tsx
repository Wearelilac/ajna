import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { wearableApi } from '../../../api/wearable';

interface DemoDataLoaderProps {
  onSuccess: () => void;
}

export function DemoDataLoader({ onSuccess }: DemoDataLoaderProps) {
  const [scenario, setScenario] = useState<'steady' | 'gradual_decline' | 'acute_deviation'>('steady');

  const demoMutation = useMutation({
    mutationFn: (scenario: string) => wearableApi.seedDemo(scenario),
    onSuccess: () => {
      Alert.alert('Success', 'Demo data loaded successfully. Pull to refresh to see your radar.');
      onSuccess();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to load demo data');
    },
  });

  const scenarios = [
    {
      id: 'steady' as const,
      label: 'Steady',
      description: 'Normal daily variation',
    },
    {
      id: 'gradual_decline' as const,
      label: 'Gradual Decline',
      description: 'Slow trend downward over 30 days',
    },
    {
      id: 'acute_deviation' as const,
      label: 'Acute Event',
      description: '7-day drop around day 50',
    },
  ];

  return (
    <View className="border-t border-gray-200 dark:border-gray-700 pt-6">
      <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
        Demo Data
      </Text>
      <Text className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Load 60 days of synthetic data to explore the radar.
      </Text>

      {/* Scenario picker */}
      <View className="mb-4">
        {scenarios.map((s) => (
          <TouchableOpacity
            key={s.id}
            onPress={() => setScenario(s.id)}
            className={`mb-2 p-4 rounded-lg border ${
              scenario === s.id
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-600'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}
          >
            <Text
              className={`font-medium ${
                scenario === s.id
                  ? 'text-indigo-900 dark:text-indigo-100'
                  : 'text-gray-900 dark:text-white'
              }`}
            >
              {s.label}
            </Text>
            <Text
              className={`text-sm mt-1 ${
                scenario === s.id
                  ? 'text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {s.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Load button */}
      <TouchableOpacity
        onPress={() => demoMutation.mutate(scenario)}
        disabled={demoMutation.isPending}
        className={`py-3 rounded-lg ${
          demoMutation.isPending ? 'bg-gray-400' : 'bg-indigo-600'
        }`}
      >
        {demoMutation.isPending ? (
          <View className="flex-row items-center justify-center">
            <ActivityIndicator size="small" color="#fff" />
            <Text className="text-white font-medium ml-2">Loading...</Text>
          </View>
        ) : (
          <Text className="text-center text-white font-medium">Load Demo Data</Text>
        )}
      </TouchableOpacity>

      <Text className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
        This will generate ~57 days of data (5% missing)
      </Text>
    </View>
  );
}
