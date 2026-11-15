/**
 * M3.2: Listening indicator banner
 * Visible during active session
 * Shows elapsed/remaining time, flags sent, queue length
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ListeningIndicatorProps {
  elapsedMs: number;
  remainingMs: number;
  flagsSent: number;
  queueLength: number;
  onStop: () => void;
}

export function ListeningIndicator({
  elapsedMs,
  remainingMs,
  flagsSent,
  queueLength,
  onStop,
}: ListeningIndicatorProps) {
  const elapsedMin = Math.floor(elapsedMs / 60000);
  const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);
  const remainingMin = Math.floor(remainingMs / 60000);
  const remainingSec = Math.floor((remainingMs % 60000) / 1000);

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View style={styles.indicator}>
          <View style={styles.pulse} />
          <Text style={styles.statusText}>Listening</Text>
        </View>
      </View>

      <View style={styles.timeRow}>
        <View style={styles.timeBox}>
          <Text style={styles.timeLabel}>Elapsed</Text>
          <Text style={styles.timeValue}>
            {elapsedMin}:{elapsedSec.toString().padStart(2, '0')}
          </Text>
        </View>
        <View style={styles.timeBox}>
          <Text style={styles.timeLabel}>Remaining</Text>
          <Text style={styles.timeValue}>
            {remainingMin}:{remainingSec.toString().padStart(2, '0')}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          Flags: {flagsSent}
          {queueLength > 0 && ` (${queueLength} queued)`}
        </Text>
      </View>

      <TouchableOpacity style={styles.stopButton} onPress={onStop}>
        <Text style={styles.stopButtonText}>Stop Monitoring</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Nothing is recorded or saved on your phone
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeBox: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: '#BFDBFE',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statsRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statsText: {
    fontSize: 14,
    color: '#BFDBFE',
  },
  stopButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  stopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disclaimer: {
    fontSize: 12,
    color: '#BFDBFE',
    textAlign: 'center',
  },
});
