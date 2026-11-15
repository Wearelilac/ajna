/**
 * M3.2: Monitor session API hook
 * Manages server-side session lifecycle
 */

import { useState, useCallback } from 'react';
import { monitorApi } from '../../api/monitor';

export interface MonitorSession {
  id: string;
  subjectId: string;
  startedAt: string;
  endedAt?: string;
  maxDurationSec: number;
  endReason?: string;
}

export function useMonitorSession() {
  const [activeSession, setActiveSession] = useState<MonitorSession | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSession = useCallback(async (): Promise<MonitorSession> => {
    setIsLoading(true);
    setError(null);

    try {
      const session = await monitorApi.startSession();
      setActiveSession(session);
      return session;
    } catch (err: any) {
      const message = err.message || 'Failed to start session';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const endSession = useCallback(
    async (sessionId: string, reason: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        await monitorApi.endSession(sessionId, reason);
        setActiveSession(null);
      } catch (err: any) {
        const message = err.message || 'Failed to end session';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const getActiveSession = useCallback(async (): Promise<MonitorSession | null> => {
    try {
      const session = await monitorApi.getActiveSession();
      setActiveSession(session);
      return session;
    } catch (err) {
      return null;
    }
  }, []);

  return {
    activeSession,
    isLoading,
    error,
    startSession,
    endSession,
    getActiveSession,
  };
}
