import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/infrastructure/prisma';
import { SignJWT } from 'jose';
import { resendVerificationSchema } from '@/shared/validation/auth-schemas';
import { handleApiError } from '@/shared/kernel/error-handler';
import { escapeHtml } from '@/shared/kernel/email';
import { getBaseUrl } from '@/shared/kernel/url';

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
}

export async function POST(request: NextRequest) {
  try {
    const { email } = resendVerificationSchema.parse(await request.json());

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal whether the email exists — return success to avoid enumeration
      return NextResponse.json({ success: true, message: 'If the email exists, a verification link has been sent.' });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, message: 'Email already verified' });
    }

    // Rate limit: check if a verification email was sent in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentEmail = await prisma.emailQueue.findFirst({
      where: {
        to: email,
        template: 'verification',
        createdAt: { gte: fiveMinutesAgo },
      },
    });

    if (recentEmail) {
      return NextResponse.json(
        { error: 'Please wait before requesting another verification email' },
        { status: 429 }
      );
    }

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
          <h2>Verify your email</h2>
          <p>Hi ${escapeHtml(user.name) || 'there'},</p>
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

    await prisma.emailQueue.create({
      data: {
        to: email,
        subject: 'Verify your email — Modular Ecommerce',
        htmlBody,
        template: 'verification',
        metadata: { userId: user.id },
      },
    });

    return NextResponse.json({ success: true, message: 'Verification email sent' });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
