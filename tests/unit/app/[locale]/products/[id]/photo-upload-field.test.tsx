import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fireEvent, waitFor } from '@testing-library/react';
import { PhotoUploadField } from '@/app/[locale]/products/[id]/photo-upload-field';

describe('PhotoUploadField', () => {
  it('rejects unsupported file types before calling the upload handler', async () => {
    const onUpload = vi.fn();

    render(
      <PhotoUploadField
        label="Upload image"
        replaceLabel="Replace image"
        removeLabel="Remove image"
        invalidImageLabel="Please upload a PNG or JPEG image."
        imageTooLargeLabel="The image is too large."
        onUpload={onUpload}
        value={null}
        onRemove={vi.fn()}
      />,
    );

    const input = screen.getByLabelText('Upload image');
    const file = new File(['bmp'], 'photo.bmp', { type: 'image/bmp' });
    Object.defineProperty(input, 'files', { value: [file] });
    fireEvent.change(input);

    expect(onUpload).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(
        screen.getByText('Please upload a PNG or JPEG image.'),
      ).toBeTruthy();
    });
  });

  it('calls the upload handler for valid images and shows the replacement control', async () => {
    const onUpload = vi.fn(async () => ({
      imageUploadId: 'upload-1',
      imageUrl: '/preview.png',
    }));

    render(
      <PhotoUploadField
        label="Upload image"
        replaceLabel="Replace image"
        removeLabel="Remove image"
        invalidImageLabel="Please upload a PNG or JPEG image."
        imageTooLargeLabel="The image is too large."
        onUpload={onUpload}
        value="/preview.png"
        onRemove={vi.fn()}
      />,
    );

    const input = screen.getByLabelText('Replace image');
    const file = new File(['png'], 'photo.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { value: [file] });
    fireEvent.change(input);

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(file);
    });
    expect(screen.getByRole('button', { name: 'Remove image' })).toBeTruthy();
  });
});
