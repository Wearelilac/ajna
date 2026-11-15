/**
 * M3.2: Monitor API client
 * TanStack Query client for monitor endpoints
 */

import { DeIdentifiedFlag } from '../edge';

// TODO: Replace with generated client from openapi.v1.yaml
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface MonitorSession {
  id: string;
  subjectId: string;
  startedAt: string;
  endedAt?: string;
  maxDurationSec: number;
  endReason?: string;
}

export const monitorApi = {
  /**
   * POST /v1/monitor/sessions
   */
  async startSession(): Promise<MonitorSession> {
    const response = await fetch(`${API_BASE_URL}/v1/monitor/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add auth token
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to start session');
    }

    return await response.json();
  },

  /**
   * POST /v1/monitor/sessions/:id/end
   */
  async endSession(sessionId: string, reason: string): Promise<MonitorSession> {
    const response = await fetch(
      `${API_BASE_URL}/v1/monitor/sessions/${sessionId}/end`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endReason: reason }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to end session');
    }

    return await response.json();
  },

  /**
   * GET /v1/monitor/sessions/active
   */
  async getActiveSession(): Promise<MonitorSession | null> {
    const response = await fetch(`${API_BASE_URL}/v1/monitor/sessions/active`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get active session');
    }

    return await response.json();
  },

  /**
   * POST /v1/monitor/flags
   */
  async sendFlag(flag: DeIdentifiedFlag): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/v1/monitor/flags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(flag),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send flag');
    }
  },
};
