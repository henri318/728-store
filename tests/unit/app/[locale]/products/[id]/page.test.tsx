import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ImgHTMLAttributes, ReactNode } from 'react';
import { ProductPrice } from '@/modules/products/domain/value-objects/product-price';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';

const mocks = vi.hoisted(() => {
  const getDictionaryMock = vi.fn();
  const getProductRepositoryMock = vi.fn();
  const notFoundMock = vi.fn();
  const resolveViewerContextMock = vi.fn();
  const productShowcaseGalleryMock = vi.fn(
    ({ items }: { items: Array<{ id: string }> }) => (
      <div data-testid="showcase-gallery">{items.length}</div>
    ),
  );
  const customizationExperienceMock = vi.fn(
    ({
      labels,
      designChangeDescription,
    }: {
      labels: {
        adding: string;
        added: string;
        error: string;
        customizationDesign: string;
        customizationPhrase: string;
      };
      viewerContext?: { canEdit: boolean; editHref: string | null };
      designChangeDescription?: string | null;
      sizes?: string[];
      publicMedia?: Array<{ id: string }>;
    }) => (
      <div data-testid="customization-experience">
        <span>{labels.adding}</span>
        <span>{labels.added}</span>
        <span>{labels.error}</span>
        {designChangeDescription ? <p>{designChangeDescription}</p> : null}
      </div>
    ),
  );
  return {
    getDictionaryMock,
    getProductRepositoryMock,
    notFoundMock,
    resolveViewerContextMock,
    productShowcaseGalleryMock,
    customizationExperienceMock,
  };
});

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  },
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  notFound: mocks.notFoundMock,
}));

vi.mock('@/shared/i18n/get-dictionary', () => ({
  getDictionary: mocks.getDictionaryMock,
}));

vi.mock('@/shared/authorization/product-viewer-context', () => ({
  resolveProductViewerContext: mocks.resolveViewerContextMock,
}));

vi.mock('@/composition-root/container', () => ({
  container: {
    getProductRepository: mocks.getProductRepositoryMock,
    getSession: () => ({
      getSession: vi.fn().mockResolvedValue(null),
    }),
  },
}));

vi.mock('@/app/[locale]/products/[id]/customization-experience', () => ({
  CustomizationExperience: mocks.customizationExperienceMock,
}));

vi.mock('@/app/[locale]/products/[id]/product-showcase-gallery', () => ({
  ProductShowcaseGallery: (props: { items: Array<{ id: string }> }) =>
    mocks.productShowcaseGalleryMock(props),
}));

import ProductDetailPage, {
  generateMetadata,
} from '@/app/[locale]/products/[id]/page';

