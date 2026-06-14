import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { RegisterUserUseCase } from '@/modules/users/application/register-user-use-case';
import { PrismaUserRepository } from '@/modules/users/infrastructure/prisma-user-repository';
import { PrismaOutboxRepository } from '@/shared/infrastructure/prisma-outbox-repository';
import { prisma } from '@/shared/infrastructure/prisma';

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
}

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:3000';
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    // Rate limit: max 3 signups per hour per IP (stored in SignupAttempt)
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSignups = await prisma.signupAttempt.count({
      where: { ipAddress: ip, createdAt: { gte: oneHourAgo } },
    });
    if (recentSignups >= 3) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 },
      );
    }

    // Record the signup attempt BEFORE creating the user to prevent bypass
    await prisma.signupAttempt.create({
      data: { ipAddress: ip, email },
    });

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

    const baseUrl = getBaseUrl(req);
    const verificationLink = `${baseUrl}/api/auth/verify-email?token=${token}`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Welcome to Modular Ecommerce!</h2>
          <p>Hi ${name || 'there'},</p>
          <p>Thank you for registering. Please click the link below to verify your email address:</p>
          <p>
            <a href="${verificationLink}"
               style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 6px;">
              Verify Email
            </a>
          </p>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #4F46E5;">${verificationLink}</p>
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
  } catch (error: any) {
    console.error('[SignupAPI] Error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 400 });
  }
}
