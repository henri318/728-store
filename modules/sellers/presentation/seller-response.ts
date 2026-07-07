import { SellerStatus } from '@/modules/sellers/domain/seller-status';

export function toSellerResponse(seller: {
  sellerId: { value: string };
  name: string;
  description: string | null;
  userId: string;
  status: SellerStatus;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: seller.sellerId.value,
    name: seller.name,
    description: seller.description,
    userId: seller.userId,
    status: seller.status,
    createdAt: seller.createdAt.toISOString(),
    updatedAt: seller.updatedAt.toISOString(),
  };
}
