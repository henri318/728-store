export interface SellerLookupPort {
  findByUserId(userId: string): Promise<SellerLookupSnapshot | null>;
}

export interface SellerLookupSnapshot {
  sellerId: string;
}
