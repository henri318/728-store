export const ROLES = ['guest', 'client', 'shop', 'admin'] as const;
export type Role = typeof ROLES[number];
