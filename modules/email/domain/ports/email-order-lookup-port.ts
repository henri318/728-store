export interface EmailOrderLookupSnapshot {
  email: string;
  firstName: string;
  locale: string;
}

export interface EmailOrderSummary {
  orderNumber: string;
  total: number;
  currency: string;
  itemsCount: number;
}

export interface EmailOrderLookupPort {
  findBuyerContextByOrderId(
    orderId: string,
  ): Promise<EmailOrderLookupSnapshot | null>;
  getSummaryForEmail(orderId: string): Promise<EmailOrderSummary | null>;
}
