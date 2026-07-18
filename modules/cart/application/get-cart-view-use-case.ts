import type { Currency } from '@/shared/kernel/domain/value-objects/currency';
import type { CartRepository } from '../domain/cart-repository';
import type { CustomizationLookupPort } from '../domain/customization-lookup-port';
import type { ProductRepository } from '../domain/product-repository';
import { GetCart } from './get-cart';

export interface GetCartViewDTO {
  userId: string;
  locale: string;
  unknownProductName: string;
  unknownSellerName: string;
}

export interface CartCustomizationView {
  id: string;
  text: string | null;
  color: string | null;
  size: string | null;
  imageUrl: string | null;
  designPosition: {
    imageUrl: string;
    x: number;
    y: number;
    scale: number;
    rotation_deg: number;
    opacity: number;
    blend_mode: string;
  } | null;
}

export interface CartViewItem {
  id: string;
  productId: string;
  productName: string;
  productImageUrl: string | null;
  sellerId: string;
  sellerName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  currency: Currency;
  customizationIdList: string[];
  customization: Omit<CartCustomizationView, 'id'> & {
    imageUploadId: null;
    colorImageUrl: string | null;
  };
  customizations: CartCustomizationView[];
  hasMissingCustomizations: boolean;
}

export interface CartViewData {
  items: CartViewItem[];
}

export class GetCartViewUseCase {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly productRepository: ProductRepository,
    private readonly customizationLookup: CustomizationLookupPort,
  ) {}

  private async lookupCustomizations(ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    return uniqueIds.length === 0
      ? []
      : this.customizationLookup.findByIds(uniqueIds);
  }

  async execute(dto: GetCartViewDTO): Promise<CartViewData> {
    const cart = await new GetCart(this.cartRepository).execute(dto.userId);
    if (cart.items.length === 0) return { items: [] };

    const productIds = new Map(
      cart.items.map((item) => [item.productId.value, item.productId]),
    )
      .values()
      .toArray();
    const [products, customizationSnapshots] = await Promise.all([
      this.productRepository.findByIds(productIds, dto.locale),
      this.lookupCustomizations(
        cart.items.flatMap((item) => item.customizationIdList),
      ),
    ]);
    const customizations = new Map(
      customizationSnapshots.map((customization) => [
        customization.id,
        customization,
      ]),
    );

    return {
      items: cart.items.map((item) => {
        const product = products.get(item.productId.value);
        const itemCustomizations = item.customizationIdList
          .map((id) => customizations.get(id))
          .filter(
            (
              customization,
            ): customization is NonNullable<typeof customization> =>
              Boolean(customization),
          )
          .map((customization) => ({
            id: customization.id,
            text: customization.text,
            color: customization.color,
            size: customization.size,
            imageUrl: customization.imageUrl,
            designPosition: customization.designPosition,
          }));
        const firstCustomization = itemCustomizations[0];

        return {
          id: item.id,
          productId: item.productId.value,
          productName: product?.displayName || dto.unknownProductName,
          productImageUrl: product?.imageUrl ?? null,
          sellerId: item.sellerId.value,
          sellerName: product?.sellerName || dto.unknownSellerName,
          quantity: item.quantity,
          unitPrice: item.unitPriceSnapshot.amount,
          lineTotal: +(item.unitPriceSnapshot.amount * item.quantity).toFixed(
            2,
          ),
          currency: item.unitPriceSnapshot.currency,
          customizationIdList: item.customizationIdList,
          customization: {
            text: firstCustomization?.text ?? null,
            color: firstCustomization?.color ?? null,
            size: firstCustomization?.size ?? null,
            imageUrl: firstCustomization?.imageUrl ?? null,
            imageUploadId: null,
            colorImageUrl:
              product?.images?.find(
                (image) => image.alt === firstCustomization?.color,
              )?.url ?? null,
            designPosition: firstCustomization?.designPosition ?? null,
          },
          customizations: itemCustomizations,
          hasMissingCustomizations:
            item.customizationIdList.length !== itemCustomizations.length,
        };
      }),
    };
  }
}
