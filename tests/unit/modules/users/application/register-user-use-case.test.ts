import { describe, it, expect, beforeEach } from 'vitest';
import { RegisterUserUseCase } from '@/modules/users/application/register-user-use-case';
import { MemoryUserRepository } from '@/tests/doubles/memory-user-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { MemoryPasswordHasher } from '@/tests/doubles/memory-password-hasher';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { UserId } from '@/shared/kernel/domain/value-objects/user-id';
import { Email } from '@/shared/kernel/domain/value-objects/email';
import { RoleId } from '@/modules/roles/domain/value-objects/role-id';

describe('RegisterUserUseCase', () => {
  let userRepository: MemoryUserRepository;
  let outboxRepository: MemoryOutboxRepository;
  let passwordHasher: MemoryPasswordHasher;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    userRepository = new MemoryUserRepository();
    outboxRepository = new MemoryOutboxRepository();
    passwordHasher = new MemoryPasswordHasher();
    useCase = new RegisterUserUseCase(userRepository, outboxRepository, passwordHasher);
  });

  it('should register a new user with full profile (firstName, lastName, address)', async () => {
    const dto = {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'MiPassword123!',
      address: {
        street: 'Calle 1',
        city: 'BOG',
        postalCode: '110111',
        country: 'CO',
      },
    };

    const result = await useCase.execute(dto);

    // Entity uses VOs
    expect(result.email).toBeInstanceOf(Email);
    expect(result.email.value).toBe('test@example.com');
    expect(result.userId).toBeInstanceOf(UserId);
    expect(result.userId.value).toBeDefined();
    expect(result.firstName).toBe(dto.firstName);
    expect(result.lastName).toBe(dto.lastName);
    expect(result.roleId).toBeInstanceOf(RoleId);
    expect(result.roleId.value).toBe('CUSTOMER');
    expect(result.address).not.toBeNull();
    expect(result.address!.street).toBe(dto.address!.street);
    expect(result.address!.city).toBe(dto.address!.city);
    expect(result.emailVerified).toBeNull();

    // Check persisted in repository (findByEmail still takes raw string)
    const savedUser = await userRepository.findByEmail('test@example.com');
    expect(savedUser).not.toBeNull();
    expect(savedUser!.firstName).toBe(dto.firstName);
    expect(savedUser!.lastName).toBe(dto.lastName);
    expect(savedUser!.roleId.value).toBe('CUSTOMER');
  });

  it('should register with minimal profile (no address)', async () => {
    const dto = {
      email: 'mina@example.com',
      firstName: 'Mina',
      lastName: 'Al',
      password: 'MiPassword123!',
    };

    const result = await useCase.execute(dto);

    expect(result.firstName).toBe('Mina');
    expect(result.lastName).toBe('Al');
    expect(result.address).toBeNull();
    expect(result.roleId.value).toBe('CUSTOMER');
    expect(result.email.value).toBe('mina@example.com');
  });

  it('should record an event with userId, email, AND roleId in the outbox', async () => {
    const dto = {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'MiPassword123!',
    };

    const result = await useCase.execute(dto);

    expect(outboxRepository.events.length).toBe(1);
    expect(outboxRepository.events[0].eventType).toBe(GlobalEvents.USER_REGISTERED);
    expect(outboxRepository.events[0].payload.userId).toBe(result.userId.value);
    expect(outboxRepository.events[0].payload.email).toBe(result.email.value);
    expect(outboxRepository.events[0].payload.roleId).toBe(result.roleId.value);
  });

  it('should throw an error if user already exists (duplicate email)', async () => {
    const dto = {
      email: 'dup@example.com',
      firstName: 'Dup',
      lastName: 'User',
      password: 'MiPassword123!',
    };

    await useCase.execute(dto);
    await expect(useCase.execute(dto)).rejects.toThrow('User already exists');
  });

  it('should reject empty firstName', async () => {
    const dto = {
      email: 'test@example.com',
      firstName: '   ',
      lastName: 'User',
      password: 'MiPassword123!',
    };

    await expect(useCase.execute(dto)).rejects.toThrow('First name is required');
  });

  it('should reject empty lastName', async () => {
    const dto = {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: '',
      password: 'MiPassword123!',
    };

    await expect(useCase.execute(dto)).rejects.toThrow('Last name is required');
  });

  it('should reject firstName exceeding max length (default 50)', async () => {
    const dto = {
      email: 'test@example.com',
      firstName: 'A'.repeat(51),
      lastName: 'User',
      password: 'MiPassword123!',
    };

    await expect(useCase.execute(dto)).rejects.toThrow('First name cannot exceed 50 characters');
  });

  it('should reject lastName exceeding max length (default 50)', async () => {
    const dto = {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'B'.repeat(51),
      password: 'MiPassword123!',
    };

    await expect(useCase.execute(dto)).rejects.toThrow('Last name cannot exceed 50 characters');
  });

  // Character whitelist tests
  it('should accept firstName with accented characters, spaces, hyphens, and apostrophes', async () => {
    const dto = {
      email: 'valid@example.com',
      firstName: "María-José D'Artagnan",
      lastName: 'García',
      password: 'MiPassword123!',
    };

    const result = await useCase.execute(dto);
    expect(result.firstName).toBe("María-José D'Artagnan");
  });

  it('should reject firstName with emojis', async () => {
    const dto = {
      email: 'test@example.com',
      firstName: 'Test 😀',
      lastName: 'User',
      password: 'MiPassword123!',
    };

    await expect(useCase.execute(dto)).rejects.toThrow('can only contain letters');
  });

  it('should reject firstName with HTML/script tags', async () => {
    const dto = {
      email: 'test@example.com',
      firstName: '<script>alert(1)</script>',
      lastName: 'User',
      password: 'MiPassword123!',
    };

    await expect(useCase.execute(dto)).rejects.toThrow('can only contain letters');
  });

  it('should reject firstName with numbers', async () => {
    const dto = {
      email: 'test@example.com',
      firstName: 'Test123',
      lastName: 'User',
      password: 'MiPassword123!',
    };

    await expect(useCase.execute(dto)).rejects.toThrow('can only contain letters');
  });

  it('should reject lastName with special characters', async () => {
    const dto = {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User; DROP TABLE',
      password: 'MiPassword123!',
    };

    await expect(useCase.execute(dto)).rejects.toThrow('can only contain letters');
  });
});
