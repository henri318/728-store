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
 * Routes uploads to TWO buckets: public (product images, avatars) and
 * private (customization, ticket, general). The public bucket has a
 * custom domain for permanent URLs; the private bucket is only
 * accessible via presigned URLs.
 *
 * Environment variables:
 *   R2_PUBLIC_BUCKET   — R2 bucket for public assets (product images)
 *   R2_PRIVATE_BUCKET  — R2 bucket for private assets (customization)
 *   R2_BUCKET          — Fallback if R2_PUBLIC/PRIVATE_BUCKET are not set
 *   R2_ACCOUNT_ID      — Cloudflare account ID
 *   R2_ACCESS_KEY_ID   — R2 API token access key
 *   R2_SECRET_ACCESS_KEY — R2 API token secret key
 *   R2_PUBLIC_DOMAIN   — Public domain for permanent URLs
 *                         (e.g. "https://cdn.example.com")
 */
export class R2StorageAdapter implements StoragePort {
  /** Upload types that route to the public bucket. */
  private static readonly PUBLIC_TYPES = new Set(['product', 'avatar']);

  private readonly client: S3Client;
  private readonly publicBucket: string;
  private readonly privateBucket: string;
  private readonly publicDomain: string;

  constructor() {
    const fallback = requireEnv('R2_BUCKET', 'dummy-bucket');
    this.publicBucket = process.env.R2_PUBLIC_BUCKET || fallback;
    this.privateBucket = process.env.R2_PRIVATE_BUCKET || fallback;
    const accountId = requireEnv('R2_ACCOUNT_ID', 'dummy-account');
    const accessKeyId = requireEnv('R2_ACCESS_KEY_ID', 'dummy-key');
    const secretAccessKey = requireEnv('R2_SECRET_ACCESS_KEY', 'dummy-secret');
    this.publicDomain = requireEnv(
      'R2_PUBLIC_DOMAIN',
      'https://dummy.public.domain',
    );

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /** Resolve which bucket to use based on the storage key prefix. */
  private getBucket(key: string): string {
    const type = key.split('/', 1)[0];
    return R2StorageAdapter.PUBLIC_TYPES.has(type)
      ? this.publicBucket
      : this.privateBucket;
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
      Bucket: this.getBucket(key),
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
      Bucket: this.getBucket(key),
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Get a permanent public URL for the given key.
   *
   * Uses the R2_PUBLIC_DOMAIN env var (e.g. "https://cdn.example.com"
   * or a custom domain). The URL is stable and does not expire — safe for
   * product images, avatars, SEO, social sharing, and CDN caching.
   *
   * NOTE: Only call this for keys that route to the public bucket.
   * For private-bucket items, use generateReadUrl() instead.
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
   * Routes to the correct bucket based on the key prefix.
   * If the key doesn't exist, R2 returns success (no-op).
   */
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.getBucket(key),
      Key: key,
    });

    await this.client.send(command);
  }
}

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value) {
    return value;
  }
  if (fallback !== undefined) {
    // Use fallback for non-production builds or missing env vars
    return fallback;
  }
  throw new Error(`Missing required environment variable: ${name}`);
}
