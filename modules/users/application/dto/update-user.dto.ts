import type { UserAddressInput } from '../../domain/user-address';

export interface UpdateUserDTO {
  userId: string;
  firstName?: string;
  lastName?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  } | null;
  fullAddress?: UserAddressInput | null;
}
