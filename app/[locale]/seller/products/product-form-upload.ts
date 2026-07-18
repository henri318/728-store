import { UploadType } from '@/modules/uploads/domain/value-objects/upload-type';
import { toAbsoluteUrl } from '@/shared/presentation/lib/to-absolute-url';
import type { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';
import type { ProductPhotoDraft } from './product-photo-gallery';
import { normalizePhotoName } from './product-form-image-helpers';

export async function uploadProductPhoto(
  file: File,
  defaultName: string,
  purpose: ProductImagePurpose,
): Promise<ProductPhotoDraft> {
  const response = await fetch('/api/uploads/presigned-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: UploadType.product,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    }),
  });
  if (!response.ok) {
    let detail = 'Upload failed';
    try {
      const body = await response.json();
      if (body.error) detail = body.error;
    } catch {
      // The generic upload message preserves the existing fallback behavior.
    }
    throw new Error(detail);
  }

  const result = (await response.json()) as {
    id: string;
    uploadUrl: string;
    publicUrl: string;
  };
  const uploadResponse = await fetch(result.uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': file.type },
    body: file,
  });
  if (!uploadResponse.ok) throw new Error('File storage failed');

  return {
    id: result.id,
    url: toAbsoluteUrl(result.publicUrl),
    alt: normalizePhotoName(
      file.name.replace(/\.[^.]+$/, '').replaceAll(/[-_]+/g, ' '),
      defaultName,
    ),
    size: file.size,
    purpose,
    mimeType: file.type,
    posterUrl: null,
  };
}
