import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface PRIGaugeProps {
  pri: number; // 0-100
  date: string;
  trend7d: number;
  trend30d: number;
}

export function PRIGauge({ pri, date, trend7d, trend30d }: PRIGaugeProps) {
  // Color based on PRI
  const getColor = (score: number): string => {
    if (score >= 70) return '#10B981'; // Green (good)
    if (score >= 50) return '#6366F1'; // Indigo (neutral)
    if (score >= 30) return '#F59E0B'; // Amber (concerning)
    return '#EF4444'; // Red (low)
  };

  const color = getColor(pri);

  // Trend indicator
  const renderTrend = (value: number, label: string) => {
    const direction = value > 0 ? '↑' : value < 0 ? '↓' : '→';
    const trendColor = value > 0 ? 'text-green-600' : value < 0 ? 'text-amber-600' : 'text-gray-500';

    return (
      <View className="flex-row items-center">
        <Text className={`text-sm font-medium ${trendColor}`}>
          {direction} {Math.abs(value)}
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 ml-1">{label}</Text>
      </View>
    );
  };

  return (
    <View className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
      {/* Gauge */}
      <View className="items-center mb-4">
        <View className="relative">
          {/* Background circle */}
          <Svg width={200} height={200}>
            <Circle
              cx={100}
              cy={100}
              r={80}
              stroke="#E5E7EB"
              strokeWidth={12}
              fill="none"
            />
            {/* Progress circle */}
            <Circle
              cx={100}
              cy={100}
              r={80}
              stroke={color}
              strokeWidth={12}
              fill="none"
              strokeDasharray={`${(pri / 100) * 502.4} 502.4`}
              strokeLinecap="round"
              rotation="-90"
              origin="100, 100"
            />
          </Svg>

          {/* PRI value */}
          <View
            className="absolute inset-0 items-center justify-center"
            style={{ top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <Text className="text-5xl font-bold" style={{ color }}>
              {pri}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">PRI Score</Text>
          </View>
        </View>
      </View>

      {/* Explanation */}
      <View className="mb-4">
        <Text className="text-center text-sm text-gray-600 dark:text-gray-400">
          Your Personal Resilience Index reflects how your current metrics compare to your
          usual baseline. This is an advisory indicator, not a diagnosis.
        </Text>
      </View>

      {/* Trends */}
      <View className="flex-row justify-around border-t border-gray-200 dark:border-gray-700 pt-4">
        <View>
          {renderTrend(trend7d, '7d')}
        </View>
        <View>
          {renderTrend(trend30d, '30d')}
        </View>
      </View>

      {/* Date */}
      <Text className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
        Latest: {date}
      </Text>

      {/* PRI interpretation guide */}
      <View className="mt-4 bg-white dark:bg-gray-900 rounded-lg p-3">
        <Text className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Understanding your PRI:
        </Text>
        <View className="space-y-1">
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-green-500 mr-2" />
            <Text className="text-xs text-gray-600 dark:text-gray-400">70-100: Well above baseline</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-indigo-500 mr-2" />
            <Text className="text-xs text-gray-600 dark:text-gray-400">50-69: At or near baseline</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-amber-500 mr-2" />
            <Text className="text-xs text-gray-600 dark:text-gray-400">30-49: Below baseline</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-red-500 mr-2" />
            <Text className="text-xs text-gray-600 dark:text-gray-400">0-29: Well below baseline</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
