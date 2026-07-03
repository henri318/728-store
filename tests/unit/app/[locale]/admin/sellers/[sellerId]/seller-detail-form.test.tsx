import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { SellerDetailForm } from '@/modules/sellers/presentation/components/seller-detail-form';

const fetchMock = vi.fn();

describe('SellerDetailForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the network error when submission fails before reaching the API', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    render(
      <SellerDetailForm
        sellerId="seller-1"
        nameLabel="Business name"
        descriptionLabel="Description"
        saveLabel="Save"
        savedLabel="Saved"
        errorLabel="Failed to save seller"
        initialName="Test Shop"
        initialDescription="Test description"
      />,
    );

    fireEvent.submit(
      (screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).form!,
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    });
  });

  it('shows the API error text when the response is not ok', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      text: async () => JSON.stringify({ error: 'Validation failed' }),
    } as Response);

    render(
      <SellerDetailForm
        sellerId="seller-1"
        nameLabel="Business name"
        descriptionLabel="Description"
        saveLabel="Save"
        savedLabel="Saved"
        errorLabel="Failed to save seller"
        initialName="Test Shop"
        initialDescription="Test description"
      />,
    );

    fireEvent.submit(
      (screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).form!,
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Validation failed');
    });
  });

  it('clears the previous error after a successful resubmit', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        text: async () => JSON.stringify({ error: 'Validation failed' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      } as Response);

    render(
      <SellerDetailForm
        sellerId="seller-1"
        nameLabel="Business name"
        descriptionLabel="Description"
        saveLabel="Save"
        savedLabel="Saved"
        errorLabel="Failed to save seller"
        initialName="Test Shop"
        initialDescription="Test description"
      />,
    );

    fireEvent.submit(
      (screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).form!,
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Validation failed');
    });

    fireEvent.submit(
      (screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).form!,
    );

    await waitFor(() => {
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getByRole('status')).toHaveTextContent('Saved');
    });
  });

  it('keeps the submit button in loading state until the request settles', async () => {
    let resolveFetch!: (value: Response) => void;
    const pendingFetch = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });

    fetchMock.mockReturnValueOnce(pendingFetch as Promise<Response>);

    render(
      <SellerDetailForm
        sellerId="seller-1"
        nameLabel="Business name"
        descriptionLabel="Description"
        saveLabel="Save"
        savedLabel="Saved"
        errorLabel="Failed to save seller"
        initialName="Test Shop"
        initialDescription="Test description"
      />,
    );

    fireEvent.submit(
      (screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).form!,
    );

    expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled();

    await act(async () => {
      resolveFetch({
        ok: true,
        text: async () => '',
      } as Response);
    });

    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });
});
