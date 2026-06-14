import { UserEntity, UserRepository } from '../domain/user-repository';

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
    return this.users.find(u => u.email === email) || null;
  }
}
