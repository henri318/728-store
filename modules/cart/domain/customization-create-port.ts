import type { CustomizationSnapshot } from './customization-lookup-port';

export interface CustomizationCreatePort {
  create(input: {
    productId: string;
    text?: string | null;
    color?: string | null;
    size?: string | null;
    imageUrl?: string | null;
  }): Promise<CustomizationSnapshot>;
}
