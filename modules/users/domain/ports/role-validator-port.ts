/**
 * RoleValidatorPort — the port for validating role existence.
 *
 * Users module needs to:
 * - Check if a role exists before assigning it to a user
 *
 * This port defines the MINIMUM interface users needs from the roles module.
 * The adapter in roles/infrastructure implements this port.
 */
export interface RoleValidationResult {
  id: string;
  name: string;
}

export interface RoleValidatorPort {
  /** Find a role by name. Returns null if not found. */
  findByName(name: string): Promise<RoleValidationResult | null>;
}
