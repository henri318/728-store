import { SignJWT } from 'jose';
import type { SecretsPort } from '@/modules/auth/domain/secrets';
import type { EmailQueueRepository } from '@/modules/email/domain/email-queue-repository';
import { escapeHtml } from '@/shared/kernel/escape-html';
import { getBaseUrl } from '@/shared/kernel/config';

export interface SendVerificationEmailInput {
  userId: string;
  email: string;
  name: string;
}

/**
 * Pure use case — orchestrates sending a verification email after signup.
 *
 * Dependencies are injected via constructor (ports only), so the use case
 * has ZERO knowledge of Next.js, Prisma, or any concrete adapter.
 */
export class SendVerificationEmailUseCase {
  constructor(
    private readonly secrets: SecretsPort,
    private readonly emailQueueRepository: EmailQueueRepository,
  ) {}

  async execute(input: SendVerificationEmailInput): Promise<void> {
    const { userId, email, name } = input;

    // Generate verification token (24h expiry)
    const token = await new SignJWT({ purpose: 'email-verification' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(this.secrets.getAuthSecret());

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

    // Queue the verification email via the port (no direct prisma call)
    await this.emailQueueRepository.create({
      to: email,
      subject: 'Verify your email — Modular Ecommerce',
      htmlBody,
      template: 'verification',
      metadata: { userId },
    });
  }
}
