/** Canonical role names supported by the platform. */
export const ROLES = ['ADMIN', 'SUPPORT', 'DESIGNER', 'CUSTOMER'] as const;

/** Union type of all valid role names. */
export type Role = typeof ROLES[number];
