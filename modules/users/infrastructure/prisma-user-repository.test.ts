import { describe, it, expect } from 'vitest';
import { toDomain } from './prisma-user-repository';

describe('PrismaUserRepository — toDomain mapper', () => {
  const baseRow = {
    id: 'usr-1',
    email: 'test@test.com',
    passwordHash: '$2b$10$hashed',
    role: 'CUSTOMER',
    firstName: 'John',
    lastName: 'Doe',
    emailVerified: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-01'),
  };

  it('should map a basic user row to UserEntity with VOs', () => {
    const result = toDomain(baseRow);

    expect(result.userId.value).toBe('usr-1');
    expect(result.email.value).toBe('test@test.com');
    expect(result.firstName).toBe('John');
    expect(result.lastName).toBe('Doe');
    expect(result.roleId.value).toBe('CUSTOMER');
    expect(result.passwordHash.value).toBe('$2b$10$hashed');
    expect(result.emailVerified).toBeNull();
    expect(result.address).toBeNull();
  });

  it('should deserialize address fields when all four are present', () => {
    const row = {
      ...baseRow,
      addressStreet: 'Calle 1',
      addressCity: 'BOG',
      addressPostalCode: '110111',
      addressCountry: 'CO',
    };

    const result = toDomain(row);

    expect(result.address).not.toBeNull();
    expect(result.address!.street).toBe('Calle 1');
    expect(result.address!.city).toBe('BOG');
    expect(result.address!.postalCode).toBe('110111');
    expect(result.address!.country).toBe('CO');
  });

  it('should return null address when only some address fields are present', () => {
    const row = {
      ...baseRow,
      addressStreet: 'Calle 1',
      addressCity: null,
      addressPostalCode: null,
      addressCountry: null,
    };

    const result = toDomain(row);

    // Partial address should NOT create Address (all 4 fields required by VO)
    expect(result.address).toBeNull();
  });

  it('should return null address when no address fields are present', () => {
    const row = {
      ...baseRow,
      addressStreet: null,
      addressCity: null,
      addressPostalCode: null,
      addressCountry: null,
    };

    const result = toDomain(row);

    expect(result.address).toBeNull();
  });

  it('should throw when email is missing', () => {
    const row = { ...baseRow, email: null };

    expect(() => toDomain(row)).toThrow('User email is required');
  });

  it('should throw when passwordHash is missing', () => {
    const row = { ...baseRow, passwordHash: null };

    expect(() => toDomain(row)).toThrow('User password hash is required');
  });

  it('should handle missing firstName/lastName gracefully (backward compat)', () => {
    const row = { ...baseRow, firstName: undefined, lastName: undefined };

    const result = toDomain(row);

    expect(result.firstName).toBe('');
    expect(result.lastName).toBe('');
  });
});
