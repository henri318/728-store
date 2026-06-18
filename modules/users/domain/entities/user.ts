export interface UserEntity {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  /**
   * Timestamp at which the user verified their email.
   * `null` until the user clicks the verification link.
   */
  emailVerified: Date | null;
}
