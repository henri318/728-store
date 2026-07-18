import { ValidationError } from '@/shared/kernel/app-error';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import type { PaidOrderCountPort } from '../domain/paid-order-count-port';
import {
  GetCartViewUseCase,
  type CartViewItem,
  type GetCartViewDTO,
} from './get-cart-view-use-case';

const FIRST_PURCHASE_DISCOUNT_RATE = 0.1;
const SHIPPING_COST = 3.99;

export interface SellerCartGroup {
  sellerId: string;
  sellerName: string;
  items: CartViewItem[];
  subtotal: number;
}

export interface CheckoutViewData {
  items: CartViewItem[];
  sellerGroups: SellerCartGroup[];
  currency: Currency;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  isFirstPurchase: boolean;
  discountRate: number;
  hasMissingCustomizations: boolean;
}

export class GetCheckoutViewUseCase {
  constructor(
    private readonly getCartView: GetCartViewUseCase,
    private readonly paidOrderCount: PaidOrderCountPort,
  ) {}

  async execute(dto: GetCartViewDTO): Promise<CheckoutViewData> {
    const { items } = await this.getCartView.execute(dto);
    if (items.length === 0) return emptyCheckoutView();

    const currency = items[0].currency;
    if (items.some((item) => item.currency !== currency)) {
      throw new ValidationError('Cart items must have the same currency');
    }

    const sellerGroups = groupBySeller(items);
    const subtotal = round2(
      items.reduce((total, item) => total + item.lineTotal, 0),
    );
    const isFirstPurchase =
      (await this.paidOrderCount.countPaidOrdersByUserId(dto.userId)) === 0;
    const discount = isFirstPurchase
      ? round2(subtotal * FIRST_PURCHASE_DISCOUNT_RATE)
      : 0;
    const shipping = SHIPPING_COST;

    return {
      items,
      sellerGroups,
      currency,
      subtotal,
      discount,
      shipping,
      total: round2(subtotal - discount + shipping),
      isFirstPurchase,
      discountRate: FIRST_PURCHASE_DISCOUNT_RATE,
      hasMissingCustomizations: items.some(
        (item) => item.hasMissingCustomizations,
      ),
    };
  }
}

function groupBySeller(items: CartViewItem[]): SellerCartGroup[] {
  const groups = new Map<string, SellerCartGroup>();
  for (const item of items) {
    let group = groups.get(item.sellerId);
    if (!group) {
      group = {
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        items: [],
        subtotal: 0,
      };
      groups.set(item.sellerId, group);
    }
    group.items.push(item);
    group.subtotal = round2(group.subtotal + item.lineTotal);
  }
  return groups.values().toArray();
}

function emptyCheckoutView(): CheckoutViewData {
  return {
    items: [],
    sellerGroups: [],
    currency: Currency.EUR,
    subtotal: 0,
    discount: 0,
    shipping: SHIPPING_COST,
    total: SHIPPING_COST,
    isFirstPurchase: false,
    discountRate: FIRST_PURCHASE_DISCOUNT_RATE,
    hasMissingCustomizations: false,
  };
}

function round2(value: number): number {
  return +value.toFixed(2);
}
