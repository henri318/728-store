import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { CategoryEntity } from '@/modules/products/domain/entities/category';

const refreshMock = vi.fn();
const mocks = vi.hoisted(() => ({
  requireAdminMock: vi.fn(async () => {}),
  getDictionaryMock: vi.fn(),
  getCategoryRepositoryMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));
vi.mock('@/shared/authorization/require-admin', () => ({
  requireAdmin: mocks.requireAdminMock,
}));
vi.mock('@/shared/i18n/get-dictionary', () => ({
  getDictionary: mocks.getDictionaryMock,
}));
vi.mock('@/composition-root/container', () => ({
  container: { getCategoryRepository: mocks.getCategoryRepositoryMock },
}));

import AdminConfigurationPage from '@/app/[locale]/admin/configuration/page';

const category = (id: string, es: string, cat: string): CategoryEntity => ({
  id,
  slug: id,
  parentId: null,
  createdAt: new Date(),
  translations: [
    { locale: 'es', name: es },
    { locale: 'cat', name: cat },
  ],
});
const dictionary = () => ({
  common: { remove: 'Remove', required: 'Required', genericError: 'Error' },
  admin: {
    configuration: {
      title: 'Categories',
      description: 'Manage categories',
      label: 'Categories',
      placeholder: '',
      addLabel: 'Add',
      emptyLabel: 'Empty',
      delete: 'Delete',
      createError: 'Create error',
      deleteError: 'Delete error',
      validationError: 'Validation error',
      duplicateError: 'Duplicate',
      inUseError: 'In use',
      nameEsLabel: 'Spanish',
      nameCatLabel: 'Catalan',
      nameEsPlaceholder: 'Spanish name',
      nameCatPlaceholder: 'Catalan name',
      missingBothError: 'Both names required',
      missingOneError: 'Both names required',
    },
  },
});

describe('AdminConfigurationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDictionaryMock.mockResolvedValue(dictionary());
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input, init) => {
        const body = JSON.parse(String(init?.body ?? '{}'));
        return Response.json(
          {
            id: 'new',
            slug: 'new',
            parentId: null,
            createdAt: new Date().toISOString(),
            translations: [
              { locale: 'es', name: body.nameEs },
              { locale: 'cat', name: body.nameCat },
            ],
          },
          { status: 201 },
        );
      }),
    );
  });

  it('uses findAll, canonical locale display, active-locale ordering, and bilingual creation', async () => {
    const repo = {
      findAll: vi.fn(async () => [
        category('ropa', 'Ropa', 'Roba'),
        category('electronics', 'Electrónica', 'Electrònica'),
      ]),
    };
    mocks.getCategoryRepositoryMock.mockReturnValue(repo);
    render(
      await AdminConfigurationPage({
        params: Promise.resolve({ locale: 'cat' }),
      }),
    );

    expect(repo.findAll).toHaveBeenCalledOnce();
    expect(screen.getByText('Electrònica')).toBeInTheDocument();
    expect(screen.getByText('Roba')).toBeInTheDocument();
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Electrònica' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Catalan' }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Electrònica' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/categories',
        expect.objectContaining({ body: expect.stringContaining('nameEs') }),
      ),
    );
    expect(screen.getByRole('textbox')).toHaveValue('');
    fireEvent.click(screen.getByRole('tab', { name: 'Spanish' }));
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('rejects a submission when only one locale is filled', async () => {
    const repo = { findAll: vi.fn(async () => []) };
    mocks.getCategoryRepositoryMock.mockReturnValue(repo);
    render(
      await AdminConfigurationPage({
        params: Promise.resolve({ locale: 'es' }),
      }),
    );
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Ropa' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Both names required');
    expect(fetch).not.toHaveBeenCalled();
  });
});
