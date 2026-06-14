import { UserRepository } from '../domain/user-repository';
import { OutboxRepository } from '@/shared/kernel/memory-outbox-repository';
import { GlobalEvents } from '@/shared/events';
import { hashPassword } from '@/shared/kernel/password-hasher';
import { randomUUID } from 'crypto';
import { ConflictError } from '@/shared/kernel/app-error';

export interface RegisterUserDTO {
  email: string;
  name: string;
  password: string;
}

export class RegisterUserUseCase {
  constructor(
    private userRepository: UserRepository,
    private outboxRepository: OutboxRepository
  ) {}

  async execute(dto: RegisterUserDTO) {
    // 1. Check if user already exists
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictError('User already exists');
    }

    // 2. Hash the password
    const passwordHash = await hashPassword(dto.password);

    // 3. Save user
    const user = await this.userRepository.save({
      id: randomUUID(),
      email: dto.email,
      name: dto.name,
      passwordHash,
      role: 'client',
    });

    // 4. Record event in Outbox
    await this.outboxRepository.saveEvent(GlobalEvents.USER_REGISTERED, {
      userId: user.id,
      email: user.email,
    });

    return user;
  }
}
