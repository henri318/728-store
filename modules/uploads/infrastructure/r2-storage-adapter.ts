import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StoragePort } from '../domain/storage-port';

/**
 * R2StorageAdapter — Cloudflare R2 implementation of the StoragePort.
 *
 * Uses AWS SDK S3-compatible API to generate presigned URLs and
 * delete objects. R2 is S3-compatible, so no special configuration
 * beyond the account-specific endpoint is needed.
 *
 * Environment variables:
 *   R2_BUCKET          — R2 bucket name
 *   R2_ACCOUNT_ID      — Cloudflare account ID
 *   R2_ACCESS_KEY_ID   — R2 API token access key
 *   R2_SECRET_ACCESS_KEY — R2 API token secret key
 *   R2_PUBLIC_DOMAIN   — Public domain for permanent URLs
 *                         (e.g. "https://bucket.account.r2.dev" or custom domain)
 */
export class R2StorageAdapter implements StoragePort {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicDomain: string;

  constructor() {
    this.bucket = requireEnv('R2_BUCKET');
    const accountId = requireEnv('R2_ACCOUNT_ID');
    const accessKeyId = requireEnv('R2_ACCESS_KEY_ID');
    const secretAccessKey = requireEnv('R2_SECRET_ACCESS_KEY');
    this.publicDomain = requireEnv('R2_PUBLIC_DOMAIN');

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Generate a presigned PUT URL for uploading a file directly to R2.
   *
   * @param key — Storage key (e.g. `product/user-1/clsxyz123.webp`)
   * @param contentType — MIME type of the file
   * @param expiresIn — URL validity in seconds (default: 300 = 5 minutes)
   */
  async generateUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 300,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Generate a presigned GET URL for reading a file from R2.
   *
   * @param key — Storage key
   * @param expiresIn — URL validity in seconds (default: 3600 = 1 hour)
   */
  async generateReadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Get a permanent public URL for the given key.
   *
   * Uses the R2_PUBLIC_DOMAIN env var (e.g. "https://bucket.account.r2.dev"
   * or a custom domain). The URL is stable and does not expire — safe for
   * product images, avatars, SEO, social sharing, and CDN caching.
   */
  getPublicUrl(key: string): string {
    const base = this.publicDomain.endsWith('/')
      ? this.publicDomain.slice(0, -1)
      : this.publicDomain;
    return `${base}/${key}`;
  }

  /**
   * Delete an object from R2 by key.
   *
   * If the key doesn't exist, R2 returns success (no-op).
   */
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
