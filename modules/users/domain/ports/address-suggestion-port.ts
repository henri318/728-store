import type { UserAddressInput } from '../user-address';

export interface AddressSuggestionPort {
  search(query: string, signal?: AbortSignal): Promise<UserAddressInput[]>;
}
