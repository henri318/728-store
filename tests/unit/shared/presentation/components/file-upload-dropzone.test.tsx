import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FileUploadDropzone } from '@/shared/ui/file-upload-dropzone';

describe('FileUploadDropzone', () => {
  it('renders a full dropzone with selectable files and removable items', async () => {
    const onFilesSelected = vi.fn();
    const onRemoveItem = vi.fn();

    render(
      <FileUploadDropzone
        title="Product photos"
        helpText="Upload the pictures that sellers can use in the catalog."
        buttonLabel="Add files"
        removeLabel="Remove"
        items={[
          { id: 'f-1', name: 'mug-red.png', size: 2048 },
          { id: 'f-2', name: 'mug-blue.png', size: 4096 },
        ]}
        multiple
        accept="image/png,image/jpeg"
        onFilesSelected={onFilesSelected}
        onRemoveItem={onRemoveItem}
      />,
    );

    const input = screen.getByLabelText('Add files');
    const file = new File(['red'], 'mug-green.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFilesSelected).toHaveBeenCalledWith([file]);
    expect(screen.getByText('mug-red.png')).toBeTruthy();
    expect(screen.getByText('2 KB')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Remove mug-blue.png' }),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove mug-blue.png' }),
    );
    expect(onRemoveItem).toHaveBeenCalledWith('f-2');
  });

  it('renders the compact variant for single-file uploads', () => {
    render(
      <FileUploadDropzone
        title="Preview template"
        buttonLabel="Choose file"
        removeLabel="Remove"
        items={[{ id: 'template', name: 'mockup.png' }]}
        variant="compact"
        onFilesSelected={vi.fn()}
        onRemoveItem={vi.fn()}
      />,
    );

    expect(screen.getByText('Preview template')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Remove mockup.png' }),
    ).toBeTruthy();
  });
});
