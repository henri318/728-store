/**
 * StoragePort — the seam between upload use cases and the
 * concrete storage backend (R2).
 *
 * Use cases depend on this port, NOT on the R2 adapter directly.
 * The adapter implements this port in infrastructure.
 */
export interface StoragePort {
  /**
   * Generate a presigned upload URL for the given key.
   * The client uses this URL to PUT the file directly to R2.
   */
  generateUploadUrl(
    key: string,
    contentType: string,
    expiresIn?: number,
  ): Promise<string>;

  /**
   * Generate a presigned read URL for the given key.
   * Used to serve files to clients.
   */
  generateReadUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Get a permanent public URL for the given key.
   * Used for product images and avatars where presigned URLs
   * would break SEO, social sharing, and CDN caching.
   * This is synchronous — no network call needed.
   */
  getPublicUrl(key: string): string;

  /**
   * Delete an object from storage by key.
   */
  delete(key: string): Promise<void>;
}
