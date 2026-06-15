/**
 * SecretsPort — the port for accessing validated secrets and env vars.
 *
 * Architecture:
 *   Route / use case  →  secretsPort.getAuthSecret()  (this port)
 *   Concrete adapter   →  process.env + validation
 *
 * Lives in the auth module's domain layer.
 *
 * Why a port instead of calling process.env directly:
 *  - Validation logic is centralized and testable
 *  - Routes never touch process.env — they go through the container
 *  - Swappable for production secret managers without changing callers
 */
export interface SecretsPort {
  /**
   * Return the auth secret as a UTF-8 encoded Uint8Array.
   * Throws a clear error if the secret is missing or empty.
   */
  getAuthSecret(): Uint8Array;
}
