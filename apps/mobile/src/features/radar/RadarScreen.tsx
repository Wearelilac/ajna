import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useConsent } from '../../hooks/useConsent';
import { radarApi } from '../../api/radar';
import { wearableApi } from '../../api/wearable';
import { PRIGauge } from './components/PRIGauge';
import { MetricCards } from './components/MetricCards';
import { FlagsList } from './components/FlagsList';
import { ConsentGate } from './components/ConsentGate';
import { DemoDataLoader } from './components/DemoDataLoader';

export function RadarScreen() {
  const { user } = useAuth();
  const { hasConsent } = useConsent();
  const [refreshing, setRefreshing] = useState(false);

  // Check wearable consent
  const hasWearableConsent = hasConsent('wearable');

  // Queries (only run if consent granted)
  const {
    data: summary,
    isLoading,
    isError,
    error,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['radar', 'summary'],
    queryFn: radarApi.getSummary,
    enabled: hasWearableConsent,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchSummary();
    setRefreshing(false);
  };

  // Show consent gate if no wearable consent
  if (!hasWearableConsent) {
    return <ConsentGate />;
  }

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-4 text-gray-600 dark:text-gray-400">Loading your radar...</Text>
      </View>
    );
  }

  // Error state
  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 p-6">
        <Text className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Unable to load radar
        </Text>
        <Text className="text-gray-600 dark:text-gray-400 text-center mb-4">
          {error?.message || 'Something went wrong'}
        </Text>
        <TouchableOpacity
          onPress={handleRefresh}
          className="bg-indigo-600 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-medium">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state (no data yet)
  if (!summary) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-900">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View className="items-center">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              No radar data yet
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-center mb-6">
              Start by connecting your wearable device or loading demo data to see your
              Personal Resilience Index.
            </Text>
            <DemoDataLoader onSuccess={handleRefresh} />
          </View>
        </ScrollView>
      </View>
    );
  }

  // Main content
  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View className="px-6 pt-8 pb-4">
          <Text className="text-3xl font-bold text-gray-900 dark:text-white">
            Resilience Radar
          </Text>
          <Text className="text-gray-600 dark:text-gray-400 mt-1">
            Your daily metrics and trends
          </Text>
        </View>

        {/* Stale indicator */}
        {summary.is_stale && (
          <View className="mx-6 mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <Text className="text-amber-800 dark:text-amber-200 text-sm">
              ⚠️ Data may be outdated. Refresh to update.
            </Text>
          </View>
        )}

        {/* PRI Gauge */}
        <View className="px-6 mb-6">
          <PRIGauge
            pri={summary.latest_pri}
            date={summary.latest_date}
            trend7d={summary.trend_7d}
            trend30d={summary.trend_30d}
          />
        </View>

        {/* Active Flags */}
        {summary.active_flags && summary.active_flags.length > 0 && (
          <View className="px-6 mb-6">
            <Text className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Recent Indicators
            </Text>
            <FlagsList flags={summary.active_flags} />
          </View>
        )}

        {/* Metric Cards */}
        <View className="px-6 mb-8">
          <Text className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            Metrics
          </Text>
          <MetricCards />
        </View>

        {/* Demo Data Loader (dev/demo mode only) */}
        <View className="px-6 pb-8">
          <DemoDataLoader onSuccess={handleRefresh} />
        </View>
      </ScrollView>
    </View>
  );
}
