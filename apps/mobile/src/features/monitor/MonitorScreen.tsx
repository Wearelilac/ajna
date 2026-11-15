/**
 * M3.2: Monitor Me screen
 * Privacy-first explainer, start/stop flow, visible indicator
 * Foreground-only acoustic monitoring
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { getEdgeController, EdgeStatus } from '../../edge';
import { useMonitorSession } from './useMonitorSession';
import { useFlagSender } from './useFlagSender';
import { ListeningIndicator } from './components/ListeningIndicator';
import { PostSessionSummary } from './components/PostSessionSummary';
import { CrisisPanel } from './components/CrisisPanel';

export function MonitorScreen() {
  const {
    startSession,
    endSession,
    activeSession,
    isLoading,
    error,
  } = useMonitorSession();

  const { sendFlag, queueLength } = useFlagSender();

  const [edgeStatus, setEdgeStatus] = useState<EdgeStatus | null>(null);
  const [lastSessionSummary, setLastSessionSummary] = useState<{
    duration: number;
    flagsSent: number;
  } | null>(null);

  const edgeController = getEdgeController();

  // Poll edge status every 500ms
  useEffect(() => {
    if (!activeSession) {
      return;
    }

    const intervalId = setInterval(() => {
      const status = edgeController.status();
      setEdgeStatus(status);

      // Auto-stop if session expired
      if (status.remainingMs <= 0 && status.isListening) {
        handleStop('timeout');
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, [activeSession]);

  // Handle app backgrounding
  useEffect(() => {
    // TODO: Add AppState listener
    // When app backgrounds, call edgeController.onBackground()
  }, []);

  const handleStart = useCallback(async () => {
    Alert.alert(
      'Start Monitoring',
      'This will analyze your speech for advisory signals only. No audio is recorded or saved. You can stop at any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            try {
              // Start server session
              const session = await startSession();

              // Build thresholds from P0.2
              const thresholds = new Map([
                ['vocal_tension_spike', 0.5],
                ['distress_signature', 0.6],
                ['speech_rate_anomaly', 0.4],
                ['pitch_variance_high', 0.5],
                ['energy_drop_sustained', 0.3],
                ['verbal_aggression_pattern', 0.5],
              ]);

              // Start edge controller
              await edgeController.start({
                sessionId: session.id,
                maxDurationSec: session.maxDurationSec,
                modelVersion: 'distress-1.0',
                thresholds,
                onFlag: (flag) => {
                  sendFlag(flag);
                },
                onIndicator: (isListening) => {
                  // Indicator shown via ListeningIndicator component
                },
              });
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to start session');
            }
          },
        },
      ],
    );
  }, [startSession, sendFlag]);

  const handleStop = useCallback(
    async (reason: string = 'user_stopped') => {
      try {
        // Stop edge controller
        edgeController.stop(reason);

        // Get final status
        const finalStatus = edgeController.status();

        // End server session
        if (activeSession) {
          await endSession(activeSession.id, reason);
        }

        // Save summary
        setLastSessionSummary({
          duration: Math.floor(finalStatus.elapsedMs / 1000),
          flagsSent: finalStatus.flagsEmitted,
        });
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to stop session');
      }
    },
    [activeSession, endSession],
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Monitor Me</Text>

        {/* Privacy Explainer */}
        <View style={styles.explainer}>
          <Text style={styles.explainerTitle}>How it works</Text>
          <Text style={styles.explainerText}>
            • Analyzes speech patterns in real-time on your device{'\n'}
            • No audio is recorded or saved{'\n'}
            • Only advisory signals are sent for human review{'\n'}
            • You control when monitoring starts and stops
          </Text>
        </View>

        {/* Active Session */}
        {activeSession && edgeStatus && (
          <ListeningIndicator
            elapsedMs={edgeStatus.elapsedMs}
            remainingMs={edgeStatus.remainingMs}
            flagsSent={edgeStatus.flagsEmitted}
            queueLength={queueLength}
            onStop={() => handleStop('user_stopped')}
          />
        )}

        {/* Start Button */}
        {!activeSession && !lastSessionSummary && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStart}
            disabled={isLoading}
          >
            <Text style={styles.startButtonText}>Start Monitoring</Text>
          </TouchableOpacity>
        )}

        {/* Post-Session Summary */}
        {lastSessionSummary && !activeSession && (
          <PostSessionSummary
            duration={lastSessionSummary.duration}
            flagsSent={lastSessionSummary.flagsSent}
            onDismiss={() => setLastSessionSummary(null)}
          />
        )}

        {/* Crisis Information */}
        <CrisisPanel />

        {/* Error Display */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  explainer: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  explainerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  explainerText: {
    fontSize: 14,
    color: '#1E3A8A',
    lineHeight: 20,
  },
  startButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    fontSize: 14,
    color: '#991B1B',
  },
});
