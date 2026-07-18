import type { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';
import type {
  ProductCustomizationConfigInput,
  ProductTranslationInput,
} from '@/modules/products/presentation/schemas/product-form-schema';
import type { ProductFormLabels } from '@/modules/products/presentation/product-form-labels';
import type { ProductLocale } from '@/modules/products/presentation/components/product-locale-tabs';
import type { ProductTranslationDraft } from '@/modules/products/presentation/components/product-translation-section';
import type { ProductPhotoDraft } from './product-photo-gallery';

export type ProductFormMode = 'create' | 'edit';
export type SupportedLocale = ProductLocale;

export interface LocaleTranslationState extends ProductTranslationDraft {
  locale: SupportedLocale;
}

export type TranslationMap = Record<SupportedLocale, LocaleTranslationState>;

export interface CategoryOption {
  id: string;
  name: string;
}

export interface ProductFormImageSeed {
  id?: string;
  url: string;
  alt: string | null;
  purpose?: ProductImagePurpose;
  mimeType?: string;
  posterUrl?: string | null;
}

interface ProductFormImageBucketsSeed {
  cover: ProductFormImageSeed | null;
  showcase: ProductFormImageSeed[];
  customizableBase: ProductFormImageSeed[];
}

export type ProductFormImageSeeds =
  ProductFormImageSeed[] | ProductFormImageBucketsSeed;

export type ProductFormModeProps =
  { mode: 'create'; productId?: never } | { mode: 'edit'; productId: string };

export interface ProductFormBaseProps {
  locale: string;
  initialValues: {
    price: number;
    name?: string;
    description?: string;
    translation?: ProductTranslationInput;
    translations?: LocaleTranslationState[];
    customizationConfig: ProductCustomizationConfigInput;
    images: ProductFormImageSeeds;
  };
  labels: ProductFormLabels;
  categories?: CategoryOption[];
}

export type ProductFormProps = ProductFormBaseProps & ProductFormModeProps;

export interface ProductPhotoBucketsState {
  cover: ProductPhotoDraft | null;
  showcase: ProductPhotoDraft[];
  customizableBase: ProductPhotoDraft[];
}

export type ProductPhotoBucket = keyof ProductPhotoBucketsState;

export interface FormState {
  price: string;
  activeLocale: SupportedLocale;
  translations: TranslationMap;
  customizationConfig: ProductCustomizationConfigInput;
  images: ProductPhotoBucketsState;
  selectedPhotoId: string | null;
}

export interface FormErrors {
  general?: string;
  name?: string;
  description?: string;
  price?: string;
  images?: string;
  customizationConfig?: string;
}
