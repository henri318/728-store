import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { RegisterUserUseCase } from '@/modules/users/application/register-user-use-case';
import { PrismaUserRepository } from '@/modules/users/infrastructure/prisma-user-repository';
import { PrismaOutboxRepository } from '@/shared/infrastructure/prisma-outbox-repository';
import { prisma } from '@/shared/infrastructure/prisma';
import { signupSchema } from '@/shared/validation/auth-schemas';
import { handleApiError } from '@/shared/kernel/error-handler';
import { escapeHtml } from '@/shared/infrastructure/email';
import { getBaseUrl } from '@/shared/infrastructure/url';

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = signupSchema.parse(await req.json());

    // Rate limiting removed: the previous X-Forwarded-For / X-Real-IP based
    // check is trivially spoofable by setting request headers, giving a false
    // sense of security. Replace with a server-side rate limiter (e.g. Upstash
    // Ratelimit) before re-enabling signup throttling.

    // Manual dependency injection for production
    const userRepository = new PrismaUserRepository();
    const outboxRepository = new PrismaOutboxRepository();

    const useCase = new RegisterUserUseCase(userRepository, outboxRepository);

    const user = await useCase.execute({
      name,
      email,
      password,
    });

    // Generate verification token (24h expiry)
    const token = await new SignJWT({ purpose: 'email-verification' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(getSecret());

    const baseUrl = getBaseUrl();
    const verificationLink = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Welcome to Modular Ecommerce!</h2>
          <p>Hi ${escapeHtml(name) || 'there'},</p>
          <p>Thank you for registering. Please click the link below to verify your email address:</p>
          <p>
            <a href="${verificationLink}"
               style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 6px;">
              Verify Email
            </a>
          </p>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #4F46E5;">${escapeHtml(verificationLink)}</p>
          <p>This link expires in 24 hours.</p>
          <hr>
          <p style="color: #6B7280; font-size: 12px;">Modular Ecommerce</p>
        </body>
      </html>
    `;

    // Create email queue entry for verification
    await prisma.emailQueue.create({
      data: {
        to: email,
        subject: 'Verify your email — Modular Ecommerce',
        htmlBody,
        template: 'verification',
        metadata: { userId: user.id },
      },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      message: 'Registration successful. Please check your email to verify your account.',
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
