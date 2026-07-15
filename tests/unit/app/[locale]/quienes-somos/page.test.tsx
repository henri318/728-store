import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';

type NextImageTestProps = ImgHTMLAttributes<HTMLImageElement> & {
  priority?: boolean;
};

const mocks = vi.hoisted(() => ({
  getDictionaryMock: vi.fn(),
}));

vi.mock('next/image', () => ({
  default: ({ priority: _priority, ...props }: NextImageTestProps) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  },
}));

vi.mock('@/shared/i18n/get-dictionary', () => ({
  getDictionary: mocks.getDictionaryMock,
}));

import AboutPage, { generateMetadata } from '@/app/[locale]/quienes-somos/page';

describe('AboutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDictionaryMock.mockResolvedValue({
      common: {
        aboutTitle: 'Al taller...',
        aboutDescription:
          'Cada regalo nace con un propósito: crear conexiones a través de los pequeños detalles.',
        aboutStory:
          'Cuidamos cada creación para que transmita una historia y se convierta en un recuerdo duradero.',
        aboutSlogan: 'Detalles que conectan.',
        aboutImageAlt: 'Taza personalizada de Sant Jordi',
        aboutMetaTitle: 'Quiénes somos',
        aboutMetaDescription:
          'Conoce el taller de 728studio y los detalles personalizados que crean conexiones.',
      },
    });
  });

  it('renders the localized editorial content and decorative product image', async () => {
    const element = await AboutPage({
      params: Promise.resolve({ locale: 'es' }),
    });

    render(element);

    expect(
      screen.getByRole('heading', { name: 'Al taller...' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Detalles que conectan.')).toBeInTheDocument();
    expect(
      screen.getByAltText('Taza personalizada de Sant Jordi'),
    ).toHaveAttribute('src', '/img/decorations/Al-Taller.webp');
  });

  it('generates a localized canonical and language alternates', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'cat' }),
    });

    expect(metadata).toMatchObject({
      title: 'Quiénes somos',
      description:
        'Conoce el taller de 728studio y los detalles personalizados que crean conexiones.',
      alternates: {
        canonical: 'http://localhost:3000/cat/quienes-somos',
        languages: {
          es: 'http://localhost:3000/es/quienes-somos',
          ca: 'http://localhost:3000/cat/quienes-somos',
          'x-default': 'http://localhost:3000/es/quienes-somos',
        },
      },
      openGraph: {
        url: 'http://localhost:3000/cat/quienes-somos',
      },
    });
  });
});
