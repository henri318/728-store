export function canUseAuthenticatedCart(role?: string | null): boolean {
  return role === 'CUSTOMER';
}
