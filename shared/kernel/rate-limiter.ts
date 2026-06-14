import { prisma } from '@/shared/infrastructure/prisma';

const FIFTEEN_MIN = 15 * 60 * 1000;

interface RateLimitResult {
  blocked: boolean;
  reason?: 'email' | 'ip';
  retryAfterSeconds?: number;
}

export async function checkRateLimit(
  email: string,
  ip: string,
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - FIFTEEN_MIN);

  // 5 failed attempts per email in 15 min
  const emailFails = await prisma.loginAttempt.count({
    where: { email, success: false, createdAt: { gte: since } },
  });
  if (emailFails >= 5) {
    return { blocked: true, reason: 'email', retryAfterSeconds: 900 };
  }

  // 20 failed attempts per IP in 15 min
  const ipFails = await prisma.loginAttempt.count({
    where: { ipAddress: ip, success: false, createdAt: { gte: since } },
  });
  if (ipFails >= 20) {
    return { blocked: true, reason: 'ip', retryAfterSeconds: 3600 };
  }

  return { blocked: false };
}

export async function recordLoginAttempt(
  email: string,
  ip: string,
  success: boolean,
) {
  await prisma.loginAttempt.create({
    data: { email, ipAddress: ip, success },
  });
}
