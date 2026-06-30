export interface SeedProductImageData {
  url: string;
  alt: string;
  position: number;
}

export interface SeedProductCustomizationConfigData {
  mode: 'description' | 'text' | 'photo' | 'text_photo';
  previewEnabled: boolean;
  previewTemplateUrl: string | null;
  textOffset: {
    x: number;
    y: number;
    rotate?: number;
    scale?: number;
    maxWidth?: number;
  } | null;
  imageOffset: {
    x: number;
    y: number;
    rotate?: number;
    scale?: number;
    maxWidth?: number;
  } | null;
}

export interface SeedProductData {
  basePrice: number;
  currency: 'EUR';
  sellerId: string;
  status: 'ACTIVE';
  customizationConfig: SeedProductCustomizationConfigData;
  translations: {
    create: Array<{
      locale: 'es' | 'cat' | 'en';
      name: string;
      description: string;
    }>;
  };
  images: {
    create: SeedProductImageData[];
  };
}

function getProductAssetUrl(path: string): string {
  const baseUrl =
    process.env.SEED_PRODUCT_ASSET_BASE_URL ??
    process.env.NEXT_PUBLIC_PRODUCT_ASSET_BASE_URL ??
    'http://localhost:8081';

  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

export function buildSeedProducts(sellerId: string): SeedProductData[] {
  const mugImageUrl = getProductAssetUrl('/products/taza.png');

  return [
    {
      basePrice: 25,
      currency: 'EUR',
      sellerId,
      status: 'ACTIVE',
      customizationConfig: {
        mode: 'text_photo',
        previewEnabled: true,
        previewTemplateUrl: '/img/products/customizable-tshirt.svg',
        textOffset: { x: 118, y: 186, maxWidth: 220 },
        imageOffset: { x: 96, y: 124, scale: 0.9 },
      },
      translations: {
        create: [
          {
            locale: 'es',
            name: 'Camiseta Personalizada',
            description: 'Diseñá tu propia remera con estilo.',
          },
          {
            locale: 'cat',
            name: 'Samarreta Personalitzada',
            description: 'Dissenya la teva pròpia samarreta amb estil.',
          },
          {
            locale: 'en',
            name: 'Custom T-Shirt',
            description: 'Design your own custom tee with style.',
          },
        ],
      },
      images: {
        create: [
          {
            url: '/img/products/customizable-tshirt.svg',
            alt: 'Camiseta Personalizada',
            position: 0,
          },
        ],
      },
    },
    {
      basePrice: 15,
      currency: 'EUR',
      sellerId,
      status: 'ACTIVE',
      customizationConfig: {
        mode: 'text_photo',
        previewEnabled: true,
        previewTemplateUrl: mugImageUrl,
        textOffset: { x: 76, y: 146, rotate: -2 },
        imageOffset: { x: 102, y: 110, scale: 0.72 },
      },
      translations: {
        create: [
          {
            locale: 'es',
            name: 'Taza Personalizada',
            description: 'Café con estilo, personalizá tu taza.',
          },
          {
            locale: 'cat',
            name: 'Tassa Personalitzada',
            description: 'Cafè amb estil, personalitza la teva tassa.',
          },
          {
            locale: 'en',
            name: 'Custom Mug',
            description: 'Coffee with style, customize your mug.',
          },
        ],
      },
      images: {
        create: [
          {
            url: mugImageUrl,
            alt: 'Taza Personalizada',
            position: 0,
          },
        ],
      },
    },
    {
      basePrice: 45,
      currency: 'EUR',
      sellerId,
      status: 'ACTIVE',
      customizationConfig: {
        mode: 'description',
        previewEnabled: false,
        previewTemplateUrl: null,
        textOffset: null,
        imageOffset: null,
      },
      translations: {
        create: [
          {
            locale: 'es',
            name: 'Sudadera con Capucha',
            description: 'Cómoda, única y personalizable.',
          },
          {
            locale: 'cat',
            name: 'Dessuadora amb Caputxa',
            description: 'Còmoda, única i personalitzable.',
          },
          {
            locale: 'en',
            name: 'Custom Hoodie',
            description: 'Comfortable, unique, and ready for personalization.',
          },
        ],
      },
      images: {
        create: [
          {
            url: '/img/products/customizable-hoodie.svg',
            alt: 'Sudadera con Capucha',
            position: 0,
          },
        ],
      },
    },
  ];
}
