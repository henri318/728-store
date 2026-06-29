import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useTransition: () => [true, vi.fn()] as const,
  };
});

import { PhotoUploadField } from '@/app/[locale]/products/[id]/photo-upload-field';

describe('PhotoUploadField accessibility', () => {
  it('announces upload progress in a polite status region', () => {
    render(
      <PhotoUploadField
        label="Upload image"
        replaceLabel="Replace image"
        removeLabel="Remove image"
        invalidImageLabel="Please upload a PNG or JPEG image."
        imageTooLargeLabel="The image is too large."
        onUpload={vi.fn(async () => ({
          imageUploadId: 'upload-1',
          imageUrl: '/preview.png',
        }))}
        value={null}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByRole('status').textContent).toBe('Uploading...');
  });
});
