/**
 * Input DTO for the CreateRoleUseCase.
 */
export interface CreateRoleDTO {
  /** Unique role name (e.g. "ADMIN", "MANAGER"). */
  name: string;
  /** Human-readable description of the role. */
  description: string;
}
