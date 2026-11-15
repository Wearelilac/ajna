/**
 * M3.2: Post-session summary
 * Shown after session ends
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface PostSessionSummaryProps {
  duration: number; // seconds
  flagsSent: number;
  onDismiss: () => void;
}

export function PostSessionSummary({
  duration,
  flagsSent,
  onDismiss,
}: PostSessionSummaryProps) {
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session Complete</Text>

      <View style={styles.stat}>
        <Text style={styles.statLabel}>Duration</Text>
        <Text style={styles.statValue}>
          {minutes}m {seconds}s
        </Text>
      </View>

      <View style={styles.stat}>
        <Text style={styles.statLabel}>Signals flagged for review</Text>
        <Text style={styles.statValue}>{flagsSent}</Text>
      </View>

      <Text style={styles.privacy}>
        Nothing was recorded or saved on your phone.
      </Text>

      <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
        <Text style={styles.dismissButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  stat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  privacy: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  dismissButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
