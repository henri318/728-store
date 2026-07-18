export interface SellerOwnershipLookupPort {
  findSellerIdByUserId(userId: string): Promise<string | null>;
}
