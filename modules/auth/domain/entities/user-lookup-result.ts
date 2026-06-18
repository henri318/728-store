import type { Role } from '@/modules/roles/domain/roles';

export interface UserLookupResult {
  id: string;
  role: Role;
}
