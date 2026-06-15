import { UserEntity, UserRepository } from '@/modules/users/domain/user-repository';

export class MemoryUserRepository implements UserRepository {
  private users: UserEntity[] = [];

  async save(user: UserEntity): Promise<UserEntity> {
    const existingIndex = this.users.findIndex(u => u.id === user.id);
    if (existingIndex >= 0) {
      this.users[existingIndex] = user;
    } else {
      this.users.push(user);
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.users.find(u => u.email === email) ?? null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.users.find(u => u.id === id) ?? null;
  }

  async markEmailVerified(userId: string): Promise<void> {
    const existing = this.users.find(u => u.id === userId);
    if (!existing) return;
    existing.emailVerified = new Date();
  }
}
