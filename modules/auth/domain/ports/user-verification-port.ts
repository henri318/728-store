/**
 * UserVerificationPort — the port for verifying user email status.
 *
 * Auth module needs to:
 * - Find a user by ID to check email verification status
 * - Mark a user's email as verified after token validation
 *
 * This port defines the MINIMUM interface auth needs from the users module.
 * The adapter in users/infrastructure implements this port.
 */
export interface UserVerificationResult {
  id: string;
  emailVerified: Date | null;
  deletedAt: Date | null;
}

export interface UserVerificationPort {
  /** Find a user by ID for email verification purposes. */
  findById(userId: string): Promise<UserVerificationResult | null>;

  /** Mark a user's email as verified. */
  markEmailVerified(userId: string): Promise<void>;
}
