import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { container } from '@/composition-root/container';
import { resendVerificationSchema } from '@/modules/auth/presentation/schemas/auth-schemas';
import { handleApiError } from '@/shared/presentation/error-handler';
import { escapeHtml } from '@/shared/kernel/escape-html';
import { getBaseUrl } from '@/shared/kernel/config';

export async function POST(request: NextRequest) {
  try {
    const { email } = resendVerificationSchema.parse(await request.json());

    // Pull both ports from the container — no direct prisma in app/
    const userRepository = container.getUserRepository();
    const emailQueueRepository = container.getEmailQueueRepository();

    // Find user
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal whether the email exists — return success to avoid enumeration
      return NextResponse.json({ success: true, message: 'If the email exists, a verification link has been sent.' });
    }

    if (user.deletedAt) {
      // Don't reveal whether the email exists or is deleted — return generic success
      return NextResponse.json({ success: true, message: 'If the email exists, a verification link has been sent.' });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, message: 'Email already verified' });
    }

    // Rate limit: check if a verification email was sent in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentEmail = await emailQueueRepository.findRecentByRecipient(
      email,
      'verification',
      fiveMinutesAgo,
    );

    if (recentEmail) {
      return NextResponse.json(
        { error: 'Please wait before requesting another verification email' },
        { status: 429 }
      );
    }

    // Generate verification token (24h expiry)
    const token = await new SignJWT({ purpose: 'email-verification' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.userId.value)
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(container.getSecrets().getAuthSecret());

    const baseUrl = getBaseUrl();
    const verificationLink = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

    const greetingName = escapeHtml(user.firstName) || 'there';

    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Verify your email</h2>
          <p>Hi ${greetingName},</p>
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

    await emailQueueRepository.create({
      to: email,
      subject: 'Verify your email — Modular Ecommerce',
      htmlBody,
      template: 'verification',
      metadata: { userId: user.userId.value },
    });

    return NextResponse.json({ success: true, message: 'Verification email sent' });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
