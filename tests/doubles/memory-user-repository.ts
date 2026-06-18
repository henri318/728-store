import { UserEntity, UserRepository } from '@/modules/users/domain/user-repository';

export class MemoryUserRepository implements UserRepository {
  private users: UserEntity[] = [];

  async save(user: UserEntity, _tx?: any): Promise<UserEntity> {
    const existingIndex = this.users.findIndex(u => u.userId.equals(user.userId));
    if (existingIndex >= 0) {
      this.users[existingIndex] = user;
    } else {
      this.users.push(user);
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const lower = email.trim().toLowerCase();
    return this.users.find(u => u.email.value === lower) ?? null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.users.find(u => u.userId.value === id) ?? null;
  }

  async markEmailVerified(userId: string): Promise<void> {
    const existing = this.users.find(u => u.userId.value === userId);
    if (!existing) return;
    // Mutate in place — matches previous behavior
    (existing as any).emailVerified = new Date();
  }

  async update(user: UserEntity, _tx?: any): Promise<UserEntity> {
    const index = this.users.findIndex(u => u.userId.equals(user.userId));
    if (index < 0) {
      throw new Error(`User with id ${user.userId.value} not found`);
    }
    this.users[index] = user;
    return user;
  }
}
