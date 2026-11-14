import { apiClient } from './client';

export interface WearableMetrics {
  hrv_rmssd_ms?: number;
  skin_temp_dev_c?: number;
  resting_hr_bpm?: number;
  sleep_total_min?: number;
  sleep_deep_min?: number;
  sleep_rem_min?: number;
  sleep_light_min?: number;
  sleep_awake_min?: number;
  sleep_efficiency?: number;
  activity_recovery_ratio?: number;
}

export interface WearableDaily {
  id: string;
  subject_id: string;
  date: string;
  source: string;
  metrics: WearableMetrics;
  received_at: string;
}

export const wearableApi = {
  /**
   * GET /v1/wearable/daily
   * Get wearable metrics for a date range (decrypted)
   */
  async getDaily(fromDate: string, toDate: string): Promise<WearableDaily[]> {
    const response = await apiClient.get('/v1/wearable/daily', {
      params: { from: fromDate, to: toDate },
    });
    return response.data;
  },

  /**
   * POST /v1/wearable/demo-seed
   * Generate 60 days of synthetic demo data
   */
  async seedDemo(scenario: string = 'steady'): Promise<{ days_generated: number; scenario: string; message: string }> {
    const response = await apiClient.post('/v1/wearable/demo-seed', { scenario });
    return response.data;
  },
};
