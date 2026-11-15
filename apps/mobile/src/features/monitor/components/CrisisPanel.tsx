/**
 * M3.2: Crisis information panel
 * Static helpline information (configurable per region)
 * Always visible, not triggered by flags
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';

export function CrisisPanel() {
  const handleCallHelpline = () => {
    Linking.openURL('tel:988');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>If you are in crisis</Text>

      <Text style={styles.body}>
        If you need immediate support, please contact:
      </Text>

      <TouchableOpacity style={styles.helplineButton} onPress={handleCallHelpline}>
        <Text style={styles.helplineNumber}>988</Text>
        <Text style={styles.helplineLabel}>Suicide and Crisis Lifeline</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Ajna does not contact emergency services or anyone on your behalf. This
        is an advisory tool for self-reflection only.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#78350F',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 12,
  },
  helplineButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  helplineNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  helplineLabel: {
    fontSize: 12,
    color: '#FEE2E2',
    marginTop: 4,
  },
  disclaimer: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
  },
});