describe('ProductDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDictionaryMock.mockResolvedValue({
      common: {
        home: 'Home',
        customizationPreview: 'Preview',
        soldBy: 'Sold by',
        productDetailsError: 'Error',
        noImageAvailable: 'Image not available',
        addToCart: 'Add to cart',
        removeFromCart: 'Remove from cart',
        addingToCart: 'Adding...',
        addedToCart: 'Added',
        cartError: 'Cart error',
        customizationDesignDesigner: 'Designer brief',
        customizationDesignCustomer: 'Customer brief',
        customizationPhraseDesigner: 'Designer phrase',
        customizationPhraseCustomer: 'Customer phrase',
      },
    });
  });

  it('passes the designer-owned viewer context and role-aware edit action to the purchase experience', async () => {
    mocks.resolveViewerContextMock.mockResolvedValue({
      viewerUserId: 'user-1',
      viewerRole: 'DESIGNER',
      isOwner: true,
      canEdit: true,
      editHref: '/es/seller/products/prod-1/edit',
    });
    mocks.getProductRepositoryMock.mockReturnValue({
      findById: vi.fn().mockResolvedValue({
        id: 'prod-1',
        basePrice: ProductPrice.create(25, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Test Shop',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        customizationConfig: null,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        updatedAt: new Date('2025-01-02T00:00:00.000Z'),
        translations: [
          {
            locale: 'es',
            name: 'Mug',
            description: 'Nice mug',
            designChangeDescription: 'The designer change description',
          },
        ],
        images: [],
        tags: [],
      }),
    });

    const element = await ProductDetailPage({
      params: Promise.resolve({ locale: 'es', id: 'prod-1' }),
    });
    render(element);

    const props = mocks.customizationExperienceMock.mock.calls[0][0] as {
      viewerContext: { canEdit: boolean; editHref: string };
      labels: { customizationDesign: string; customizationPhrase: string };
      designChangeDescription?: string | null;
    };
    expect(props.viewerContext).toMatchObject({
      canEdit: true,
      editHref: '/es/seller/products/prod-1/edit',
    });
    expect(props.labels.customizationDesign).toBe('Designer brief');
    expect(props.labels.customizationPhrase).toBe('Designer phrase');
    expect(props.designChangeDescription).toBe(
      'The designer change description',
    );
    expect(
      screen.getByText('The designer change description'),
    ).toBeInTheDocument();

    mocks.resolveViewerContextMock.mockResolvedValue({
      viewerUserId: 'customer-1',
      viewerRole: 'CUSTOMER',
      isOwner: false,
      canEdit: false,
      editHref: null,
    });
    const customerElement = await ProductDetailPage({
      params: Promise.resolve({ locale: 'es', id: 'prod-1' }),
    });
    render(customerElement);

    const customerProps = mocks.customizationExperienceMock.mock
      .calls[1][0] as {
      labels: { customizationDesign: string; customizationPhrase: string };
    };
    expect(customerProps.labels.customizationDesign).toBe('Customer brief');
    expect(customerProps.labels.customizationPhrase).toBe('Customer phrase');
  });

  it('passes only public media into the purchase card and keeps product meta out of the page shell', async () => {
    mocks.getProductRepositoryMock.mockReturnValue({
      findById: vi.fn().mockResolvedValue({
        id: 'prod-1',
        basePrice: ProductPrice.create(25, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Test Shop',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        customizationConfig: null,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        updatedAt: new Date('2025-01-02T00:00:00.000Z'),
        translations: [
          {
            locale: 'es',
            name: 'Mug',
            description: 'Nice mug',
            sizes: ['S', 'M'],
          },
        ],
        images: [
          {
            id: 'cover-1',
            url: 'https://assets.example.test/cover.jpg',
            alt: 'Mug cover',
            position: 0,
            purpose: ProductImagePurpose.COVER,
            mimeType: 'image/jpeg',
            posterUrl: null,
            productId: 'prod-1',
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
          },
          {
            id: 'showcase-1',
            url: 'https://assets.example.test/showcase.mp4',
            alt: 'Mug showcase',
            position: 1,
            purpose: ProductImagePurpose.SHOWCASE,
            mimeType: 'video/mp4',
            posterUrl: 'https://assets.example.test/poster.jpg',
            productId: 'prod-1',
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
          },
          {
            id: 'base-1',
            url: 'https://assets.example.test/base.jpg',
            alt: 'Base layer',
            position: 2,
            purpose: ProductImagePurpose.CUSTOMIZABLE_BASE,
            mimeType: 'image/jpeg',
            posterUrl: null,
            productId: 'prod-1',
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
          },
        ],
        tags: [],
      }),
    });

    const element = await ProductDetailPage({
      params: Promise.resolve({ locale: 'es', id: 'prod-1' }),
    });

    render(element);

    expect(screen.getByTestId('customization-experience')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mug' })).toBeNull();
    expect(screen.queryByText('Nice mug')).toBeNull();
    expect(screen.queryByText('Test Shop')).toBeNull();
    expect(screen.getByText('Adding...')).toBeInTheDocument();
    expect(screen.getByText('Added')).toBeInTheDocument();
    expect(screen.getByText('Cart error')).toBeInTheDocument();

    const props = mocks.customizationExperienceMock.mock.calls[0][0] as {
      labels: { adding: string; added: string; error: string };
      sizes: string[];
      publicMedia: Array<{ id: string }>;
    };
    expect(props.labels.adding).toBe('Adding...');
    expect(props.labels.added).toBe('Added');
    expect(props.labels.error).toBe('Cart error');
    expect(props.sizes).toEqual(['S', 'M']);
    expect(props.publicMedia).toHaveLength(2);
    expect(props.publicMedia[0].id).toBe('cover-1');
    expect(props.publicMedia[1].id).toBe('showcase-1');
  });

  it('passes an empty public-media list when the product has no cover or showcase media', async () => {
    mocks.getProductRepositoryMock.mockReturnValue({
      findById: vi.fn().mockResolvedValue({
        id: 'prod-1',
        basePrice: ProductPrice.create(25, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Test Shop',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        customizationConfig: null,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        updatedAt: new Date('2025-01-02T00:00:00.000Z'),
        translations: [{ locale: 'es', name: 'Mug', description: 'Nice mug' }],
        images: [],
        tags: [],
      }),
    });

    const element = await ProductDetailPage({
      params: Promise.resolve({ locale: 'es', id: 'prod-1' }),
    });

    render(element);

    const props = mocks.customizationExperienceMock.mock
      .calls[0][0] as unknown as {
      publicMedia: Array<{ id: string }>;
    };

    expect(props.publicMedia).toEqual([]);
  });

  it('generates localized product metadata with canonical, alternates, and absolute cover image', async () => {
    mocks.getProductRepositoryMock.mockReturnValue({
      findById: vi.fn().mockResolvedValue({
        id: 'prod-1',
        basePrice: ProductPrice.create(25, Currency.EUR),
        sellerId: 'seller-1',
        sellerName: 'Test Shop',
        status: ProductStatus.ACTIVE,
        categoryId: null,
        category: null,
        customizationConfig: null,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        updatedAt: new Date('2025-01-02T00:00:00.000Z'),
        translations: [{ locale: 'es', name: 'Mug', description: 'Nice mug' }],
        images: [
          {
            id: 'cover-1',
            url: '/products/mug.jpg',
            alt: 'Mug cover',
            position: 0,
            purpose: ProductImagePurpose.COVER,
            mimeType: 'image/jpeg',
            posterUrl: null,
            productId: 'prod-1',
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
          },
        ],
        tags: [],
      }),
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'es', id: 'prod-1' }),
    });

    expect(metadata).toMatchObject({
      title: 'Mug',
      description: 'Nice mug',
      alternates: {
        canonical: 'http://localhost:3000/es/products/prod-1',
        languages: {
          es: 'http://localhost:3000/es/products/prod-1',
          ca: 'http://localhost:3000/cat/products/prod-1',
          'x-default': 'http://localhost:3000/es/products/prod-1',
        },
      },
      openGraph: {
        url: 'http://localhost:3000/es/products/prod-1',
        images: ['http://localhost:3000/products/mug.jpg'],
      },
      twitter: {
        card: 'summary_large_image',
        images: ['http://localhost:3000/products/mug.jpg'],
      },
    });
    expect(mocks.getProductRepositoryMock().findById).toHaveBeenCalledWith(
      'prod-1',
      'es',
      'public',
    );
  });

  it('calls notFound when the product is missing from the public catalog', async () => {
    mocks.notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
    mocks.getProductRepositoryMock.mockReturnValue({
      findById: vi.fn().mockResolvedValue(null),
    });

    await expect(
      ProductDetailPage({
        params: Promise.resolve({ locale: 'es', id: 'missing-product' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mocks.notFoundMock).toHaveBeenCalledOnce();
  });

  it('calls notFound when loading the public product fails', async () => {
    mocks.notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
    mocks.getProductRepositoryMock.mockReturnValue({
      findById: vi.fn().mockRejectedValue(new Error('Database unavailable')),
    });

    await expect(
      ProductDetailPage({
        params: Promise.resolve({ locale: 'es', id: 'unavailable-product' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mocks.notFoundMock).toHaveBeenCalledOnce();
  });
});
