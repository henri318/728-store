export interface RegisterUserDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}
