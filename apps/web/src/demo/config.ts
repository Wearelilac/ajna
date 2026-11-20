/**
 * Demo mode is ON unless explicitly disabled or a live API URL is configured.
 * Set NEXT_PUBLIC_API_URL later to point at your NestJS backend.
 */
export function isDemoMode(): boolean {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'false') {
    return false;
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return false;
  }
  return true;
}

export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}
