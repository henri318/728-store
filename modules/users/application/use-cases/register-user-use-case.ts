import { UserRepository } from '../../domain/user-repository';
import { OutboxRepository } from '@/shared/kernel/outbox-repository';
import type { PasswordHasher } from '@/modules/users/domain/password-hasher';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { randomUUID } from 'crypto';
import { ConflictError } from '@/shared/kernel/app-error';
import type { RegisterUserDTO } from '../dto/register-user.dto';

export class RegisterUserUseCase {
  constructor(
    private userRepository: UserRepository,
    private outboxRepository: OutboxRepository,
    private passwordHasher: PasswordHasher
  ) {}

  async execute(dto: RegisterUserDTO) {
    // 1. Check if user already exists
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictError('User already exists');
    }

    // 2. Hash the password
    const passwordHash = await this.passwordHasher.hash(dto.password);

    // 3. Save user — the repository accepts an optional tx for
    //    Prisma transactions when called from a higher-level orchestrator.
    const user = await this.userRepository.save({
      id: randomUUID(),
      email: dto.email,
      name: dto.name,
      passwordHash,
      role: 'client',
      emailVerified: null,
    });

    // 4. Record event in Outbox — also accepts optional tx for shared
    //    transactional boundaries with the user save above.
    await this.outboxRepository.saveEvent(GlobalEvents.USER_REGISTERED, {
      userId: user.id,
      email: user.email,
    });

    return user;
  }
}
