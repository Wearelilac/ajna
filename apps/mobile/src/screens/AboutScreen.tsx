/**
 * M1.1: About Screen
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export function AboutScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.title}>Ajna Platform</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy Guarantees</Text>
        <Text style={styles.text}>
          • K-anonymity enforced (K≥10){'\n'}
          • Ephemeral audio (never persisted){'\n'}
          • 7-field allow-list (no audio, transcripts, or features){'\n'}
          • Human review required (no automatic actions){'\n'}
          • Consent-gated (granular per-feature consent){'\n'}
          • Audit trails (hash-chained, append-only)
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features</Text>
        <Text style={styles.text}>
          <Text style={styles.bold}>Resilience Radar:</Text> Track personal resilience index (PRI) from wearable data{'\n\n'}
          <Text style={styles.bold}>Monitor:</Text> On-device acoustic monitoring with ephemeral processing{'\n\n'}
          <Text style={styles.bold}>Population Health:</Text> Community-level risk aggregates (officials only)
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Retention</Text>
        <Text style={styles.text}>
          • Audio: Never persisted (10-second ring buffer only){'\n'}
          • Flags: 30 days{'\n'}
          • Wearable metrics: 13 months{'\n'}
          • Crisis reviews: 12 months{'\n'}
          • Audit logs: 24 months
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  version: {
    fontSize: 16,
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  bold: {
    fontWeight: '600',
  },
});
