export interface RateLimitResult {
  blocked: boolean;
  reason?: 'email' | 'ip';
  retryAfterSeconds?: number;
}
