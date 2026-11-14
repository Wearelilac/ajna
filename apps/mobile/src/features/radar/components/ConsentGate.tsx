import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export function ConsentGate() {
  const navigation = useNavigation();

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-6">
      <View className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-6 mb-6">
        <Text className="text-3xl mb-4">🔒</Text>
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-3">
          Wearable Consent Required
        </Text>
        <Text className="text-gray-600 dark:text-gray-400 leading-relaxed">
          To view your Resilience Radar, you need to grant consent for wearable data
          collection and processing.
        </Text>
      </View>

      <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
        <Text className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          What we'll collect:
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          • Heart rate variability{'\n'}
          • Resting heart rate{'\n'}
          • Sleep patterns{'\n'}
          • Activity and recovery metrics
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => navigation.navigate('Privacy' as never)}
        className="bg-indigo-600 px-8 py-3 rounded-lg"
      >
        <Text className="text-white font-medium">Review Privacy Settings</Text>
      </TouchableOpacity>

      <Text className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4">
        You can manage your consent at any time in Privacy settings
      </Text>
    </View>
  );
}
