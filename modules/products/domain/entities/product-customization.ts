export interface ProductCustomizationEntity {
  id: string;
  text: string | null;
  color: string | null;
  size: string | null;
  imageUrl: string | null;
  productId: string;
  createdAt: Date;
}
