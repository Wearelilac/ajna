import { apiClient } from './client';

export interface RadarSummary {
  latest_pri: number;
  latest_date: string;
  trend_7d: number;
  trend_30d: number;
  active_flags: DeviationFlag[];
  is_stale: boolean;
}

export interface PriPoint {
  date: string;
  pri: number;
  deviation_count: number;
}

export interface DeviationFlag {
  id: string;
  date: string;
  metric: string;
  z: number;
  direction: 'high' | 'low';
  status: string;
  flagged_at: string;
}

export const radarApi = {
  /**
   * GET /v1/radar/summary
   * Get radar summary (latest PRI, trend, active flags)
   */
  async getSummary(): Promise<RadarSummary> {
    const response = await apiClient.get('/v1/radar/summary');
    return response.data;
  },

  /**
   * GET /v1/radar/pri
   * Get PRI history for a date range
   */
  async getPriHistory(fromDate: string, toDate: string): Promise<PriPoint[]> {
    const response = await apiClient.get('/v1/radar/pri', {
      params: { from: fromDate, to: toDate },
    });
    return response.data;
  },

  /**
   * GET /v1/radar/deviations
   * Get deviation flags for a date range
   */
  async getDeviations(fromDate: string, toDate: string): Promise<DeviationFlag[]> {
    const response = await apiClient.get('/v1/radar/deviations', {
      params: { from: fromDate, to: toDate },
    });
    return response.data;
  },
};
