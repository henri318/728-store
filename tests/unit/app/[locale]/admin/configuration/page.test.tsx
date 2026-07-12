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
      submitSave: 'Save',
      edit: 'Edit',
      cancel: 'Cancel',
      confirmDelete: 'Delete this category?',
      updateError: 'Update error',
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
        if (init?.method === 'DELETE') return Response.json({ success: true });
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
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Categories' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Manage categories')).not.toBeInTheDocument();
    expect(screen.getByText('Electrònica')).toBeInTheDocument();
    expect(screen.getByText('Roba')).toBeInTheDocument();
    expect(screen.getByLabelText('Spanish')).toBeInTheDocument();
    expect(screen.getByLabelText('Catalan')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Spanish'), {
      target: { value: 'Electrónica nueva' },
    });
    fireEvent.change(screen.getByLabelText('Catalan'), {
      target: { value: 'Electrònica nova' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/categories',
        expect.objectContaining({ body: expect.stringContaining('nameEs') }),
      ),
    );
    expect(screen.getByLabelText('Spanish')).toHaveValue('');
    expect(screen.getByLabelText('Catalan')).toHaveValue('');
    expect(screen.getByText('Electrònica nova')).toBeInTheDocument();
  });

  it('rejects a submission when only one locale is filled', async () => {
    const repo = {
      findAll: vi.fn(async () => []),
    };
    mocks.getCategoryRepositoryMock.mockReturnValue(repo);
    render(
      await AdminConfigurationPage({
        params: Promise.resolve({ locale: 'es' }),
      }),
    );
    fireEvent.change(screen.getByLabelText('Spanish'), {
      target: { value: 'Ropa' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Both names required');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('supports inline save plus confirmed delete', async () => {
    const repo = {
      findAll: vi.fn(async () => [category('ropa', 'Ropa', 'Roba')]),
    };
    mocks.getCategoryRepositoryMock.mockReturnValue(repo);
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    render(
      await AdminConfigurationPage({
        params: Promise.resolve({ locale: 'es' }),
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(
      screen.getByRole('group', { name: 'Category actions' }),
    ).toBeInTheDocument();
    expect(screen.getAllByLabelText('Spanish')[1].tagName).toBe('INPUT');
    fireEvent.change(screen.getAllByLabelText('Spanish')[1], {
      target: { value: 'Hogar' },
    });
    fireEvent.change(screen.getAllByLabelText('Catalan')[1], {
      target: { value: 'Llar' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/categories/ropa',
        expect.objectContaining({ method: 'PATCH' }),
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Delete' }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/categories/ropa',
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
  });

  it('shows the update-specific localized error when editing fails', async () => {
    const repo = {
      findAll: vi.fn(async () => [category('ropa', 'Ropa', 'Roba')]),
    };
    mocks.getCategoryRepositoryMock.mockReturnValue(repo);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input, init) => {
        if (init?.method === 'PATCH')
          return new Response(null, { status: 409 });
        return Response.json({ success: true });
      }),
    );
    render(
      await AdminConfigurationPage({
        params: Promise.resolve({ locale: 'es' }),
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Update error'),
    );
  });
});
