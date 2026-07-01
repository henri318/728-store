export function checkPasswordMatch(
  password: string,
  confirmPassword: string,
  errorMessage: string,
): { confirmPassword: string } | null {
  if (password && confirmPassword && password !== confirmPassword) {
    return { confirmPassword: errorMessage };
  }
  return null;
}
