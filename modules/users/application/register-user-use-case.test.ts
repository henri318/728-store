import { describe, it, expect, beforeEach } from 'vitest';
import { RegisterUserUseCase } from './register-user-use-case';
import { MemoryUserRepository } from '@/tests/doubles/memory-user-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { MemoryPasswordHasher } from '@/tests/doubles/memory-password-hasher';
import { GlobalEvents } from '@/modules/events/domain/event-registry';

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

  it('should register a new user successfully', async () => {
    const dto = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'MiPassword123!',
    };

    const result = await useCase.execute(dto);

    expect(result.email).toBe(dto.email);
    expect(result.id).toBeDefined();
    
    // Check if user is in repository
    const savedUser = await userRepository.findByEmail(dto.email);
    expect(savedUser?.role).toBe('client');
    expect(savedUser?.name).toBe(dto.name);
  });

  it('should record an event in the outbox when user is registered', async () => {
    const dto = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'MiPassword123!',
    };

    const result = await useCase.execute(dto);

    expect(outboxRepository.events.length).toBe(1);
    expect(outboxRepository.events[0].eventType).toBe(GlobalEvents.USER_REGISTERED);
    expect(outboxRepository.events[0].payload.userId).toBe(result.id);
  });

  it('should throw an error if user already exists', async () => {
    const dto = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'MiPassword123!',
    };

    await useCase.execute(dto);

    await expect(useCase.execute(dto)).rejects.toThrow('User already exists');
  });
});
