import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';
import { uploadProductPhoto } from '@/app/[locale]/seller/products/product-form-upload';

describe('uploadProductPhoto', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('compensates a failed storage upload by deleting its pending upload', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/uploads/presigned-url') {
        return Response.json(
          {
            id: 'upload-1',
            uploadUrl: 'https://uploads.example.com/upload-1',
            publicUrl: 'https://cdn.example.com/upload-1',
          },
          { status: 201 },
        );
      }
      if (url === 'https://uploads.example.com/upload-1') {
        return new Response(null, { status: 500 });
      }
      return Response.json({ success: true });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      uploadProductPhoto(
        new File(['photo'], 'photo.png', { type: 'image/png' }),
        'Photo 1',
        ProductImagePurpose.SHOWCASE,
      ),
    ).rejects.toThrow('File storage failed');

    expect(fetchMock).toHaveBeenCalledWith('/api/uploads/upload-1', {
      method: 'DELETE',
    });
  });
});
